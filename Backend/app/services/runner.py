"""Execute generated code in a throwaway directory.

Everything runs inside a fresh `tempfile.TemporaryDirectory`, so no artifact is
ever written next to the application code and cleanup cannot reach beyond the
files this module created.
"""

import logging
import re
import subprocess
import sys
import tempfile
from pathlib import Path

from app.core import config

logger = logging.getLogger(__name__)

LANGUAGES = {
    # sys.executable, not bare "python": the latter is absent wherever only
    # python3 is on PATH (macOS, most venvs invoked by absolute path).
    "python": {"ext": ".py", "run": [sys.executable]},
    "javascript": {"ext": ".js", "run": ["node"]},
    "c": {"ext": ".c", "compile": ["gcc"]},
    "cpp": {"ext": ".cpp", "compile": ["g++"]},
    "java": {"ext": ".java", "compile": ["javac"]},
}

_JAVA_CLASS = re.compile(r"public\s+(?:final\s+|abstract\s+)?class\s+(\w+)")


def run_code(code: str, language: str) -> str:
    """Compile/run `code` and return its combined stdout and stderr."""
    language = language.lower()
    spec = LANGUAGES.get(language)

    if spec is None:
        return f"Execution not supported for language: {language}"

    timeout = config.CODE_EXEC_TIMEOUT

    with tempfile.TemporaryDirectory() as tmp:
        workdir = Path(tmp)

        if language == "java":
            # javac requires the filename to match the public class name.
            match = _JAVA_CLASS.search(code)
            stem = match.group(1) if match else "Main"
        else:
            stem = "program"

        source = workdir / f"{stem}{spec['ext']}"
        source.write_text(code)

        try:
            if language == "java":
                _check(["javac", source.name], workdir, timeout)
                cmd = ["java", stem]
            elif "compile" in spec:
                _check([*spec["compile"], source.name, "-o", "program"], workdir, timeout)
                cmd = ["./program"]
            else:
                cmd = [*spec["run"], source.name]

            done = subprocess.run(
                cmd,
                cwd=workdir,
                capture_output=True,
                text=True,
                timeout=timeout,
            )
            return (done.stdout or "") + (done.stderr or "")

        except subprocess.CalledProcessError as exc:
            return (exc.stdout or "") + (exc.stderr or "")
        except subprocess.TimeoutExpired:
            return f"Execution timed out after {timeout}s"
        except FileNotFoundError as exc:
            # The slim runtime image ships Python only; other toolchains are absent.
            logger.warning("Toolchain missing for %s: %s", language, exc)
            return f"Toolchain for {language} is not installed in this environment."


def _check(cmd: list[str], workdir: Path, timeout: int) -> None:
    """Run a compile step, raising CalledProcessError with output attached."""
    subprocess.run(
        cmd,
        cwd=workdir,
        capture_output=True,
        text=True,
        timeout=timeout,
        check=True,
    )
