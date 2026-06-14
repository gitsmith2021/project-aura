-- Phase 3A — Notification Infrastructure
-- In-app notification inbox. Rows are created server-side (service role) by
-- triggers/actions; recipients can only read and mark-read their own.

create table if not exists public.notifications (
  id              uuid primary key default gen_random_uuid(),
  institution_id  uuid not null references public.institutions(id) on delete cascade,
  recipient_id    uuid not null references auth.users(id) on delete cascade,
  type            text not null,
  title           text not null,
  body            text not null,
  data            jsonb,
  is_read         boolean not null default false,
  read_at         timestamptz,
  created_at      timestamptz not null default now()
);

create index if not exists idx_notifications_recipient on public.notifications(recipient_id);
create index if not exists idx_notifications_unread on public.notifications(recipient_id, is_read);
create index if not exists idx_notifications_recipient_created on public.notifications(recipient_id, created_at desc);

alter table public.notifications enable row level security;

-- Recipients read their own notifications
drop policy if exists "notifications: recipient reads own" on public.notifications;
create policy "notifications: recipient reads own"
  on public.notifications for select to authenticated
  using (recipient_id = auth.uid());

-- Recipients mark their own notifications read (UPDATE needs USING + WITH CHECK).
-- No INSERT/DELETE policy: rows are written by the service-role admin client so a
-- user cannot forge a notification for another account or erase their own inbox.
drop policy if exists "notifications: recipient marks own read" on public.notifications;
create policy "notifications: recipient marks own read"
  on public.notifications for update to authenticated
  using (recipient_id = auth.uid())
  with check (recipient_id = auth.uid());

grant select, update on public.notifications to authenticated;

-- Live updates for the notification bell (Realtime honours the SELECT policy
-- above, so each user only receives their own rows).
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'notifications'
  ) then
    alter publication supabase_realtime add table public.notifications;
  end if;
end $$;
