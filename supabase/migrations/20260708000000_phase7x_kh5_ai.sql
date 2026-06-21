-- Phase 7X / KH-5 — Knowledge Hub AI layer.
--
-- Adds:
--   1. AI summary fields on knowledge_resources (Claude-generated abstracts).
--   2. knowledge_assistant_logs — an audit + cost-transparency log of every
--      Knowledge Assistant (RAG) question/answer, with the resources it cited.
--
-- Semantic search (pgvector embeddings) is intentionally NOT included here: it
-- requires an embedding provider (Anthropic's API is generative-only). pgvector
-- 0.8.0 is enabled on the project and ready for that follow-up once an embedding
-- key (e.g. Voyage AI) is configured. The Knowledge Assistant retrieves over the
-- existing KH-2 full-text index in the meantime.

alter table public.knowledge_resources
  add column if not exists ai_summary text,
  add column if not exists ai_summary_generated_at timestamptz;

create table if not exists public.knowledge_assistant_logs (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null references public.institutions(id) on delete cascade,
  profile_id uuid not null references auth.users(id) on delete cascade,
  question text not null,
  answer text not null,
  cited_resource_ids uuid[] not null default '{}',
  created_at timestamptz not null default now()
);

alter table public.knowledge_assistant_logs enable row level security;

-- The assistant is admin/HOD-gated at the action layer; each user reads only
-- their own query history.
drop policy if exists "kalog: own read" on public.knowledge_assistant_logs;
create policy "kalog: own read" on public.knowledge_assistant_logs
  for select using (profile_id = auth.uid());

drop policy if exists "kalog: own insert" on public.knowledge_assistant_logs;
create policy "kalog: own insert" on public.knowledge_assistant_logs
  for insert with check (profile_id = auth.uid());

create index if not exists idx_kalog_profile on public.knowledge_assistant_logs (profile_id, created_at desc);
create index if not exists idx_kalog_institution on public.knowledge_assistant_logs (institution_id);
