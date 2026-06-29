# Infrastructure — Anthropic (Claude API)

## Purpose

The Anthropic Claude API powers Aura's AI layer: the Knowledge Hub AI summaries and the RAG-based Knowledge Assistant.

## Current Configuration

- **SDK:** `@anthropic-ai/sdk` `^0.105.0` ([package.json](../../package.json)).
- **Model:** `claude-opus-4-8` (constant `MODEL` in [src/actions/knowledgeAI.ts](../../src/actions/knowledgeAI.ts)).
- **Auth:** `ANTHROPIC_API_KEY` (server-only env var). If absent, AI actions fail closed with `"AI is not configured (missing ANTHROPIC_API_KEY)"` — the app does not crash.
- **Credits:** ~**USD 20** prepaid (confirmed by the account owner, 2026-06).
- **Where it is called (verified):**
  - `generateResourceSummary()` — `max_tokens: 512`, owner/admin-gated, persists `ai_summary`.
  - `askKnowledgeAssistant()` — `max_tokens: 1024`, admin/HOD-gated RAG over full-text search; logs to `knowledge_assistant_logs`.
- Prompt builders / system prompts live in [src/lib/knowledgeAI.ts](../../src/lib/knowledgeAI.ts).

## Current Production Status

**Live, but gated and low-volume.** AI features are limited to the Knowledge Hub and restricted to admin/HOD/owner roles. Retrieval is **Postgres full-text search, not vector embeddings** — the code defers embeddings explicitly. Any "pgvector / semantic search" claim is `TODO — Requires Manual Verification`.

## Deployment Flow

- The key is set in Vercel (production) and `.env.local` (local). No build step depends on it; features activate at runtime when the key is present.

## Recovery Notes

- **Key leaked/rotated:** rotate in the Anthropic console, update `ANTHROPIC_API_KEY` in Vercel + `.env.local`, redeploy.
- **Credits exhausted / API error:** AI actions return a `{ success: false, error }` result; the surrounding UI degrades gracefully (no hard failure). Top up credits in the console.
- **Cost control:** token caps (512 / 1024) and role gating bound spend; the assistant gate runs *before* any token spend.

## Future Improvements

- Add usage logging/metrics and a monthly budget alert.
- Promote retrieval to **pgvector embeddings** for semantic search (the deferred concern noted in code).
- Consider adaptive thinking / streaming for longer assistant answers per the Claude API guidance.

## Related Documents

- [Architecture Overview](../architecture/Architecture Overview.md) (AI architecture) · `docs/AURA_CORE/AURA_AI.md` · [Secrets](Secrets.md)

## Last Updated

2026-06-29

## Owner

Platform Engineering
