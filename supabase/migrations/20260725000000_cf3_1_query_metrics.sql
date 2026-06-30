-- ════════════════════════════════════════════════════════════════════════════
-- AURA CORE FOUNDATION · CF-3.1 (WS5/WS6) — measurable executions
--
-- Persist per-execution confidence, latency and the resolved path on the question
-- log so Performance Metrics + Intelligence Analytics can be computed over time.
-- Additive only; no result data is stored. RLS already owner/SUPER_ADMIN-scoped.
-- ════════════════════════════════════════════════════════════════════════════

alter table public.intelligence_queries
  add column if not exists confidence numeric,
  add column if not exists latency_ms integer,
  add column if not exists path       text;
