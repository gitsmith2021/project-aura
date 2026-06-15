-- Phase 4B — Auditorium & Space Booking
create table if not exists public.venues (
  id              uuid primary key default gen_random_uuid(),
  institution_id  uuid not null references public.institutions(id) on delete cascade,
  name            text not null,
  venue_type      text not null check (venue_type in ('auditorium','seminar_hall','lab','conference_room','ground','other')),
  capacity        integer,
  amenities       jsonb,
  is_active       boolean not null default true,
  created_at      timestamptz not null default now()
);

create table if not exists public.venue_bookings (
  id              uuid primary key default gen_random_uuid(),
  institution_id  uuid not null references public.institutions(id) on delete cascade,
  venue_id        uuid not null references public.venues(id) on delete cascade,
  booked_by       uuid not null references auth.users(id) on delete cascade,
  event_title     text not null,
  purpose         text,
  start_datetime  timestamptz not null,
  end_datetime    timestamptz not null,
  attendees_count integer,
  status          text not null default 'pending' check (status in ('pending','approved','rejected','cancelled')),
  admin_notes     text,
  created_at      timestamptz not null default now()
);

create index if not exists idx_venues_inst on public.venues(institution_id);
create index if not exists idx_venue_bookings_venue_time on public.venue_bookings(venue_id, start_datetime, end_datetime);
create index if not exists idx_venue_bookings_inst_status on public.venue_bookings(institution_id, status);
create index if not exists idx_venue_bookings_booker on public.venue_bookings(booked_by);

alter table public.venues enable row level security;
alter table public.venue_bookings enable row level security;

-- venues: members read; admins manage
drop policy if exists "venues: members read" on public.venues;
create policy "venues: members read" on public.venues for select to authenticated
  using (
    institution_id in (
      select institution_id from public.institution_members where profile_id = auth.uid()
      union select institution_id from public.staff where profile_id = auth.uid()
      union select institution_id from public.students where profile_id = auth.uid()
    )
  );

drop policy if exists "venues: admins manage" on public.venues;
create policy "venues: admins manage" on public.venues for all to authenticated
  using (
    exists (select 1 from private.get_user_authorizations() g where g.role = 'SUPER_ADMIN')
    or exists (select 1 from private.get_user_authorizations() g where g.tenant_id = institution_id and g.role = 'INST_ADMIN')
  )
  with check (
    exists (select 1 from private.get_user_authorizations() g where g.role = 'SUPER_ADMIN')
    or exists (select 1 from private.get_user_authorizations() g where g.tenant_id = institution_id and g.role = 'INST_ADMIN')
  );

-- bookings: booker reads own; admins read all. Members create own (pending).
-- Booker can update own (cancel); admins manage (approve/reject/notes). Admins delete.
drop policy if exists "venue_bookings: read own or admin" on public.venue_bookings;
create policy "venue_bookings: read own or admin" on public.venue_bookings for select to authenticated
  using (
    booked_by = auth.uid()
    or exists (select 1 from private.get_user_authorizations() g where g.role = 'SUPER_ADMIN')
    or exists (select 1 from private.get_user_authorizations() g where g.tenant_id = institution_id and g.role = 'INST_ADMIN')
  );

drop policy if exists "venue_bookings: member creates own" on public.venue_bookings;
create policy "venue_bookings: member creates own" on public.venue_bookings for insert to authenticated
  with check (
    booked_by = auth.uid()
    and institution_id in (
      select institution_id from public.institution_members where profile_id = auth.uid()
      union select institution_id from public.staff where profile_id = auth.uid()
      union select institution_id from public.students where profile_id = auth.uid()
    )
  );

drop policy if exists "venue_bookings: booker or admin update" on public.venue_bookings;
create policy "venue_bookings: booker or admin update" on public.venue_bookings for update to authenticated
  using (
    booked_by = auth.uid()
    or exists (select 1 from private.get_user_authorizations() g where g.role = 'SUPER_ADMIN')
    or exists (select 1 from private.get_user_authorizations() g where g.tenant_id = institution_id and g.role = 'INST_ADMIN')
  )
  with check (
    booked_by = auth.uid()
    or exists (select 1 from private.get_user_authorizations() g where g.role = 'SUPER_ADMIN')
    or exists (select 1 from private.get_user_authorizations() g where g.tenant_id = institution_id and g.role = 'INST_ADMIN')
  );

drop policy if exists "venue_bookings: admins delete" on public.venue_bookings;
create policy "venue_bookings: admins delete" on public.venue_bookings for delete to authenticated
  using (
    exists (select 1 from private.get_user_authorizations() g where g.role = 'SUPER_ADMIN')
    or exists (select 1 from private.get_user_authorizations() g where g.tenant_id = institution_id and g.role = 'INST_ADMIN')
  );

grant select, insert, update, delete on public.venues to authenticated;
grant select, insert, update, delete on public.venue_bookings to authenticated;
