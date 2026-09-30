-- mcp_core.sql - Remote MCP server schema (Postgres/Supabase)
--
-- Copy into your project and run as a migration.
-- Adapt: domain list in mcp_domains, fn_mcp_is_admin() body.
-- All mcp_* tables are fully closed: RLS enabled, zero policies, revoke all.
-- UI access is exclusively via security-definer RPCs (revoke before grant).

-- ── settings ──────────────────────────────────────────────────────────────────

create table if not exists public.mcp_settings (
  id            integer primary key default 1 check (id = 1),
  ceiling_mode  text    not null check (ceiling_mode in ('deny', 'allow')) default 'deny',
  enabled       boolean not null default false
);

alter table public.mcp_settings enable row level security;
revoke all on public.mcp_settings from anon, authenticated, public;

-- ── domains ───────────────────────────────────────────────────────────────────

create table if not exists public.mcp_domains (
  domain         text    primary key,
  write_enabled  boolean not null default false
);

alter table public.mcp_domains enable row level security;
revoke all on public.mcp_domains from anon, authenticated, public;

-- ── user ceiling ──────────────────────────────────────────────────────────────

create table if not exists public.mcp_user_ceiling (
  user_id     uuid not null references auth.users (id) on delete cascade,
  domain      text not null,
  level       text not null check (level in ('none', 'read', 'write')),
  updated_by  uuid references auth.users (id),
  updated_at  timestamptz not null default now(),
  primary key (user_id, domain)
);

alter table public.mcp_user_ceiling enable row level security;
revoke all on public.mcp_user_ceiling from anon, authenticated, public;

-- ── ceiling history ───────────────────────────────────────────────────────────

create table if not exists public.mcp_user_ceiling_history (
  id          bigint generated always as identity primary key,
  user_id     uuid not null,
  domain      text not null,
  from_level  text,
  to_level    text not null,
  changed_by  uuid not null,
  changed_at  timestamptz not null default now()
);

alter table public.mcp_user_ceiling_history enable row level security;
revoke all on public.mcp_user_ceiling_history from anon, authenticated, public;

-- ── oauth clients ─────────────────────────────────────────────────────────────

create table if not exists public.mcp_oauth_clients (
  id              text primary key,
  client_id_hash  text not null unique,
  secret_hash     text,
  redirect_uris   text[] not null default '{}',
  family_id       uuid,
  audience        text,
  scopes          text[] not null default '{}',
  expires_at      timestamptz,
  revoked_at      timestamptz,
  created_at      timestamptz not null default now()
);

alter table public.mcp_oauth_clients enable row level security;
revoke all on public.mcp_oauth_clients from anon, authenticated, public;

-- ── oauth requests ────────────────────────────────────────────────────────────

create table if not exists public.mcp_oauth_requests (
  id          uuid primary key default gen_random_uuid(),
  client_id   text not null,
  user_id     uuid references auth.users (id) on delete cascade,
  scopes      text[] not null default '{}',
  state       text,
  pkce_hash   text,
  audience    text,
  expires_at  timestamptz not null,
  created_at  timestamptz not null default now()
);

alter table public.mcp_oauth_requests enable row level security;
revoke all on public.mcp_oauth_requests from anon, authenticated, public;

-- ── oauth codes ───────────────────────────────────────────────────────────────

create table if not exists public.mcp_oauth_codes (
  id          uuid primary key default gen_random_uuid(),
  code_hash   text not null unique,
  request_id  uuid not null references public.mcp_oauth_requests (id) on delete cascade,
  user_id     uuid not null references auth.users (id) on delete cascade,
  family_id   uuid,
  audience    text,
  scopes      text[] not null default '{}',
  expires_at  timestamptz not null,
  revoked_at  timestamptz,
  created_at  timestamptz not null default now()
);

alter table public.mcp_oauth_codes enable row level security;
revoke all on public.mcp_oauth_codes from anon, authenticated, public;

-- ── oauth tokens ──────────────────────────────────────────────────────────────

create table if not exists public.mcp_oauth_tokens (
  id              uuid primary key default gen_random_uuid(),
  token_hash      text not null unique,
  refresh_hash    text unique,
  user_id         uuid not null references auth.users (id) on delete cascade,
  client_id       text not null,
  family_id       uuid,
  audience        text,
  scopes          text[] not null default '{}',
  expires_at      timestamptz not null,
  revoked_at      timestamptz,
  created_at      timestamptz not null default now()
);

alter table public.mcp_oauth_tokens enable row level security;
revoke all on public.mcp_oauth_tokens from anon, authenticated, public;

-- ── connections ───────────────────────────────────────────────────────────────

create table if not exists public.mcp_connections (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users (id) on delete cascade,
  client_id    text not null,
  scopes       text[] not null default '{}',
  revoked_at   timestamptz,
  created_at   timestamptz not null default now()
);

create unique index if not exists mcp_connections_active_uq
  on public.mcp_connections (user_id, client_id)
  where (revoked_at is null);

alter table public.mcp_connections enable row level security;
revoke all on public.mcp_connections from anon, authenticated, public;

-- ── personal access tokens ────────────────────────────────────────────────────

create table if not exists public.mcp_pats (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users (id) on delete cascade,
  token_hash    text not null unique,
  client_label  text not null,
  scopes        text[] not null default '{}',
  expires_at    timestamptz not null,
  revoked_at    timestamptz,
  created_at    timestamptz not null default now()
);

alter table public.mcp_pats enable row level security;
revoke all on public.mcp_pats from anon, authenticated, public;

-- ── request log ───────────────────────────────────────────────────────────────

create table if not exists public.mcp_request_log (
  id              bigint generated always as identity primary key,
  user_id         uuid not null,
  connection_id   uuid,
  token_id        uuid,
  origin          text,
  client          text,
  protocol        text,
  tool            text not null,
  write           boolean not null,
  target          text,
  args_redacted   jsonb,
  result_summary  jsonb,
  ok              boolean not null,
  error           text,
  duration_ms     integer,
  created_at      timestamptz not null default now()
);

create index if not exists mcp_request_log_created_at_idx
  on public.mcp_request_log (created_at desc);

create index if not exists mcp_request_log_connection_idx
  on public.mcp_request_log (connection_id, created_at desc);

alter table public.mcp_request_log enable row level security;
revoke all on public.mcp_request_log from anon, authenticated, public;

-- ── helper: is-admin ──────────────────────────────────────────────────────────
-- Adapt: replace with your project's role check.

create or replace function public.fn_mcp_is_admin()
  returns boolean
  language sql
  stable
  security definer
  set search_path = public
as $$
  select exists (
    select 1 from auth.users
    where id = auth.uid() and raw_app_meta_data->>'role' = 'admin'
  );
$$;

-- ── helper: ceiling scopes ────────────────────────────────────────────────────

create or replace function public.fn_mcp_ceiling_scopes(p_user uuid)
  returns text[]
  language plpgsql
  stable
  security definer
  set search_path = public
as $$
declare
  v_mode    text;
  v_domains text[];
  v_result  text[] := '{}';
  v_row     record;
begin
  select ceiling_mode into v_mode from public.mcp_settings limit 1;
  v_mode := coalesce(v_mode, 'deny');
  select array_agg(domain order by domain) into v_domains from public.mcp_domains;
  if v_domains is null then return '{}'; end if;

  for v_row in
    select d.domain,
           coalesce(c.level, case when v_mode = 'allow' then 'write' else 'none' end) as level
    from unnest(v_domains) d(domain)
    left join public.mcp_user_ceiling c on c.user_id = p_user and c.domain = d.domain
  loop
    if v_row.level = 'write' then
      v_result := v_result || array[v_row.domain || ':read', v_row.domain || ':write'];
    elsif v_row.level = 'read' then
      v_result := v_result || array[v_row.domain || ':read'];
    end if;
  end loop;
  return v_result;
end;
$$;

-- ── admin: read ceiling ───────────────────────────────────────────────────────

create or replace function public.rpc_mcp_admin_ceiling()
  returns table (user_id uuid, domain text, level text)
  language plpgsql
  stable
  security definer
  set search_path = public
as $$
begin
  if not public.fn_mcp_is_admin() then
    raise exception 'admin role required';
  end if;
  return query
    select c.user_id, c.domain, c.level
    from public.mcp_user_ceiling c
    order by c.user_id, c.domain;
end;
$$;

revoke execute on function public.rpc_mcp_admin_ceiling() from public, anon;
grant execute on function public.rpc_mcp_admin_ceiling() to authenticated;

-- ── admin: set ceiling ────────────────────────────────────────────────────────

create or replace function public.rpc_mcp_admin_set_ceiling(
  p_user   uuid,
  p_domain text,
  p_level  text
)
  returns void
  language plpgsql
  security definer
  set search_path = public
as $$
declare
  v_old text;
begin
  if not public.fn_mcp_is_admin() then
    raise exception 'admin role required';
  end if;
  select level into v_old from public.mcp_user_ceiling
  where user_id = p_user and domain = p_domain;
  if p_level = 'none' then
    delete from public.mcp_user_ceiling where user_id = p_user and domain = p_domain;
  else
    insert into public.mcp_user_ceiling (user_id, domain, level, updated_by, updated_at)
    values (p_user, p_domain, p_level, auth.uid(), now())
    on conflict (user_id, domain)
    do update set level = excluded.level, updated_by = excluded.updated_by, updated_at = excluded.updated_at;
  end if;
  insert into public.mcp_user_ceiling_history (user_id, domain, from_level, to_level, changed_by, changed_at)
  values (p_user, p_domain, v_old, p_level, auth.uid(), now());
end;
$$;

revoke execute on function public.rpc_mcp_admin_set_ceiling(uuid, text, text) from public, anon;
grant execute on function public.rpc_mcp_admin_set_ceiling(uuid, text, text) to authenticated;

-- ── admin: read usage log ─────────────────────────────────────────────────────

create or replace function public.rpc_mcp_admin_usage(p_limit integer default 100, p_user uuid default null)
  returns table (
    id            bigint,
    user_id       uuid,
    connection_id uuid,
    origin        text,
    client        text,
    tool          text,
    write         boolean,
    ok            boolean,
    error         text,
    duration_ms   integer,
    created_at    timestamptz
  )
  language plpgsql
  stable
  security definer
  set search_path = public
as $$
begin
  if not public.fn_mcp_is_admin() then
    raise exception 'admin role required';
  end if;
  -- Note: args_redacted is never returned to callers (N-14 / specs L-04)
  return query
    select l.id, l.user_id, l.connection_id, l.origin, l.client,
           l.tool, l.write, l.ok, l.error, l.duration_ms, l.created_at
    from public.mcp_request_log l
    where (p_user is null or l.user_id = p_user)
    order by l.created_at desc
    limit least(p_limit, 500);
end;
$$;

revoke execute on function public.rpc_mcp_admin_usage(integer, uuid) from public, anon;
grant execute on function public.rpc_mcp_admin_usage(integer, uuid) to authenticated;

-- ── user: my connections ──────────────────────────────────────────────────────

create or replace function public.rpc_mcp_my_connections()
  returns table (id uuid, client_id text, scopes text[], created_at timestamptz)
  language plpgsql
  stable
  security definer
  set search_path = public
as $$
begin
  if auth.uid() is null then raise exception 'auth required'; end if;
  return query
    select c.id, c.client_id, c.scopes, c.created_at
    from public.mcp_connections c
    where c.user_id = auth.uid() and c.revoked_at is null
    order by c.created_at desc;
end;
$$;

revoke execute on function public.rpc_mcp_my_connections() from public, anon;
grant execute on function public.rpc_mcp_my_connections() to authenticated;

-- ── user: adjust connection ───────────────────────────────────────────────────

create or replace function public.rpc_mcp_adjust_connection(
  p_connection_id uuid,
  p_scopes        text[]
)
  returns void
  language plpgsql
  security definer
  set search_path = public
as $$
begin
  if auth.uid() is null then raise exception 'auth required'; end if;
  update public.mcp_connections
  set scopes = p_scopes
  where id = p_connection_id and user_id = auth.uid() and revoked_at is null;
end;
$$;

revoke execute on function public.rpc_mcp_adjust_connection(uuid, text[]) from public, anon;
grant execute on function public.rpc_mcp_adjust_connection(uuid, text[]) to authenticated;

-- ── user: revoke connection ───────────────────────────────────────────────────

create or replace function public.rpc_mcp_revoke_connection(p_connection_id uuid)
  returns void
  language plpgsql
  security definer
  set search_path = public
as $$
begin
  if auth.uid() is null then raise exception 'auth required'; end if;
  -- Cascading revoke: tokens and PATs linked to this connection
  update public.mcp_oauth_tokens
  set revoked_at = now()
  where id in (
    select t.id from public.mcp_oauth_tokens t
    join public.mcp_connections c on c.id = p_connection_id
    where c.user_id = auth.uid() and t.user_id = auth.uid()
  );
  update public.mcp_pats
  set revoked_at = now()
  where user_id = auth.uid();
  update public.mcp_connections
  set revoked_at = now()
  where id = p_connection_id and user_id = auth.uid();
end;
$$;

revoke execute on function public.rpc_mcp_revoke_connection(uuid) from public, anon;
grant execute on function public.rpc_mcp_revoke_connection(uuid) to authenticated;

-- ── oauth: request ────────────────────────────────────────────────────────────

create or replace function public.rpc_mcp_oauth_request(p_id uuid)
  returns table (request_id uuid, client_id text, scopes text[], state text)
  language plpgsql
  stable
  security definer
  set search_path = public
as $$
begin
  if auth.uid() is null then raise exception 'auth required'; end if;
  return query
    select r.id, r.client_id, r.scopes, r.state
    from public.mcp_oauth_requests r
    where r.id = p_id and r.user_id = auth.uid()
    for update;
end;
$$;

revoke execute on function public.rpc_mcp_oauth_request(uuid) from public, anon;
grant execute on function public.rpc_mcp_oauth_request(uuid) to authenticated;

-- ── oauth: decide ─────────────────────────────────────────────────────────────

create or replace function public.rpc_mcp_oauth_decide(
  p_id       uuid,
  p_scopes   text[],
  p_approve  boolean
)
  returns text
  language plpgsql
  security definer
  set search_path = public
as $$
declare
  v_code_hash text;
begin
  if auth.uid() is null then raise exception 'auth required'; end if;
  -- code_hash is stored in the DB; the plain code is derived externally and hashed before insert
  if not p_approve then
    delete from public.mcp_oauth_requests where id = p_id and user_id = auth.uid();
    return null;
  end if;
  -- Return the request state; actual code generation happens in the Edge Function
  return (select state from public.mcp_oauth_requests where id = p_id and user_id = auth.uid());
end;
$$;

revoke execute on function public.rpc_mcp_oauth_decide(uuid, text[], boolean) from public, anon;
grant execute on function public.rpc_mcp_oauth_decide(uuid, text[], boolean) to authenticated;

-- ── purge ─────────────────────────────────────────────────────────────────────

create or replace function public.fn_mcp_purge(p_days integer)
  returns void
  language plpgsql
  security definer
  set search_path = public
as $$
begin
  -- Purge usage log older than p_days
  delete from public.mcp_request_log
  where created_at < now() - (p_days || ' days')::interval;
  -- Purge expired OAuth rows
  delete from public.mcp_oauth_tokens  where expires_at < now();
  delete from public.mcp_oauth_codes   where expires_at < now();
  delete from public.mcp_oauth_requests where expires_at < now();
end;
$$;
