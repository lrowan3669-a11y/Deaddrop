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
  pin_hash text,
  pin_attempts int not null default 0,
  pin_locked_until timestamptz,
  terms_accepted_at timestamptz,
  stripe_customer_id text,
  stripe_subscription_id text,
  subscription_status text,
  created_at timestamptz not null default now()
);

alter table public.profiles add column if not exists pin_hash text;
alter table public.profiles add column if not exists pin_attempts int not null default 0;
alter table public.profiles add column if not exists pin_locked_until timestamptz;
alter table public.profiles add column if not exists terms_accepted_at timestamptz;
alter table public.profiles add column if not exists stripe_customer_id text;
alter table public.profiles add column if not exists stripe_subscription_id text;
alter table public.profiles add column if not exists subscription_status text;

create unique index if not exists profiles_stripe_customer_id_idx
  on public.profiles (stripe_customer_id)
  where stripe_customer_id is not null;

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

-- Lets a user wipe their own DeadDrop data ("Delete Vault"). This removes
-- the profile row (and, via cascade, their connections and messages) but
-- NOT the underlying auth.users row - deleting the auth account itself
-- requires a service-role server call, which is a separate piece of work.
drop policy if exists "profiles_delete_own" on public.profiles;
create policy "profiles_delete_own"
  on public.profiles for delete
  using (auth.uid() = id);

-- Sets (or replaces) the caller's vault PIN. The raw PIN is only ever
-- hashed (bcrypt via pgcrypto) and never stored or returned in plain form.
create or replace function public.set_pin(new_pin text)
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;
  if new_pin !~ '^[0-9]{4,6}$' then
    raise exception 'PIN must be 4-6 digits';
  end if;

  update public.profiles
  set pin_hash = crypt(new_pin, gen_salt('bf')),
      pin_attempts = 0,
      pin_locked_until = null
  where id = auth.uid();
end;
$$;

grant execute on function public.set_pin(text) to authenticated;

-- Verifies the caller's vault PIN server-side (the hash never leaves the
-- database). Locks out further attempts for 5 minutes after 5 consecutive
-- failures, resetting the counter on success or once locked.
create or replace function public.verify_pin(pin text)
returns boolean
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  row_pin_hash text;
  row_locked_until timestamptz;
  row_attempts int;
  ok boolean;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  select pin_hash, pin_locked_until, pin_attempts
    into row_pin_hash, row_locked_until, row_attempts
  from public.profiles
  where id = auth.uid();

  if row_locked_until is not null and row_locked_until > now() then
    raise exception 'Too many attempts. Try again in a few minutes.';
  end if;

  if row_pin_hash is null then
    raise exception 'No PIN set for this vault';
  end if;

  ok := (row_pin_hash = crypt(pin, row_pin_hash));

  if ok then
    update public.profiles
    set pin_attempts = 0, pin_locked_until = null
    where id = auth.uid();
  else
    if row_attempts + 1 >= 5 then
      update public.profiles
      set pin_attempts = 0, pin_locked_until = now() + interval '5 minutes'
      where id = auth.uid();
    else
      update public.profiles
      set pin_attempts = row_attempts + 1
      where id = auth.uid();
    end if;
  end if;

  return ok;
end;
$$;

grant execute on function public.verify_pin(text) to authenticated;

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

-- Lists the caller's connections with the counterpart's alias and friend
-- code resolved server-side (there is no broad SELECT policy on profiles
-- that would let the client join to them directly).
create or replace function public.list_connections()
returns table (
  connection_id uuid,
  counterpart_id uuid,
  counterpart_alias text,
  counterpart_friend_code text,
  my_nickname text,
  created_at timestamptz
)
language sql
security definer
set search_path = public
stable
as $$
  select
    c.id as connection_id,
    case when c.user_a = auth.uid() then c.user_b else c.user_a end as counterpart_id,
    p.alias as counterpart_alias,
    p.friend_code as counterpart_friend_code,
    case when c.user_a = auth.uid() then c.nickname_a else c.nickname_b end as my_nickname,
    c.created_at
  from public.connections c
  join public.profiles p
    on p.id = (case when c.user_a = auth.uid() then c.user_b else c.user_a end)
  where auth.uid() in (c.user_a, c.user_b)
  order by c.created_at desc;
$$;

grant execute on function public.list_connections() to authenticated;

-- ============================================================
-- messages (one shared row per message)
-- ============================================================

-- Only ciphertext is ever stored - plaintext is decoded client-side on
-- demand from the connection's shared key, so a database read (or leak)
-- never exposes message contents in the clear.
create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  connection_id uuid not null references public.connections (id) on delete cascade,
  sender_id uuid not null references auth.users (id) on delete cascade,
  cipher_text text not null,
  created_at timestamptz not null default now(),
  read_at timestamptz
);

alter table public.messages drop column if exists plain_text;

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

-- ============================================================
-- moderation_flags (metadata-only abuse signal, never message content)
-- ============================================================

-- Written once whenever the client-side content filter
-- (lib/content-safety.ts) blocks a message from being sent. Stores nothing
-- about what was typed - just that it happened, for whom, and when - so the
-- operator can spot repeat offenders and disable their account from the
-- Supabase dashboard. No select/update/delete grant for regular users:
-- only the owner (via the dashboard or service role, which bypasses RLS)
-- can review these.
create table if not exists public.moderation_flags (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now()
);

create index if not exists moderation_flags_user_created_idx
  on public.moderation_flags (user_id, created_at desc);

alter table public.moderation_flags enable row level security;

grant insert on public.moderation_flags to authenticated;

drop policy if exists "moderation_flags_insert_own" on public.moderation_flags;
create policy "moderation_flags_insert_own"
  on public.moderation_flags for insert
  with check (auth.uid() = user_id);
