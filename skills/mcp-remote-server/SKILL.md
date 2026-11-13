---
name: mcp-remote-server
description: "Builds a remote MCP server with per-user read/write permissions, an access admin screen and a usage log, on Supabase Edge Functions, a closed proxy, or Cloudflare Workers; optionally republishes another MCP server's tools by relay."
argument-hint: "[supabase|proxy|cloudflare] <what the server must expose>"
use-when:
  - building a remote MCP server that several users of an existing app will connect to
  - exposing Supabase data to AI clients with per-user read/write limits
  - building an MCP server on Cloudflare Workers with D1, R2 or KV
  - putting a stable custom domain in front of an MCP server hosted elsewhere
  - adding an access admin screen or a usage log to an existing MCP server
  - requiring a human to confirm sensitive MCP tool calls (money, deletes, publishing) outside the chat
  - making one MCP server republish the tools of another MCP server (aggregator by relay)
  - exposing a large relayed catalog on demand (tool search plus dispatcher) or as per-profile subsets
do-not-use-for:
  - a local stdio MCP server or a single-user tool wrapper
  - connecting a client to an existing MCP server
  - auditing the MCP configuration of a client
  - a Cloudflare Worker that is not an MCP server
metadata:
  version: "1.3.0"
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
- **Joining host and origin data in one answer** - that is a host tool that calls the other system inside, not a relay (see `references/aggregator-relay.md`, section 1).

---

## Before any code - ask, do not assume

Steps 1 to 3 are the user's decisions, not yours. Read the request: for each of runtime, auth mode and
ceiling mode that it does not state, ask the user in one message, listing the options from the tables below
with one line on the trade-off, and stop. Do not create a file, a migration or a template copy until the
three answers are in. A safe-looking default (such as `deny`) is still a decision the user did not make.

The sensitive-tool list (class A, B, C), where the user confirms (host-app page or chat) and the second-factor
policy (code window per class, what happens to users without a factor) are also the owner's decisions. Propose the recommended list from
`references/confirmation.md`, mark it reviewable, and do not treat it as blocking.

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

## Step 3b - Aggregator (only when asked)

Skip unless the server must republish another MCP server's tools. Then the user decides, in the same
question as Steps 1 to 3: which origin, relay variant or action-catalog variant, which host domain
name carries it, and the exposure mode (`full` by default, `selected` or `discovery`; see
`references/aggregator-discovery.md`, section 2). Read `references/aggregator-relay.md` before the schema
step. Without an explicit request, do not add an origin domain, an external accounts table or a connect
tool, and keep `full`. Profiles, a circuit breaker and several origins
(`references/aggregator-composition.md`) come only when the user shows the need.

---

## Step 4 - Build in this order

1. **Schema and RPCs** - create the `mcp_*` tables, functions and policies from the SQL template.
2. **Pure modules** - copy the `.mjs` templates and adapt the domain list and ceiling mode.
3. **Authorization server** - wire the chosen auth mode; generate token, refresh and revoke endpoints.
4. **MCP resource** - implement `server/discover`, `tools/list` and `tools/call` using the tool contract; write `instructions` as a guide (see `references/tool-contract.md`, section 7).
5. **Confirmation gate** - classify every write tool (A/B/C) with the owner, create the pending-action table and functions, put the gate between scope checks and the handler, add previews (see `references/confirmation.md`).
6. **Access screens** - admin ceiling view, connection list, consent page, confirmation page, usage history.
7. **Usage log and retention** - enable the log insert after every `tools/call` outcome (pending and executed calls share `confirmation_id`); schedule purge, including pending rows.
8. **Tests** - unit tests with injected I/O, SQL smoke, content guards (classification parity, gate-before-handler, catalog snapshot), burst test (local only).
9. **Clients** - configure each client to the three-level proof standard; after publishing, refresh each client's tool list.

Release through the pipeline in `references/deploy.md`: migrations before code, then smoke.

Aggregator (Step 3b only): build it after step 7 and before step 8. Order inside it: origin domain in
the ceiling, external account tables and encryption, connect flow, pure republish modules, dispatcher,
then the `tools/list` and `tools/call` wiring. The static tool path must stay unchanged and keep passing
the existing tests (see `references/aggregator-relay.md`, section 13). A mode other than `full` comes
last: snapshot `tools/list` in `full` first, then add the exposure choice, the search tool and the
dispatcher on top of the same call pipeline, and measure the modes before picking one (see
`references/aggregator-discovery.md`, section 8).

---

## Non-negotiables

- **N-01** Auth, `Origin` header check and kill switch run before the request body is parsed (see `references/protocol.md`).
- **N-02** Tool scope is declared in the tool definition; the scope map is derived, never hand-written; a parity test locks the two in sync (see `references/tool-contract.md`).
- **N-03** A truncated list always includes a `notice` with `cut_at` and the name of the full-list tool; silent truncation is forbidden (see `references/tool-contract.md`).
- **N-04** A sensitive tool (every write the product owner classifies as A or B) never executes on the first call: it returns a preview and a confirmation id. It runs exactly once, only after the owning user confirms, and the confirmation is bound to the user, connection, tool and argument hash. Where the user confirms is the owner's choice: a host-app page with a recent second factor (default) or the chat as a server-enforced two-step (`references/confirmation.md`, section 16, risk recorded). The client's "always allow" never replaces it; read tools never need it (see `references/confirmation.md`).
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
- **N-15** (Aggregator) The relayed call uses the person's own credential at the origin, never a service credential; the host ceiling domain for the origin is required before the origin is contacted (see `references/aggregator-relay.md`, section 5).
- **N-16** (Aggregator) Tool class comes from the origin's annotations and is sticky per tenant; a destructive tool is born off and released per person for the pair name + signature hash, which lapses when the tool changes (see `references/aggregator-relay.md`, section 4).
- **N-17** (Aggregator) Cache only the raw catalog (5 minutes); classification, ceiling and releases are read on every request; a destructive tool re-reads the catalog without cache before the call (see `references/aggregator-relay.md`, section 7).
- **N-18** (Aggregator) One deadline from arrival covers every step of a relayed call; an unreachable origin removes only its tools; origin errors are translated and scrubbed of secrets before reaching the model (see `references/aggregator-relay.md`, section 8).
- **N-19** (Aggregator) Origin tokens are stored encrypted with a purpose-bound AAD, refreshed under a per-person lock, and written before being used; the connect `state` is a single-use opaque nonce stored hashed (see `references/aggregator-relay.md`, section 6).
- **N-20** (Aggregator) Every outcome of a relayed call writes exactly one usage-log row with the same fields as a static tool (extends N-14; see `references/aggregator-relay.md`, section 8.6).
- **N-21** Every entry point that runs tools (MCP endpoint, REST side doors, chat bots, queue consumers) goes through one preflight and one call pipeline: per-call access re-check, kill switch, rate limit, effective scope as token ∩ current ceiling, confirmation gate, log row (see `references/permissions.md`, sections 5 and 11).

- **N-22** (Aggregator) No exposure mode (`full`, `selected`, `discovery`) or profile widens what the person may run: the exposed set is a subset of the allowed set, and mode and profile come from server-side configuration, never from model input (see `references/aggregator-discovery.md`, section 2).
- **N-23** (Aggregator) A call through the dispatcher (`relay_tool_call`) runs the same pipeline as a direct call of the concrete tool: scope, classification, release, confirmation bound to the concrete tool and argument hash, deadline, and one log row as that tool (see `references/aggregator-discovery.md`, section 5).
- **N-24** (Aggregator) A published name, a `tool_ref`, a search result, a profile entry or a cached schema is never a credential; every call resolves the reference and reads authority at call time (see `references/aggregator-discovery.md`, section 6).
- **N-25** (Aggregator) A catalog change, a reclassification, a rename or an origin outage never relaxes permissions, releases or isolation between people and tenants; a composed catalog is never served across identities (see `references/aggregator-composition.md`, sections 2 to 4).

N-15 to N-20 and N-22 to N-25 apply only when Step 3b is chosen.

---

## Recommended practices

Judgment calls, not defaults: propose them to the owner, apply when they fit.

- **Idle connection expiry** - revoke connections unused for N days (7 to 14, a per-tenant setting) by a daily job (see `references/auth-modes.md`, section 10).
- **Rate limits that brake** - an atomic cap well above real use that answers "wait N seconds", plus a lower counter for calls that notify third parties (see `references/tool-contract.md`, section 16).
- **Private files** - stored attachments keep a path; screens and tools sign a short read link when showing them (see `references/tool-contract.md`, section 12).
- **Server prompts** - ship `prompts` as scripted playbooks for tasks models keep getting wrong (see `references/protocol.md`, section 7).
- **Test-data filter** - when the app has test records, every list or summary tool takes an `environment` enum defaulting to production (see `references/tool-contract.md`, section 9).
- **Silent by default** - a tool that can notify third parties stays silent unless the caller passes an explicit flag (see `references/tool-contract.md`, section 4).
- **Deep links** - every record in a result carries a `url` to the screen showing it (see `references/tool-contract.md`, section 9).
- **Check, then apply** - two-phase bulk changes, read-only audience simulation, reversible deletes with a restore tool (see `references/tool-contract.md`, section 10).
- **Protected records** - a first-line guard in every write tool for records an assistant must never change (see `references/permissions.md`, section 10).
- **Actor attribution** - pass origin, client name and connection id to the database so the app's own history shows who acted (see `references/usage-log.md`, section 9).

---

## References

| Reference | When to read |
|---|---|
| `references/protocol.md` | Protocol specification `2026-07-28`, backwards compatibility, error codes, request deadline, prompts |
| `references/tool-contract.md` | Tool schema definitions, scope mapping, output structures, cut notice pagination, egress, uploads, output shaping, metered tools, idempotency, rate limits that brake |
| `references/confirmation.md` | Mandatory human confirmation for sensitive tools: classes, pending-action record, flow, previews, second factor, replay protection, tests, in-chat variant |
| `references/auth-modes.md` | Four auth modes, selection matrix, CIMD/DCR, PKCE, error semantics, loopback, PAT checklist, idle expiry, second authorization at an origin |
| `references/permissions.md` | Three-layer permissions, ceiling modes deny/allow, exact scope matching, effectiveScopes, entry points, RLS vs helper, origin domains, role gates, per-call access re-check |
| `references/runtime-supabase.md` | Edge Functions, `verify_jwt = false`, user session, dual audience, deploy order |
| `references/runtime-proxy.md` | Closed routes allowlist, headers filtering, Deno and Worker proxy |
| `references/runtime-cloudflare.md` | Worker + D1 + R2 + KV, `createMcpHandler`, tenant isolation helper, OAuth state in KV vs D1, rate-limit binding, platform flags, queues |
| `references/access-screens.md` | User ceiling administration, consent page, my connections, confirmation page, allow/remove/block, audit history |
| `references/usage-log.md` | Audit trail schema, argument redaction, error references, observability, purge retention |
| `references/testing.md` | Testing strategy, test layers, matrix derivation, catalog contract tests, guard proofs through the real route, burst tests, fixture hygiene |
| `references/clients.md` | Client configuration (Claude Code, claude.ai, ChatGPT, Codex, Antigravity), tool-list refresh |
| `references/deploy.md` | Pipeline order, smoke checks, expansion-only migrations, credentials and bootstrap |
| `references/lessons.md` | Production incidents, root cause analysis, anti-patterns, fixes |
| `references/aggregator-relay.md` | Republishing another MCP's tools by relay: prefixing, classification, destructive release, per-person OAuth to the origin, token refresh, timeouts, error translation, attachments, action-catalog variant |
| `references/aggregator-discovery.md` | Exposure modes `full`/`selected`/`discovery`, tool search versus data search, `relay_tools_search`, `relay_tool_call` dispatcher, `tool_ref`, confirmation through the dispatcher, measuring the modes |
| `references/aggregator-composition.md` | Profiles as virtual catalogs, three cache layers, per-origin circuit breaker, naming registry and aliases, several origins, resources and prompts |

---

## Templates

| Template | What to copy | What to adapt |
|---|---|---|
| `templates/js/permissions.mjs` | Ceiling logic, scope catalog, effectiveScopes | Project domain list and default ceiling mode |
| `templates/js/usage-log.mjs` | Argument redaction, result summarizer, log builder | Sensitive key words list |
| `templates/js/tool-contract.mjs` | defineTool, scopeMap, toListEntry, cutNotice, pending output shape | Tool definitions, input schemas, sensitivity per write tool |
| `templates/js/confirmation.mjs` | Canonical JSON, argument hash, class per call, pending result, gate | Class map, conditional classes, injected consume/create |
| `templates/js/aggregator-discovery.mjs` | Exposure choice, `tool_ref` format, registry with collision skip, tokenizer, deterministic ranking with truncation notice | Score weights, stop words, result cap |
| `templates/js/aggregator-policy.mjs` | Dispatcher bridge into the existing pipeline, dispatcher pending text, per-origin circuit breaker | Injected `runPipeline` and `refuse`, breaker threshold and cooldown |
| `templates/js/proxy-routes.mjs` | Closed routing table, header filtering | Upstream target URLs |
| `templates/sql/mcp_core.sql` | Postgres schema, RLS setup, security definer RPCs | fn_mcp_is_admin() and domain seed rows |
| `templates/sql/mcp_core.sql` (confirmation block) | `mcp_confirmations`, create/consume/read/decide functions | Class list, windows, second-factor claim check, delegated-session check |
| `templates/d1/mcp_core.sql` | SQLite/D1 schema for Cloudflare Workers, confirmation table and consume statement | Domain seed rows; read/decide live in the host app's backend |
