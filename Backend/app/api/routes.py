"""HTTP API.

Route paths and response shapes are unchanged from the pre-refactor app so the
existing React client keeps working without edits.
"""

import logging
from pathlib import PurePath

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from sqlalchemy.orm import Session

from app.api.deps import current_user
from app.db.models import Document
from app.db.session import get_db
from app.services import codegen, files, rag
from app.services.files import UnsupportedFile

logger = logging.getLogger(__name__)

# Everything on this router requires a signed-in user. /health and /auth/* are
# registered elsewhere so they stay reachable without a token — the Render probe
# and the login page both need them.
router = APIRouter(dependencies=[Depends(current_user)])


@router.post("/upload")
def upload_document(
    title: str = Form(...),
    content: str = Form(...),
    db: Session = Depends(get_db),
) -> dict:
    db.add(Document(title=title, content=content))
    db.commit()

    rag.add_document(title, content)

    return {"message": "Document added successfully"}


@router.post("/upload_file")
async def upload_file(
    file: UploadFile = File(...),
    title: str = Form(""),
    db: Session = Depends(get_db),
) -> dict:
    """Extract text from an uploaded file and add it to the document library."""
    data = await file.read()

    try:
        content = files.extract_text(file.filename, data)
    except UnsupportedFile as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    doc_title = title.strip() or PurePath(file.filename or "upload").stem

    db.add(Document(title=doc_title, content=content))
    db.commit()

    rag.add_document(doc_title, content)

    return {
        "message": "Document added successfully",
        "title": doc_title,
        "characters": len(content),
        "preview": content[:500],
    }


@router.get("/query")
def query(q: str) -> dict:
    return {"question": q, "answer": rag.ask_question(q)}


@router.post("/query_with_file")
async def query_with_file(
    q: str = Form(...),
    file: UploadFile = File(...),
) -> dict:
    """Answer a question about an attached file. Nothing is stored."""
    data = await file.read()

    try:
        answer = files.answer_about_file(q, file.filename, data)
    except UnsupportedFile as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    return {"question": q, "answer": answer, "filename": file.filename}


@router.post("/generate_code")
def generate_code(
    user_task: str = Form(...),
    language: str = Form("python"),
    run_tests: bool = Form(False),
) -> dict:
    return codegen.generate_code(
        user_task=user_task,
        language=language,
        run_tests=run_tests,
    )


@router.post("/explain_code")
def explain_code(
    code: str = Form(...),
    language: str = Form(...),
) -> dict:
    return codegen.explain_code(code=code, language=language)
