# Company — AI Charter

## Purpose

State the principles governing how Aura builds and operates AI features, grounded in how the AI layer is **actually implemented today**.

## Current State

AI is live in the **Knowledge Hub** (Aura Campus): Claude-generated summaries and an admin/HOD-gated RAG assistant. Verified in [src/actions/knowledgeAI.ts](../../src/actions/knowledgeAI.ts) and [src/lib/knowledgeAI.ts](../../src/lib/knowledgeAI.ts).

## Implementation — our commitments

1. **Purposeful, not decorative.** AI ships only where it removes real work (discovery summaries; answering questions grounded in the institution's own documents; OR-Tools timetable optimization). No AI for its own sake.

2. **Grounded and cited.** The Knowledge Assistant uses retrieval-augmented generation over the institution's documents and **cites its sources**; it answers from those documents, not from open-ended speculation. (Retrieval today is Postgres full-text search; vector embeddings are a planned upgrade — we will not claim "semantic/vector search" until it is live.)

3. **Access-controlled.** AI actions authenticate the user and gate by role/ownership **before** any model call (summaries: owner/admin; assistant: admin/HOD). Tenant data stays within RLS boundaries.

4. **Fails closed, degrades gracefully.** With no `ANTHROPIC_API_KEY` or on API error, features return a clear, non-fatal message — the platform keeps working. AI is never on the critical path for core operations.

5. **Cost- and abuse-bounded.** Token caps (e.g. 512 / 1024) and role gating bound spend; gates run before tokens are spent.

6. **Auditable.** AI exchanges (assistant Q&A and cited sources) are logged (`knowledge_assistant_logs`); generated summaries are timestamped on the resource.

7. **Human-in-the-loop.** AI assists decisions (summaries, draft answers, candidate timetables); humans review and own the outcome. Generated content is clearly the product of AI.

8. **Privacy-respecting.** AI operates on tenant-scoped data under RLS; we do not repurpose institutional data beyond the feature that produced it. Provider data-handling terms apply — see [Anthropic](../infrastructure/Anthropic.md).

## Future Roadmap

- Promote retrieval to **pgvector embeddings** for semantic search.
- Add usage metrics, budget alerts, and an evaluation harness for answer quality.
- Generalise into the **Aura AI** platform service (`@aura/ai`) for reuse across products.

## Related Documents

- [Anthropic](../infrastructure/Anthropic.md) · [Architecture Overview](../architecture/Architecture Overview.md) (AI architecture) · `docs/AURA_CORE/AURA_AI.md` · [Core Principles](Core Principles.md)

## Last Updated

2026-06-29

## Owner

Founder & Leadership · Platform Engineering
