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


def add_document(title: str, content: str) -> None:
    """Embed a document, add it to the index and persist the index."""
    global _vectorstore

    if _vectorstore is None:
        _vectorstore = FAISS.from_texts(
            [content], embedding=get_embeddings(), metadatas=[{"title": title}]
        )
    else:
        _vectorstore.add_texts([content], metadatas=[{"title": title}])

    config.INDEX_DIR.mkdir(parents=True, exist_ok=True)
    _vectorstore.save_local(str(config.INDEX_DIR))
    logger.info("Indexed document %r", title)


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
