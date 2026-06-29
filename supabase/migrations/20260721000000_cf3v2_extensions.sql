-- ════════════════════════════════════════════════════════════════════════════
-- AURA CORE FOUNDATION · CF-3 v2 — extensions for the Intelligence Engine
--
-- pgvector  → semantic (vector) resolution of questions → entities/columns/values
-- pg_trgm   → fuzzy (trigram) value resolution that works WITHOUT embeddings, the
--             always-on deterministic fallback (e.g. "computer science" → the real
--             department name). Installed into the `extensions` schema per the
--             Supabase convention. Both are available on Supabase Pro.
-- ════════════════════════════════════════════════════════════════════════════

create extension if not exists vector with schema extensions;
create extension if not exists pg_trgm with schema extensions;
