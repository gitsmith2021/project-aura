[← Back to Roadmap Index](../AURA_ROADMAP.md)

> **Depends on:** N/A — local environment setup reference.
> **Feeds into:** N/A — consult whenever running the full stack locally (Phase 8 adds the third terminal for the mobile app).

---

## 🏃 How to Run Full Stack Locally

```bash
# Terminal 1 — Next.js Frontend
npm run dev

# Terminal 2 — Python Scheduler Engine
cd aura-scheduler-engine
.\venv\Scripts\activate      # Windows
source venv/bin/activate     # Mac/Linux
uvicorn main:app --reload

# Terminal 3 — Mobile App (Phase 8 — directory created in Step 8A)
# Note: Run 'npx create-expo-app aura-mobile' in Step 8A first
cd aura-mobile
npx expo start
```
