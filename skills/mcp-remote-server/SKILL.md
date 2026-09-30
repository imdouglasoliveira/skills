---
name: mcp-remote-server
description: "Builds a remote MCP server with per-user read/write permissions, an access admin screen and a usage log, on Supabase Edge Functions, a closed proxy, or Cloudflare Workers."
argument-hint: "[supabase|proxy|cloudflare] <what the server must expose>"
use-when:
  - building a remote MCP server that several users of an existing app will connect to
  - exposing Supabase data to AI clients with per-user read/write limits
  - building an MCP server on Cloudflare Workers with D1, R2 or KV
  - putting a stable custom domain in front of an MCP server hosted elsewhere
  - adding an access admin screen or a usage log to an existing MCP server
do-not-use-for:
  - a local stdio MCP server or a single-user tool wrapper
  - connecting a client to an existing MCP server
  - auditing the MCP configuration of a client
  - a Cloudflare Worker that is not an MCP server
metadata:
  version: "1.0.0"
  license: MIT
---

## When to use

Use this skill when you need a **remote, multi-user MCP server**: one that multiple users of an existing
application connect to, each with their own read/write permissions, through an admin-controlled access
screen and a full usage log.

## Do not use

- **stdio or single-user wrapper** - no per-user permission, access screen or usage log to build.
- **Connecting to an existing server** - this skill builds servers; it does not configure clients.
- **Auditing client configuration** - reviewing what a client is allowed to call is a separate job.
- **Generic Cloudflare Worker** (not an MCP server) - none of the MCP contracts below apply.

---

## Before any code - ask, do not assume

Steps 1 to 3 are the user's decisions, not yours. Read the request: for each of runtime, auth mode and
ceiling mode that it does not state, ask the user in one message, listing the options from the tables below
with one line on the trade-off, and stop. Do not create a file, a migration or a template copy until the
three answers are in. A safe-looking default (such as `deny`) is still a decision the user did not make.

---

## Step 1 - Decide the runtime

Answer the question in the right column; take the matching row.

| Runtime | When to choose |
|---|---|
| **Supabase Edge Functions** (direct) | Your app already uses Supabase Auth; you want the user JWT validated at the edge with `verify_jwt = false` and RLS enforced by the Supabase client. |
| **Supabase + closed proxy** | You need a stable custom domain or want to put a thin routing layer in front of a Supabase-hosted MCP resource. |
| **Cloudflare Workers** | You want a single Worker binary with D1 (relational), R2 (files) and KV (rate limit / cache); no Supabase dependency. |

All three runtimes implement the same permission model and usage log; the differences are in deployment
and auth wiring. See `references/runtime-supabase.md`, `references/runtime-proxy.md`, or
`references/runtime-cloudflare.md` after deciding.

---

## Step 2 - Decide the auth mode

Four modes are available. The matrix below shows which modes apply to each runtime and client type.
See `references/auth-modes.md` for the full decision tree and edge cases.

| Mode | Supabase direct | Supabase + proxy | Cloudflare Workers |
|---|---|---|---|
| **Own OAuth 2.1 server** | Yes | Yes | Yes |
| **Supabase Auth OAuth 2.1 Server** | Yes | Yes | No |
| **PAT (Personal Access Token)** | Yes | Yes | Yes |
| **`workers-oauth-provider`** | No | No | Yes |

Choose the mode before writing any code. The auth wiring touches the token endpoint, the resource
metadata document and the per-user session table.

---

## Step 3 - Decide the ceiling mode

Every project sets exactly one ceiling mode. It controls what happens when a user has no row in the
permission table for a given domain.

| Mode | No row for domain means |
|---|---|
| **`deny`** | No access to that domain (safe default) |
| **`allow`** | Full write access (open by default, ceiling only restricts) |

Declare the mode in your project configuration before building the permission layer. See
`references/permissions.md` for the three-layer model and the `effectiveScopes` calculation.

---

## Step 4 - Build in this order

1. **Schema and RPCs** - create the `mcp_*` tables, functions and policies from the SQL template.
2. **Pure modules** - copy the four `.mjs` templates and adapt the domain list and ceiling mode.
3. **Authorization server** - wire the chosen auth mode; generate token, refresh and revoke endpoints.
4. **MCP resource** - implement `server/discover`, `tools/list` and `tools/call` using the tool contract.
5. **Access screens** - admin ceiling view, connection list, consent page, usage history.
6. **Usage log and retention** - enable the log insert after every `tools/call` outcome; schedule purge.
7. **Tests** - unit tests with injected I/O, SQL smoke, content guards, burst test (local only).
8. **Clients** - configure each client to the three-level proof standard.

---

## Non-negotiables

- **N-01** Auth, `Origin` header check and kill switch run before the request body is parsed (see `references/protocol.md`).
- **N-02** Tool scope is declared in the tool definition; the scope map is derived, never hand-written; a parity test locks the two in sync (see `references/tool-contract.md`).
- **N-03** A truncated list always includes a `notice` with `cut_at` and the name of the full-list tool; silent truncation is forbidden (see `references/tool-contract.md`).
- **N-04** A destructive tool requires a literal `confirm` field in `input` and in `required`, validated before any read (see `references/tool-contract.md`).
- **N-05** The `resource` parameter is checked byte-for-byte (no trailing slash) in both `/authorize` and `/token`; the audience is stored and re-validated on every use (see `references/auth-modes.md`).
- **N-06** `/token` checks the client record before the authorization code; `invalid_client` 401 is only for a client that does not exist; a database failure returns 500 `server_error` (see `references/auth-modes.md`).
- **N-07** Permissions have three layers: tenant kill switch, per-user domain ceiling, per-token scope (see `references/permissions.md`).
- **N-08** The effective scope is recalculated on every request as `token scope ∩ current ceiling`; lowering a ceiling takes effect on the next call (see `references/permissions.md`).
- **N-09** (Supabase) Business data is read with the user's own JWT so RLS applies; service role is used only in plumbing (token ops, admin RPCs) (see `references/permissions.md`).
- **N-10** Both Edge Functions (`mcp-resource` and `mcp-auth`) set `verify_jwt = false`; the reason must be documented (see `references/runtime-supabase.md`).
- **N-11** The proxy exposes a closed list of routes; any path not in the list returns 404 locally (see `references/runtime-proxy.md`).
- **N-12** (Cloudflare) Every data-access helper refuses a query that lacks `tenant_id`; a tenant-isolation test is required (see `references/runtime-cloudflare.md`).
- **N-13** Every admin RPC that reads usage or ceiling data checks the admin role, not just the session (see `references/access-screens.md`).
- **N-14** Every outcome of `tools/call` (success, scope refusal, rate limit, session failure) produces a log row (see `references/usage-log.md`).

---

## References

| Reference | When to read |
|---|---|
| `references/protocol.md` | Protocol specification `2026-07-28`, backwards compatibility, error codes |
| `references/tool-contract.md` | Tool schema definitions, scope mapping, output structures, cut notice pagination |
| `references/auth-modes.md` | Four auth modes, selection matrix, CIMD/DCR, PKCE, error semantics, loopback |
| `references/permissions.md` | Three-layer permissions, ceiling modes deny/allow, effectiveScopes, RLS vs helper |
| `references/runtime-supabase.md` | Edge Functions, `verify_jwt = false`, user session, dual audience |
| `references/runtime-proxy.md` | Closed routes allowlist, headers filtering, Deno and Worker proxy |
| `references/runtime-cloudflare.md` | Worker + D1 + R2 + KV, `createMcpHandler`, tenant isolation helper |
| `references/access-screens.md` | User ceiling administration, consent modal, my connections, audit history |
| `references/usage-log.md` | Audit trail schema, argument redaction, error references, purge retention |
| `references/testing.md` | Testing strategy, test layers, matrix derivation, burst tests, fixture hygiene |
| `references/clients.md` | Client configuration (Claude Code, claude.ai, ChatGPT, Codex, Antigravity) |
| `references/lessons.md` | Production incidents, root cause analysis, anti-patterns, fixes |

---

## Templates

| Template | What to copy | What to adapt |
|---|---|---|
| `templates/js/permissions.mjs` | Ceiling logic, scope catalog, effectiveScopes | Project domain list and default ceiling mode |
| `templates/js/usage-log.mjs` | Argument redaction, result summarizer, log builder | Sensitive key words list |
| `templates/js/tool-contract.mjs` | defineTool, scopeMap, toListEntry, cutNotice | Tool definitions and input schemas |
| `templates/js/proxy-routes.mjs` | Closed routing table, header filtering | Upstream target URLs |
| `templates/sql/mcp_core.sql` | Postgres schema, RLS setup, security definer RPCs | fn_mcp_is_admin() and domain seed rows |
| `templates/d1/mcp_core.sql` | SQLite/D1 schema for Cloudflare Workers | Domain seed rows |
