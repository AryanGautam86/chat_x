"""Unit tests for file classification and validation — no API key or network.

The Gemini-backed paths (extract_text / answer_about_file for images and PDFs)
are exercised by eval and manual runs, not here.
"""

import pytest

from app.core import config
from app.services.files import (
    SUPPORTED_EXTENSIONS,
    UnsupportedFile,
    classify,
    extract_text,
    validate_size,
)


class TestClassify:
    @pytest.mark.parametrize("name", ["a.txt", "notes.md", "README.markdown"])
    def test_text_types(self, name):
        assert classify(name) == "text"

    @pytest.mark.parametrize("name", ["p.png", "p.jpg", "p.jpeg", "shot.webp"])
    def test_image_types(self, name):
        assert classify(name) == "image"

    def test_pdf(self):
        assert classify("report.pdf") == "pdf"

    def test_is_case_insensitive(self):
        assert classify("PHOTO.JPG") == "image"

    @pytest.mark.parametrize("name", ["a.docx", "a.zip", "noextension", ""])
    def test_rejects_unsupported(self, name):
        with pytest.raises(UnsupportedFile):
            classify(name)

    def test_error_lists_accepted_types(self):
        with pytest.raises(UnsupportedFile, match=r"\.pdf"):
            classify("bad.docx")


class TestValidateSize:
    def test_accepts_normal_file(self):
        validate_size(b"x" * 1024)  # must not raise

    def test_rejects_empty(self):
        with pytest.raises(UnsupportedFile, match="empty"):
            validate_size(b"")

    def test_rejects_oversize(self):
        with pytest.raises(UnsupportedFile, match="limit"):
            validate_size(b"x" * (config.MAX_UPLOAD_BYTES + 1))

    def test_accepts_exactly_at_limit(self):
        validate_size(b"x" * config.MAX_UPLOAD_BYTES)


class TestExtractTextForPlainFiles:
    def test_decodes_utf8(self):
        assert extract_text("a.txt", "héllo wörld".encode()) == "héllo wörld"

    def test_strips_surrounding_whitespace(self):
        assert extract_text("a.txt", b"  \n content \n ") == "content"

    def test_rejects_whitespace_only(self):
        with pytest.raises(UnsupportedFile, match="no text"):
            extract_text("a.txt", b"   \n\t  ")

    def test_size_is_checked_before_type(self):
        # An oversize .docx should report the size problem it hits first.
        with pytest.raises(UnsupportedFile, match="limit"):
            extract_text("a.docx", b"x" * (config.MAX_UPLOAD_BYTES + 1))


def test_supported_extensions_match_the_frontend_list():
    """AttachButton.jsx hardcodes this list; keep the two in sync."""
    assert SUPPORTED_EXTENSIONS == {
        ".png", ".jpg", ".jpeg", ".webp", ".pdf", ".txt", ".md", ".markdown",
    }
