# ===============================
# Stage 1 - Build the React bundle
# ===============================

# node:22, not node:20: Node 20 is past end-of-life, and vite 8 and eslint 10
# both require ^20.19 || >=22.12.
FROM node:22 AS frontend-builder

WORKDIR /frontend

COPY Frontend/package*.json ./

# npm ci, not npm install: installs the committed lockfile exactly, so an image
# built today resolves the same dependency tree as one built last month.
RUN npm ci

COPY Frontend .

RUN npm run build


# ===============================
# Stage 2 - FastAPI
# ===============================

FROM python:3.12-slim

WORKDIR /app

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1

COPY Backend/requirements.txt .

RUN pip install --no-cache-dir --upgrade pip \
    && pip install --no-cache-dir -r requirements.txt

COPY Backend .

# app.core.config resolves FRONTEND_DIST to /app/frontend_dist.
COPY --from=frontend-builder /frontend/dist ./frontend_dist

EXPOSE 8000

# Shell form on purpose: Render injects PORT, and this binds to it when present
# while still working locally with plain `docker run`.
CMD uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}
