"""Turn uploaded files into text the rest of the app can use.

Images and PDFs are handed straight to Gemini, which reads both natively, so
there is no OCR engine or PDF library in the dependency tree. Plain text is
decoded locally without spending a model call.
"""

import base64
import logging
from pathlib import PurePath

from langchain_core.messages import HumanMessage

from app.core import config
from app.services.rag import get_llm

logger = logging.getLogger(__name__)

TEXT_EXTENSIONS = {".txt", ".md", ".markdown"}
IMAGE_EXTENSIONS = {".png", ".jpg", ".jpeg", ".webp"}
PDF_EXTENSIONS = {".pdf"}

SUPPORTED_EXTENSIONS = TEXT_EXTENSIONS | IMAGE_EXTENSIONS | PDF_EXTENSIONS

_MIME_BY_EXTENSION = {
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".webp": "image/webp",
    ".pdf": "application/pdf",
}

TRANSCRIBE_PROMPT = """\
Extract all readable text from this file, verbatim and in reading order.

If it contains little or no text (a photo, chart or diagram), describe its
content in detail instead so the description can be searched later.

Return only the extracted text or description — no preamble, no commentary.
"""

ANSWER_PROMPT = """\
Answer the user's question using the attached file.

If the file does not contain the answer, say so and then answer from your own
knowledge, making clear which part came from where.

Question:
{question}
"""


class UnsupportedFile(Exception):
    """Raised for a file type or size this app will not process."""


def classify(filename: str) -> str:
    """Return 'text', 'image' or 'pdf' for a filename, else raise."""
    suffix = PurePath(filename or "").suffix.lower()

    if suffix in TEXT_EXTENSIONS:
        return "text"
    if suffix in IMAGE_EXTENSIONS:
        return "image"
    if suffix in PDF_EXTENSIONS:
        return "pdf"

    raise UnsupportedFile(
        f"Unsupported file type '{suffix or filename}'. "
        f"Accepted: {', '.join(sorted(SUPPORTED_EXTENSIONS))}"
    )


def validate_size(data: bytes) -> None:
    if len(data) > config.MAX_UPLOAD_BYTES:
        limit_mb = config.MAX_UPLOAD_BYTES / 1_048_576
        raise UnsupportedFile(
            f"File is {len(data) / 1_048_576:.1f} MB; the limit is {limit_mb:.0f} MB."
        )
    if not data:
        raise UnsupportedFile("File is empty.")


def _decode_text(data: bytes) -> str:
    for encoding in ("utf-8", "utf-16", "latin-1"):
        try:
            return data.decode(encoding)
        except UnicodeDecodeError:
            continue
    raise UnsupportedFile("Could not decode this file as text.")


def _media_part(filename: str, data: bytes, kind: str) -> dict:
    """Build the LangChain content block for an image or PDF."""
    suffix = PurePath(filename).suffix.lower()
    mime = _MIME_BY_EXTENSION.get(suffix, "application/octet-stream")
    encoded = base64.b64encode(data).decode()

    if kind == "image":
        return {"type": "image_url", "image_url": f"data:{mime};base64,{encoded}"}

    # Gemini accepts PDFs as inline media blocks.
    return {"type": "media", "mime_type": mime, "data": encoded}


def extract_text(filename: str, data: bytes) -> str:
    """Extract indexable text from an uploaded file."""
    validate_size(data)
    kind = classify(filename)

    if kind == "text":
        text = _decode_text(data).strip()
        if not text:
            raise UnsupportedFile("File contains no text.")
        return text

    message = HumanMessage(
        content=[
            {"type": "text", "text": TRANSCRIBE_PROMPT},
            _media_part(filename, data, kind),
        ]
    )
    response = get_llm().invoke([message])
    text = (response.content or "").strip()

    if not text:
        raise UnsupportedFile("Could not read any content from this file.")

    logger.info("Extracted %d chars from %s (%s)", len(text), filename, kind)
    return text


def answer_about_file(question: str, filename: str, data: bytes) -> str:
    """Answer a question about a file without storing anything."""
    validate_size(data)
    kind = classify(filename)

    if kind == "text":
        body = _decode_text(data).strip()
        prompt = (
            f"{ANSWER_PROMPT.format(question=question)}\n\n"
            f"File '{filename}':\n\n{body}"
        )
        return get_llm().invoke(prompt).content

    message = HumanMessage(
        content=[
            {"type": "text", "text": ANSWER_PROMPT.format(question=question)},
            _media_part(filename, data, kind),
        ]
    )
    return get_llm().invoke([message]).content
