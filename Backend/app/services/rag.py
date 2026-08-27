"""Retrieval-augmented question answering over uploaded documents.

The embedding model, chat model and FAISS index are expensive to build, so each
is created once and reused. `load_vectorstore()` is called on startup; the
model accessors fall back to lazy construction so the service still works if
startup was skipped (tests, scripts).
"""

import logging

from langchain_community.vectorstores import FAISS
from langchain_google_genai import ChatGoogleGenerativeAI, GoogleGenerativeAIEmbeddings

from app.core import config
from app.db.models import Document

logger = logging.getLogger(__name__)

_embeddings = None
_llm = None
_vectorstore = None

ANSWER_PROMPT = """\
You are an intelligent AI assistant.

You have access to uploaded documents and your own knowledge.

Uploaded document:

{context}

User Question:
{query}

Instructions:
- If the uploaded document answers the question, answer using it.
- If it doesn't, answer using your own knowledge.
- If both are useful, combine them naturally.
- Mention when information comes from the uploaded document.
- Never reply with "I don't know based on the provided context."

Answer:
"""


def get_embeddings() -> GoogleGenerativeAIEmbeddings:
    global _embeddings
    if _embeddings is None:
        _embeddings = GoogleGenerativeAIEmbeddings(
            model=config.EMBEDDING_MODEL,
            google_api_key=config.GEMINI_API_KEY,
        )
    return _embeddings


def get_llm() -> ChatGoogleGenerativeAI:
    global _llm
    if _llm is None:
        _llm = ChatGoogleGenerativeAI(
            model=config.CHAT_MODEL,
            google_api_key=config.GEMINI_API_KEY,
            temperature=0,
        )
    return _llm


def load_vectorstore():
    """Load the FAISS index from disk, if one has been built.

    A missing or unreadable index is not fatal: the service degrades to
    answering from the model's own knowledge rather than failing to boot.
    """
    global _vectorstore

    if not (config.INDEX_DIR / "index.faiss").exists():
        logger.info("No FAISS index at %s; answering without retrieval", config.INDEX_DIR)
        _vectorstore = None
        return None

    # Loading needs the embedding model, so without a key this would spend
    # ~9s in an Application Default Credentials lookup before failing, on
    # every boot, and log a traceback that hides the real problem.
    if not config.GEMINI_API_KEY:
        logger.warning("GEMINI_API_KEY is not set; skipping index load")
        _vectorstore = None
        return None

    try:
        _vectorstore = FAISS.load_local(
            str(config.INDEX_DIR),
            get_embeddings(),
            allow_dangerous_deserialization=True,
        )
        logger.info("FAISS index loaded (%d vectors)", _vectorstore.index.ntotal)
    except Exception:
        logger.exception("Could not load FAISS index; continuing without retrieval")
        _vectorstore = None

    return _vectorstore


def _metadata(title: str, doc_id: int | None) -> dict:
    """Index metadata for a document.

    doc_id ties an index entry back to its documents row so a restart can tell
    what is already embedded. Entries written before this existed have no
    doc_id; they are left alone rather than re-embedded blindly.
    """
    meta = {"title": title}
    if doc_id is not None:
        meta["doc_id"] = doc_id
    return meta


def _write(texts: list[str], metadatas: list[dict]) -> None:
    """Embed texts into the index and persist it to disk."""
    global _vectorstore

    if _vectorstore is None:
        _vectorstore = FAISS.from_texts(
            texts, embedding=get_embeddings(), metadatas=metadatas
        )
    else:
        _vectorstore.add_texts(texts, metadatas=metadatas)

    config.INDEX_DIR.mkdir(parents=True, exist_ok=True)
    _vectorstore.save_local(str(config.INDEX_DIR))


def add_document(title: str, content: str, doc_id: int | None = None) -> None:
    """Embed a document, add it to the index and persist the index."""
    _write([content], [_metadata(title, doc_id)])
    logger.info("Indexed document %r", title)


def indexed_document_ids() -> set[int]:
    """doc_ids already present in the index.

    Reads the docstore's private mapping because FAISS exposes no public way to
    enumerate stored metadata; a failure here is treated as "nothing indexed"
    so startup degrades to re-embedding rather than crashing.
    """
    if _vectorstore is None:
        return set()

    try:
        stored = _vectorstore.docstore._dict.values()
    except AttributeError:
        logger.warning("Cannot enumerate the docstore; assuming it is empty")
        return set()

    return {
        doc.metadata["doc_id"]
        for doc in stored
        if isinstance((doc.metadata or {}).get("doc_id"), int)
    }


def sync_from_documents(db) -> int:
    """Re-embed stored documents that are missing from the vector index.

    The documents table is durable but the index sits on the container
    filesystem, which Render discards on every restart. Without this an upload
    stays listed in the library forever while silently dropping out of
    retrieval — the row survives, its vector does not.
    """
    rows = (
        db.query(Document)
        .filter(Document.content.isnot(None))
        .order_by(Document.id)
        .all()
    )
    if not rows:
        return 0

    already = indexed_document_ids()
    missing = [r for r in rows if r.id not in already and (r.content or "").strip()]

    if not missing:
        logger.info("Vector index is in sync with %d stored document(s)", len(rows))
        return 0

    _write(
        [r.content for r in missing],
        [_metadata(r.title or f"document-{r.id}", r.id) for r in missing],
    )
    logger.info("Re-embedded %d stored document(s) missing from the index", len(missing))
    return len(missing)


def ask_question(query: str) -> str:
    """Answer a question, grounding it in retrieved documents when relevant."""
    llm = get_llm()

    if _vectorstore is None:
        return llm.invoke(query).content

    scored = _vectorstore.similarity_search_with_score(query, k=config.RETRIEVAL_K)
    relevant = [
        doc
        for doc, score in scored
        if score < config.RETRIEVAL_SCORE_THRESHOLD
    ]

    if not relevant:
        return llm.invoke(query).content

    context = "\n\n".join(doc.page_content for doc in relevant)
    return llm.invoke(ANSWER_PROMPT.format(context=context, query=query)).content
