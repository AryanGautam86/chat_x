"""Text post-processing for model output.

Deliberately free of heavy imports so it stays cheap to import and test.
"""


def strip_code_fence(text: str) -> str:
    """Remove a surrounding ```lang fence.

    The generation prompt forbids markdown, but models emit fences anyway;
    leaving them in breaks direct execution and the UI's download button.
    """
    text = text.strip()
    if not text.startswith("```"):
        return text

    lines = text.splitlines()[1:]  # drop the opening fence and its language tag
    if lines and lines[-1].strip().startswith("```"):
        lines = lines[:-1]
    return "\n".join(lines).strip()
