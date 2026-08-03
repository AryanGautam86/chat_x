# ===============================
# Stage 1 - Build the React bundle
# ===============================

FROM node:20 AS frontend-builder

WORKDIR /frontend

COPY Frontend/package*.json ./

RUN npm install

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
