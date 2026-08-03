"""Unit tests for pure helpers — no API key or network required.

Run from Backend/:
    pytest
"""

from app.services.runner import run_code
from app.services.text import strip_code_fence


class TestStripCodeFence:
    def test_leaves_bare_code_untouched(self):
        assert strip_code_fence("print(1)") == "print(1)"

    def test_strips_fence_with_language_tag(self):
        assert strip_code_fence("```python\nprint(1)\n```") == "print(1)"

    def test_strips_fence_without_language_tag(self):
        assert strip_code_fence("```\nprint(1)\n```") == "print(1)"

    def test_preserves_inner_blank_lines(self):
        assert strip_code_fence("```py\na = 1\n\nb = 2\n```") == "a = 1\n\nb = 2"

    def test_tolerates_missing_closing_fence(self):
        assert strip_code_fence("```python\nprint(1)") == "print(1)"


class TestRunCode:
    def test_rejects_unsupported_language(self):
        assert "not supported" in run_code("puts 1", "ruby")

    def test_runs_python_and_captures_stdout(self):
        assert run_code("print('hi')", "python").strip() == "hi"

    def test_reports_python_errors_rather_than_raising(self):
        assert "ZeroDivisionError" in run_code("1/0", "python")
