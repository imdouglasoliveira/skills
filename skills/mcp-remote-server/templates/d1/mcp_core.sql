-- mcp_core.sql - Remote MCP server schema (SQLite / Cloudflare D1)
--
-- Copy into your project and run via wrangler d1 execute.
-- permission is enforced in the Worker; see references/permissions.md
-- scopes stored as JSON text (SQLite has no native array type).

-- ── settings ──────────────────────────────────────────────────────────────────

create table if not exists mcp_settings (
  id            integer primary key check (id = 1) default 1,
  ceiling_mode  text    not null check (ceiling_mode in ('deny', 'allow')) default 'deny',
  enabled       integer not null default 0  -- 0=false 1=true
);

-- ── domains ───────────────────────────────────────────────────────────────────

create table if not exists mcp_domains (
  domain         text    primary key,
  write_enabled  integer not null default 0
);

-- ── user ceiling ──────────────────────────────────────────────────────────────

create table if not exists mcp_user_ceiling (
  user_id     text not null,
  domain      text not null,
  level       text not null check (level in ('none', 'read', 'write')),
  updated_by  text,
  updated_at  text not null default (datetime('now')),
  primary key (user_id, domain)
);

-- ── ceiling history ───────────────────────────────────────────────────────────

create table if not exists mcp_user_ceiling_history (
  id          integer primary key autoincrement,
  user_id     text not null,
  domain      text not null,
  from_level  text,
  to_level    text not null,
  changed_by  text not null,
  changed_at  text not null default (datetime('now'))
);

-- ── oauth clients ─────────────────────────────────────────────────────────────

create table if not exists mcp_oauth_clients (
  id              text primary key,
  client_id_hash  text not null unique,
  secret_hash     text,
  redirect_uris   text not null default '[]',  -- JSON
  family_id       text,
  audience        text,
  scopes          text not null default '[]',   -- JSON
  expires_at      text,
  revoked_at      text,
  created_at      text not null default (datetime('now'))
);

-- ── oauth requests ────────────────────────────────────────────────────────────

create table if not exists mcp_oauth_requests (
  id          text primary key,
  client_id   text not null,
  user_id     text,
  scopes      text not null default '[]',  -- JSON
  state       text,
  pkce_hash   text,
  audience    text,
  expires_at  text not null,
  created_at  text not null default (datetime('now'))
);

-- ── oauth codes ───────────────────────────────────────────────────────────────

create table if not exists mcp_oauth_codes (
  id          text primary key,
  code_hash   text not null unique,
  request_id  text not null,
  user_id     text not null,
  family_id   text,
  audience    text,
  scopes      text not null default '[]',  -- JSON
  expires_at  text not null,
  revoked_at  text,
  created_at  text not null default (datetime('now'))
);

-- ── oauth tokens ──────────────────────────────────────────────────────────────

create table if not exists mcp_oauth_tokens (
  id             text primary key,
  token_hash     text not null unique,
  refresh_hash   text unique,
  user_id        text not null,
  client_id      text not null,
  family_id      text,
  audience       text,
  scopes         text not null default '[]',  -- JSON
  expires_at     text not null,
  revoked_at     text,
  created_at     text not null default (datetime('now'))
);

-- ── connections ───────────────────────────────────────────────────────────────

create table if not exists mcp_connections (
  id          text primary key,
  user_id     text not null,
  client_id   text not null,
  scopes      text not null default '[]',  -- JSON
  revoked_at  text,
  created_at  text not null default (datetime('now'))
);

create unique index if not exists mcp_connections_active_uq
  on mcp_connections (user_id, client_id)
  where (revoked_at is null);

-- ── personal access tokens ────────────────────────────────────────────────────

create table if not exists mcp_pats (
  id            text primary key,
  user_id       text not null,
  token_hash    text not null unique,
  client_label  text not null,
  scopes        text not null default '[]',  -- JSON
  expires_at    text not null,
  revoked_at    text,
  created_at    text not null default (datetime('now'))
);

-- ── request log ───────────────────────────────────────────────────────────────

create table if not exists mcp_request_log (
  id              integer primary key autoincrement,
  user_id         text not null,
  connection_id   text,
  token_id        text,
  origin          text,
  client          text,
  protocol        text,
  tool            text not null,
  write           integer not null,       -- 0=false 1=true
  target          text,
  args_redacted   text,                   -- JSON
  result_summary  text,                   -- JSON
  ok              integer not null,       -- 0=false 1=true
  error           text,
  duration_ms     integer,
  created_at      text not null default (datetime('now'))
);

create index if not exists mcp_request_log_created_at_idx
  on mcp_request_log (created_at desc);

create index if not exists mcp_request_log_connection_idx
  on mcp_request_log (connection_id, created_at desc);
