"""LLM-backed code generation and explanation."""

import logging

from app.core import config
from app.services.rag import get_llm
from app.services.runner import run_code
from app.services.text import strip_code_fence

logger = logging.getLogger(__name__)

GENERATE_PROMPT = """\
You are a senior software engineer.

Generate clean, correct, production-quality {language} code for the task below.

TASK:
{user_task}

Rules:
- Output ONLY code.
- No explanations.
- No markdown.
- Code must be directly runnable.
"""

EXPLAIN_PROMPT = """\
You are an expert Software Engineer and Technical Interviewer.

Explain the following {language} code.

Return your response in MARKDOWN.

Use EXACTLY these headings.

# 🎯 Purpose

Explain what this program does.

# ⚙️ Working

Explain how the code works step-by-step.

# ⏱ Time Complexity

Explain the time complexity and why.

# 💾 Space Complexity

Explain the space complexity and why.

# ▶ Dry Run

Show one example input and explain every important step.

# ⚠ Edge Cases

Mention important edge cases.

Code:

{code}
"""


def generate_code(
    user_task: str, language: str = "python", run_tests: bool = False
) -> dict:
    """Generate code for a task, optionally executing it."""
    llm = get_llm()

    response = llm.invoke(
        GENERATE_PROMPT.format(language=language, user_task=user_task)
    )
    code = strip_code_fence(response.content)

    result = {
        "code": code,
        "notes": f"AI-generated code using {config.CHAT_MODEL}",
    }

    if run_tests:
        result["execution_output"] = run_code(code, language)

    return result


def explain_code(code: str, language: str) -> dict:
    """Return a structured markdown explanation of `code`."""
    llm = get_llm()
    response = llm.invoke(EXPLAIN_PROMPT.format(language=language, code=code))
    return {"explanation": response.content}
