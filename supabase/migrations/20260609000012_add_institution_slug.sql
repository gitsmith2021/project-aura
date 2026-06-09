-- URL-friendly slug for institutions so routes show /institutions/bishop-heber-college/...
-- instead of raw UUIDs. Middleware rewrites slug → UUID before page handlers run,
-- so no page code needs to change.
ALTER TABLE public.institutions ADD COLUMN IF NOT EXISTS slug TEXT;

-- Backfill: strip non-alphanumeric/space chars, collapse spaces to hyphens, lowercase.
-- "Bishop's College of Nursing" → "bishops-college-of-nursing"
-- "Bishop Heber College"        → "bishop-heber-college"
UPDATE public.institutions
SET slug = lower(
  regexp_replace(
    regexp_replace(name, '[^a-zA-Z0-9\s]', '', 'g'),
    '\s+', '-', 'g'
  )
)
WHERE slug IS NULL;

ALTER TABLE public.institutions ALTER COLUMN slug SET NOT NULL;
ALTER TABLE public.institutions ADD CONSTRAINT institutions_slug_unique UNIQUE (slug);

NOTIFY pgrst, 'reload schema';
