# AURA Scheduler Engine — Aura Engine #1 (Timetable Optimization)
# Standalone FastAPI + Google OR-Tools (CP-SAT) microservice.
#
# This image is deployed to a container host (Railway / Render / Cloud Run),
# NOT to Vercel. Vercel hosts only the Next.js app, which calls this service
# over HTTPS via SCHEDULER_API_URL. See docs/AURA_CAMPUS/AURA_SCHEDULER_DEPLOYMENT.md
FROM python:3.12-slim

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=1

WORKDIR /app

# Install dependencies first so the layer is cached across source-only changes.
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Application source (explicit — never copy venv/ or __pycache__/).
COPY main.py models.py solver.py ./

# Run as a non-root user.
RUN useradd --create-home --uid 10001 appuser
USER appuser

# Documentation only; the real port is whatever $PORT the host injects.
EXPOSE 8000

# Liveness for local `docker run` (Railway uses healthcheckPath in railway.json).
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD python -c "import os,urllib.request; urllib.request.urlopen(f\"http://127.0.0.1:{os.environ.get('PORT','8000')}/health\").read()" || exit 1

# Railway/Render inject $PORT; default 8000 for local docker runs.
CMD ["sh", "-c", "uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000}"]
