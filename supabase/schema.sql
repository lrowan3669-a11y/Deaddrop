-- DeadDrop Supabase schema
--
-- Run this in the Supabase SQL editor (Project -> SQL Editor -> New query),
-- paste the whole file, and click Run. Safe to re-run: every statement is
-- idempotent (create ... if not exists, drop policy if exists, etc).
--
-- Auth model: email/password via Supabase Auth (auth.users). Each user gets
-- exactly one `profiles` row, created by the app right after sign-up.
--
-- Data model:
--   profiles    - one row per user: alias, tier, theme, friend_code, etc.
--   connections - ONE row per mutual pair of users (not one row per side).
--                 This is what makes the cipher symmetric: both people
--                 derive the same key from the same pair of friend codes.
--   messages    - ONE row per message, visible to both participants of the
--                 connection. Either side deleting it removes it for both -
--                 a real shared self-destruct, not a local approximation.
--
-- Daily message limits are enforced by counting rows in `messages` where
-- sender_id = auth.uid() and created_at is today - no separate counter
-- table needed.

create extension if not exists pgcrypto;

-- ============================================================
-- profiles
-- ============================================================

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  alias text not null,
  tier text not null default 'free' check (tier in ('free', 'agent', 'secret')),
  theme text not null default 'classified',
  friend_code text not null unique,
  cipher_type text not null default 'affine' check (cipher_type in ('affine', 'cascade')),
  bio_encoding_enabled boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

grant usage on schema public to authenticated;
grant select, insert, update, delete on public.profiles to authenticated;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
  on public.profiles for select
  using (auth.uid() = id);

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own"
  on public.profiles for insert
  with check (auth.uid() = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- Look up a user id by friend code without exposing the rest of their
-- profile (alias, tier, etc). Used by the "Add Connection" flow.
create or replace function public.find_user_id_by_friend_code(code text)
returns uuid
language sql
security definer
set search_path = public
stable
as $$
  select id from public.profiles where friend_code = upper(trim(code));
$$;

grant execute on function public.find_user_id_by_friend_code(text) to authenticated;

-- ============================================================
-- connections (one row per mutual pair)
-- ============================================================

create table if not exists public.connections (
  id uuid primary key default gen_random_uuid(),
  user_a uuid not null references auth.users (id) on delete cascade,
  user_b uuid not null references auth.users (id) on delete cascade,
  nickname_a text,
  nickname_b text,
  created_at timestamptz not null default now(),
  constraint connections_distinct_users check (user_a <> user_b)
);

create unique index if not exists connections_pair_key
  on public.connections (least(user_a, user_b), greatest(user_a, user_b));

alter table public.connections enable row level security;

grant select, delete on public.connections to authenticated;
-- No insert/update grant: connections are only ever created or modified
-- through add_connection() below (security definer), never a direct insert.

drop policy if exists "connections_select_participant" on public.connections;
create policy "connections_select_participant"
  on public.connections for select
  using (auth.uid() = user_a or auth.uid() = user_b);

drop policy if exists "connections_delete_participant" on public.connections;
create policy "connections_delete_participant"
  on public.connections for delete
  using (auth.uid() = user_a or auth.uid() = user_b);

-- Adds (or re-affirms) a mutual connection by the other person's friend
-- code, storing the nickname the CALLER wants to use for them. If the pair
-- already exists (either person added the other first), this just fills in
-- the caller's side of the nickname instead of creating a duplicate row.
create or replace function public.add_connection(their_friend_code text, my_nickname text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  me uuid := auth.uid();
  them uuid;
  a uuid;
  b uuid;
  connection_id uuid;
begin
  if me is null then
    raise exception 'Not authenticated';
  end if;

  them := public.find_user_id_by_friend_code(their_friend_code);
  if them is null then
    raise exception 'No vault found with that friend code';
  end if;
  if them = me then
    raise exception 'You cannot add yourself';
  end if;

  a := least(me, them);
  b := greatest(me, them);

  insert into public.connections (user_a, user_b, nickname_a, nickname_b)
  values (
    a,
    b,
    case when me = a then my_nickname else null end,
    case when me = b then my_nickname else null end
  )
  on conflict (least(user_a, user_b), greatest(user_a, user_b))
  do update set
    nickname_a = case when me = a then excluded.nickname_a else public.connections.nickname_a end,
    nickname_b = case when me = b then excluded.nickname_b else public.connections.nickname_b end
  returning id into connection_id;

  return connection_id;
end;
$$;

grant execute on function public.add_connection(text, text) to authenticated;

-- ============================================================
-- messages (one shared row per message)
-- ============================================================

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  connection_id uuid not null references public.connections (id) on delete cascade,
  sender_id uuid not null references auth.users (id) on delete cascade,
  plain_text text not null,
  cipher_text text not null,
  created_at timestamptz not null default now(),
  read_at timestamptz
);

create index if not exists messages_connection_created_idx
  on public.messages (connection_id, created_at desc);

create index if not exists messages_sender_created_idx
  on public.messages (sender_id, created_at desc);

alter table public.messages enable row level security;

grant select, insert, update, delete on public.messages to authenticated;

drop policy if exists "messages_select_participant" on public.messages;
create policy "messages_select_participant"
  on public.messages for select
  using (
    exists (
      select 1 from public.connections c
      where c.id = messages.connection_id
        and auth.uid() in (c.user_a, c.user_b)
    )
  );

drop policy if exists "messages_insert_participant" on public.messages;
create policy "messages_insert_participant"
  on public.messages for insert
  with check (
    sender_id = auth.uid()
    and exists (
      select 1 from public.connections c
      where c.id = messages.connection_id
        and auth.uid() in (c.user_a, c.user_b)
    )
  );

drop policy if exists "messages_update_participant" on public.messages;
create policy "messages_update_participant"
  on public.messages for update
  using (
    exists (
      select 1 from public.connections c
      where c.id = messages.connection_id
        and auth.uid() in (c.user_a, c.user_b)
    )
  )
  with check (
    exists (
      select 1 from public.connections c
      where c.id = messages.connection_id
        and auth.uid() in (c.user_a, c.user_b)
    )
  );

-- Either participant can delete a message - this is the shared
-- self-destruct: one row, deleting it removes it for both sides.
drop policy if exists "messages_delete_participant" on public.messages;
create policy "messages_delete_participant"
  on public.messages for delete
  using (
    exists (
      select 1 from public.connections c
      where c.id = messages.connection_id
        and auth.uid() in (c.user_a, c.user_b)
    )
  );
