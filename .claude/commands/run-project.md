Run both development servers for the Aura project simultaneously:

1. Start the Next.js frontend by running `npm run dev` in the background from the project root directory.
2. Start the Python scheduler engine using command prompt (required for Windows paths): run `cd aura-scheduler-engine && venv\Scripts\python.exe -m uvicorn main:app --reload` in the background via the Bash tool.

Run both commands in parallel (background). After starting both, confirm:
- Next.js is running on http://localhost:3000
- Python FastAPI engine is running on http://localhost:8000
