-- Security hardening — pin search_path on the two Knowledge Hub trigger functions
--
-- Clears the `function_search_path_mutable` advisor WARNs (lint 0011) on
-- public.kr_update_search_vector and public.kr_recalc_rating. A mutable
-- search_path lets a caller's session search_path influence name resolution
-- inside a function — pinning it to '' forces fully-qualified resolution.
--
-- Safe: both bodies reference only fully-qualified objects (public.knowledge_*)
-- or pg_catalog built-ins (to_tsvector / coalesce / array_to_string / count /
-- sum) and the 'english' text-search config, all of which resolve with an empty
-- search_path (pg_catalog is always implicitly present). No body change needed.

alter function public.kr_update_search_vector() set search_path = '';
alter function public.kr_recalc_rating() set search_path = '';
