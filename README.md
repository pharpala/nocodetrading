# No-code trading strategy sandbox

## Run with Docker (easiest)

From the repo root:

```bash
docker compose up --build
```

Then open **http://127.0.0.1:8080** in your browser. The frontend talks to the backend at http://localhost:8000.

- Optional: set `OPENAI_API_KEY` in the environment (or in a `.env` file) to use LLM parsing.
- Stop with `Ctrl+C`; add `-d` to run in the background.

---

## Run without Docker (two terminals)

### 1. Backend (port 8000)

```bash
cd backend
python3 -m venv .venv   # if you don't have .venv yet
.venv/bin/pip install -r requirements.txt
.venv/bin/uvicorn app:app --reload --host 127.0.0.1 --port 8000
```

Leave this terminal running.

### 2. Frontend (port 8080)

In a **second terminal**:

```bash
cd frontend
npm install   # if you haven't already
npm run dev
```

Then open **http://localhost:8080** (or http://127.0.0.1:8080) in your browser.

### One-command option (optional)

From the repo root:

```bash
npx concurrently -n backend,frontend -c blue,green "cd backend && .venv/bin/uvicorn app:app --reload --host 127.0.0.1 --port 8000" "cd frontend && npm run dev"
```

Stop with Ctrl+C.
