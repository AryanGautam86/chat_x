# ChatBot AI

RAG chat, AI code generation and code explanation. FastAPI backend, React (Vite)
frontend, Gemini for chat and embeddings, FAISS for retrieval.

Live: https://chatbot-oou4.onrender.com

## Layout

```
Backend/
  app/
    main.py              FastAPI app, lifespan, static bundle serving
    api/routes.py        the AI endpoints (all require a token)
    api/auth_routes.py   /auth/* — the only writable public routes
    api/deps.py          current_user dependency
    core/config.py       settings and paths, all derived from Backend/
    core/security.py     password hashing + JWT
    db/models.py         SQLAlchemy models (Document, User)
    db/session.py        engine + get_db dependency
    services/auth.py     registration, password login, Google verification
    services/rag.py      embeddings, chat model, FAISS index, ask_question
    services/files.py    text extraction from uploaded images, PDFs and text
    services/codegen.py  code generation and explanation prompts
    services/runner.py   sandboxed execution of generated code
    services/text.py     output post-processing (fence stripping)
  scripts/
    init_db.py           create tables
    list_models.py       list Gemini models available to your key
  eval/
    run_evaluation.py    pass@k harness for /generate_code
    eval_prompts.jsonl   eval tasks
    fixtures/            assertion scripts the harness runs
  tests/                 unit tests (no API key needed)
  data/
    index/               committed FAISS index
    app.db               SQLite, created at startup (not committed)
  requirements.txt       runtime dependencies
  requirements-dev.txt   + pytest, requests, google-generativeai

Frontend/
  src/api/api.js         axios instance
  src/pages/             Home, Chat, Upload, CodeGenerator, NotFound
  src/components/        Navbar, Footer, Loader
    Sidebar.jsx            session-history panel (Chat + Code Generator)
    ChatMessage.jsx        one chat bubble, incl. attachment preview
    ChatCode.jsx           read-only highlighted code, used in chat
    CodeBlock.jsx          Monaco editor, used on Code Generator
    AttachButton.jsx       the "+" menu
    CameraModal.jsx        live webcam capture
    AttachmentChip.jsx     pending-attachment preview
  src/hooks/useHistory.js  session list state + persistence
  src/lib/history.js       localStorage helpers
  src/layouts/MainLayout   page shell, optional sidebar
```

## Endpoints

Everything except `/health`, `/auth/*` and the static bundle requires a bearer
token; without one the API returns **401**.

| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET | `/health` | public | Liveness probe (used by Render) |
| GET | `/auth/config` | public | Whether Google sign-in is enabled |
| POST | `/auth/register` | public | Create an account, returns a token |
| POST | `/auth/login` | public | Email + password sign-in |
| POST | `/auth/google` | public | Exchange a Google ID token for ours |
| GET | `/auth/me` | token | The signed-in account |
| POST | `/upload` | token | Add a document from pasted text |
| POST | `/upload_file` | token | Add a document from a file — text is extracted, then indexed |
| GET | `/query` | token | Ask a question against the indexed documents |
| POST | `/query_with_file` | token | Ask about an attached file; **nothing is stored** |
| POST | `/generate_code` | token | Generate code, optionally executing it |
| POST | `/explain_code` | token | Explain code as structured markdown |

## Authentication

Email + password, or Google sign-in. Passwords are SHA-256'd then bcrypt-hashed
(bcrypt silently ignores bytes past 72, so pre-hashing stops two long passwords
sharing a prefix from being interchangeable). Sessions are stateless JWTs.

`/auth/login` returns the same message for an unknown email and a wrong
password, so it cannot be used to discover which addresses have accounts.

**Google sign-in** stays hidden until `GOOGLE_CLIENT_ID` is set. Create an OAuth
2.0 Client ID (Web application) in Google Cloud, add your origins under
*Authorised JavaScript origins*, and put it in `Backend/.env`. The browser sends
Google's ID token to `/auth/google`, which verifies the signature and audience
server-side — the client is not trusted. If the same email arrives by both
routes, the accounts are linked rather than duplicated.

Set `JWT_SECRET` in production. Without it a secret is generated into
`Backend/data/jwt_secret`, which is fine locally but means a redeploy signs
everyone out, since the container filesystem is ephemeral.

Sign-in state lives in `localStorage` (`chat_x.auth.token` / `.user`) and
history is namespaced per account, so two people sharing a browser don't see
each other's transcripts.

## Attachments

Both the Upload and Chat pages have a **+** button offering "Upload a file" or
"Take a photo" (a live camera modal via `getUserMedia`, which needs localhost or
HTTPS).

Accepted: `.png .jpg .jpeg .webp .pdf .txt .md .markdown`, up to
`MAX_UPLOAD_MB` (default 10). Images and PDFs are sent to Gemini, which reads
both natively — there is no OCR engine or PDF library in the dependency tree.
Plain text is decoded locally without spending a model call.

The two pages differ deliberately:

- **Upload** indexes the extracted text into FAISS — permanent and searchable.
- **Chat** answers about the attachment and discards it, like ChatGPT.

`SUPPORTED_EXTENSIONS` in `app/services/files.py` and `ACCEPTED` in
`Frontend/src/components/AttachButton.jsx` must stay in sync; a test asserts the
backend half.

## History sidebar

Chat and Code Generator each keep their own session list: **New chat** / **New
task**, click to reopen, rename, delete, clear all. Titles are taken from the
first thing you typed unless you rename them by hand.

History lives in `localStorage`, not the database, and is keyed by account id.
The trade-off is that it is per-browser: sign in on another device and your
history does not follow you. Moving it server-side is now feasible (there are
real user ids to attach rows to) but has not been done.

- Keys: `chat_x.history.chat.<userId>` and `chat_x.history.code.<userId>`
- Capped at 50 sessions, newest first; on a quota error the oldest are shed
  rather than losing the write
- Attachment blob URLs are **not** persisted (they die on reload), so a restored
  message shows the filename as a chip instead of a broken image

Swapping in a backend later means reimplementing `src/lib/history.js`; the pages
only talk to `useHistory`.

## Local development

Backend:

```bash
cd Backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements-dev.txt
cp .env.example .env          # then add your GEMINI_API_KEY
uvicorn app.main:app --reload --port 8000
```

Frontend:

```bash
cd Frontend
npm install
cp .env.example .env          # optional; defaults to http://127.0.0.1:8000
npm run dev
```

Tests:

```bash
cd Backend && pytest
```

## Configuration

`Backend/.env` — see `.env.example` for the full list. Only `GEMINI_API_KEY` is
required; everything else has a default in `app/core/config.py`. Also worth
setting: `JWT_SECRET` (required in production) and `GOOGLE_CLIENT_ID` (enables
Google sign-in).

`Frontend/.env` — `VITE_API_URL` overrides the API base URL. Left unset in
production, where the bundle and API share an origin.

## Deployment

Render builds the root `Dockerfile`: stage 1 builds the React bundle, stage 2
installs the Python runtime and copies the bundle to `frontend_dist`, which
`app/main.py` serves. `render.yaml` declares the service, so a Blueprint deploy
picks up the health check and env vars automatically.

Steps:

1. New → **Blueprint**, point it at this repo. Render reads `render.yaml`.
2. Set **`GEMINI_API_KEY`** in the dashboard (marked `sync: false`).
3. Optionally set **`GOOGLE_CLIENT_ID`**, and add `https://<your-app>.onrender.com`
   to *Authorised JavaScript origins* on the OAuth client.
4. `JWT_SECRET` needs no action — `generateValue: true` makes Render create it
   once and keep it across deploys, so users stay signed in.

The container binds `$PORT` when Render provides it, falling back to 8000 locally.

### The filesystem is ephemeral

Render's container disk does not survive a restart or redeploy, and the free
plan has no persistent disk. With SQLite that means **every account and every
uploaded document is wiped on each deploy** — people have to register again.
The FAISS index shipped in the image survives, so `/query` still answers from
the committed documents.

To keep data, provision a managed Postgres and set `DATABASE_URL`;
`psycopg2-binary` is already in `requirements.txt` and
`app/db/session.py` switches drivers on the URL scheme, so no code changes are
needed. `render.yaml` has the database block commented out ready to enable.

Note also that the free plan spins the service down after inactivity, so the
first request after a pause takes about a minute.

The runtime image is `python:3.12-slim` and ships Python only. Requesting
execution (`run_tests`) for C, C++, Java or JavaScript reports that the
toolchain is unavailable rather than failing obscurely; add the compilers to
the Dockerfile if you need those.
