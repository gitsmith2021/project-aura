-- Ad-hoc fee demands — lets non-structure charges (library fines, mess bills)
-- post into the central fee ledger. Clears deferred items 4A-1 + 4C-1.
--
-- A structure-based demand keeps fee_structure_id; an ad-hoc demand has
-- fee_structure_id NULL and is identified by (source, source_ref) so the
-- originating record (a lending / a mess bill) is posted at most once.

alter table public.fee_demands alter column fee_structure_id drop not null;
alter table public.fee_demands add column if not exists source     text not null default 'fee_structure'
  check (source in ('fee_structure','library_fine','mess','other'));
alter table public.fee_demands add column if not exists source_ref  text;

-- one demand per originating record (e.g. one fine per lending, one bill per mess row)
create unique index if not exists uq_fee_demands_source_ref
  on public.fee_demands(source, source_ref) where source_ref is not null;
