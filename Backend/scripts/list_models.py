"""List the Gemini models available to your API key.

Handy when CHAT_MODEL or EMBEDDING_MODEL starts returning 404s.

Usage (from Backend/):
    python -m scripts.list_models

Uses the REST API directly rather than the google-generativeai SDK: that SDK
pins google-ai-generativelanguage==0.6.10, which conflicts irreconcilably with
langchain-google-genai, so the two cannot share an environment.
"""

import sys

import requests

from app.core import config

ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/models"


def main() -> int:
    if not config.GEMINI_API_KEY:
        print("GEMINI_API_KEY is not set (put it in Backend/.env)", file=sys.stderr)
        return 1

    response = requests.get(
        ENDPOINT, params={"key": config.GEMINI_API_KEY, "pageSize": 200}, timeout=30
    )

    if not response.ok:
        print(f"{response.status_code}: {response.text}", file=sys.stderr)
        return 1

    models = response.json().get("models", [])
    if not models:
        print("No models returned for this key.")
        return 1

    for model in sorted(models, key=lambda m: m["name"]):
        print(model["name"])
        methods = model.get("supportedGenerationMethods", [])
        if methods:
            print("  methods:", ", ".join(methods))

    print(f"\n{len(models)} models available.")
    print(f"Configured chat model:      {config.CHAT_MODEL}")
    print(f"Configured embedding model: {config.EMBEDDING_MODEL}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
