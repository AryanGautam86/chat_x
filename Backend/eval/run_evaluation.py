"""pass@k evaluation for the /generate_code endpoint.

Usage:
    uvicorn app.main:app --port 8000     # one shell
    python -m eval.run_evaluation         # another

Requires requirements-dev.txt.
"""

import json
import os
import re
import shutil
import subprocess
import sys
import tempfile
import time
from pathlib import Path
from typing import Sequence

import requests

EVAL_DIR = Path(__file__).resolve().parent
BACKEND_DIR = EVAL_DIR.parent
EVAL_FILE = EVAL_DIR / "eval_prompts.jsonl"
RESULTS_FILE = BACKEND_DIR / "data" / "eval_results.json"

SERVICE_URL = os.getenv("EVAL_SERVICE_URL", "http://127.0.0.1:8000/generate_code")
N_SAMPLES = int(os.getenv("EVAL_N_SAMPLES", "10"))
KS = (1, 3, 5)
TIMEOUT_PER_TEST = 10

_FENCE = re.compile(r"```(?:\w+)?\n(.*?)\n```", re.S)


def call_generate(user_task: str, language: str = "python", temperature: float = 0.7):
    response = requests.post(
        SERVICE_URL,
        data={
            "user_task": user_task,
            "language": language,
            "run_tests": False,
            "temperature": temperature,
        },
        timeout=60,
    )
    response.raise_for_status()
    return response.json()


def extract_code(payload: dict) -> str:
    """Pull the generated source out of a /generate_code response.

    The endpoint returns {"code": ...}; "code_or_questions" is accepted for
    compatibility with older builds of the service.
    """
    text = (
        payload.get("code")
        or payload.get("code_or_questions")
        or payload.get("answer")
        or ""
    )
    fenced = _FENCE.search(text)
    return fenced.group(1) if fenced else text


def run_test_with_code(code: str, test_script: Path) -> dict:
    """Run `test_script` against generated code in an isolated temp directory."""
    with tempfile.TemporaryDirectory() as tmp:
        workdir = Path(tmp)
        (workdir / "generated_code.py").write_text(code)

        test_dst = workdir / test_script.name
        shutil.copy(test_script, test_dst)

        try:
            proc = subprocess.run(
                [sys.executable, test_dst.name],
                cwd=workdir,
                capture_output=True,
                text=True,
                timeout=TIMEOUT_PER_TEST,
            )
            return {
                "ok": proc.returncode == 0,
                "stdout": proc.stdout,
                "stderr": proc.stderr,
                "returncode": proc.returncode,
            }
        except subprocess.TimeoutExpired:
            return {"ok": False, "error": f"timed out after {TIMEOUT_PER_TEST}s"}
        except Exception as exc:  # noqa: BLE001 - report, don't abort the sweep
            return {"ok": False, "error": str(exc)}


def compute_passk(results: Sequence[bool], k: int) -> bool:
    """Empirical pass@k: did any of the first k samples pass?"""
    return any(results[:k])


def percentile(values: Sequence[float], fraction: float) -> float:
    if not values:
        return 0.0
    ordered = sorted(values)
    index = min(len(ordered) - 1, max(0, int(fraction * len(ordered)) - 1))
    return ordered[index]


def evaluate_prompt(entry: dict, n_samples: int = N_SAMPLES, temperature: float = 0.7):
    language = entry.get("language", "python")
    # test_script paths in the JSONL are relative to this eval/ directory.
    test_script = EVAL_DIR / entry["test_script"]

    passed: list[bool] = []
    latencies: list[float] = []

    for _ in range(n_samples):
        start = time.time()
        payload = call_generate(
            entry["prompt"], language=language, temperature=temperature
        )
        latencies.append(time.time() - start)

        result = run_test_with_code(extract_code(payload), test_script)
        passed.append(result["ok"])

    return {
        "id": entry["id"],
        "n_samples": n_samples,
        "pass_ratio": sum(passed) / len(passed) if passed else 0.0,
        "passk": {str(k): compute_passk(passed, k) for k in KS},
        "latency_mean": sum(latencies) / len(latencies) if latencies else 0.0,
        "latency_p95": percentile(latencies, 0.95),
        "samples_results": passed,
    }


def main() -> int:
    entries = [
        json.loads(line)
        for line in EVAL_FILE.read_text().splitlines()
        if line.strip()
    ]

    if not entries:
        print(f"No prompts found in {EVAL_FILE}")
        return 1

    results = []
    for entry in entries:
        print("Evaluating:", entry["id"])
        result = evaluate_prompt(entry)
        results.append(result)
        print(" ->", result["passk"], "pass_ratio:", result["pass_ratio"])

    total = len(results)
    for k in KS:
        succeeded = sum(1 for r in results if r["passk"][str(k)])
        print(f"pass@{k}: {succeeded}/{total} = {succeeded / total:.3f}")

    print("Mean pass_ratio@n:", sum(r["pass_ratio"] for r in results) / total)

    RESULTS_FILE.parent.mkdir(parents=True, exist_ok=True)
    RESULTS_FILE.write_text(json.dumps(results, indent=2))
    print("Wrote", RESULTS_FILE)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
