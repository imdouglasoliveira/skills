# Three-Layer Permissions and Ceiling Architecture

This reference outlines the authorization model for remote MCP servers using `../templates/js/permissions.mjs` and `../templates/sql/mcp_core.sql`.

---

## 1. The Three Layers of Permission (N-07)

Permissions are enforced through three distinct defense-in-depth layers:
1. **Tenant kill switch**: A global setting (`mcp_settings.enabled`) that enables or disables MCP access across the entire organization or instance.
2. **Per-user domain ceiling**: Administrator-configured upper bounds (`mcp_user_ceiling`) defining the maximum level of access (`none`, `read`, `write`) a user may ever exercise within each functional domain.
3. **Per-token scope**: Scopes requested during authorization and granted to a specific client token (`mcp_oauth_tokens.scopes` or `mcp_pats.scopes`).

---

## 2. Ceiling Modes: Deny vs Allow

Every deployment configures one project-wide ceiling mode in `mcp_settings.ceiling_mode`:

| Mode | Semantics when user has no row for domain |
|---|---|
| **`deny`** | When there is no row in the ceiling table for a domain, the effective permission defaults to `none` (zero access). |
| **`allow`** | When there is no row in the ceiling table for a domain, the effective permission defaults to full `write` access; ceiling rows only serve to restrict access. |

---

## 3. Effective Scopes Recalculated Every Request (N-08)

The effective scope is not fixed at login or token issuance time. Instead, it is recalculated dynamically on every request:
$$\text{effective} = \text{token scopes} \cap \text{current ceiling}$$
Because this calculation runs on every request, an administrator lowering a user's ceiling cuts their access immediately on the very next tool call without waiting for token expiry.

A connection record stores the union of all active token scopes, while scopes remain scoped per token.

---

## 4. Scope Hierarchy: Write Implies Read on the Ceiling Only

One rule, used by list, call and generic search alike:
- **Ceiling side**: a ceiling of `write` grants both `<domain>:read` and `<domain>:write` (`ceilingScopes()`).
- **Token side**: matching is exact. Each tool declares exactly one scope, and the token must carry that scope itself; a token holding only `<domain>:write` does not satisfy a `<domain>:read` tool. `allowedTools()` and `requireScope()` both use exact membership.
- **Consent**: when the user approves write for a domain, grant the read scope with it, so exact matching never locks a writer out of reads.

Exact matching is the safer rule: a scope means one thing everywhere. If a project instead lets write satisfy read, it must do so in one helper used by list, call and search, with a parity test; two places disagreeing is how a tool shows up in one list and fails in another.

---

## 5. Three Points of Enforcement

Permissions are checked at three mandatory stages:
1. **Catalog filtering (`tools/list`)**: Tools that the caller lacks permission to use are excluded from the discovery list via `allowedTools()`.
2. **Pre-call guard (`tools/call`)**: Before executing any handler, the router validates that the effective scopes cover the tool's required scope, refusing calls early with an informative error.
3. **In-tool assertions**: Each individual tool function explicitly calls `requireScope(effective, required)` before reading or modifying domain resources.

Two cases need the in-tool check to look beyond the tool's own scope:
- **Destination domain**: a tool whose effect lands in another domain (promote, convert, link, copy) also checks the destination's write scope, recomputed as token ∩ current ceiling.
- **Generic tools** (`search`, `fetch`, summaries, metrics) filter per record type by the caller's read scope for that type; otherwise they become a side channel around scope.

**Every entry point runs the same pipeline (N-21).** The MCP endpoint, REST side doors (upload routes), a chat bot and a queue consumer all call one preflight and one call function: still-allowed check (section 11), kill switch, rate limit, effective scope (token ∩ current ceiling, never the raw token scope), confirmation gate for sensitive tools, run, log row. A door that checks only the token scope ignores a lowered ceiling. Test each door with a refusal row per outcome and prove the limiter is consulted exactly once per call.

---

## 6. Runtime Enforcement Strategy (N-09)

The mechanism for isolating business data depends on the runtime environment:

### Supabase Runtime
- Business data must be read using the user's own JWT token so that database Row Level Security (RLS) policies apply directly.
- The `service role` key is strictly forbidden for business queries and must only be used in internal plumbing operations (token generation, audit logging, admin management RPCs).

### Cloudflare Runtime
- Cloudflare D1 does not provide native RLS policies.
- Therefore, all data operations must pass through an abstraction helper that strictly requires `tenant_id` and `user_id` on every query, accompanied by automated tenant isolation test suites.

---

## 7. Progressive Domain Exposure

Write access should be released domain by domain in controlled phases. In the database, domain keys are restricted by an explicit `CHECK` constraint matching the enumeration maintained in the application codebase.

---

## 8. Confirmation Is Not a Permission Layer

The three layers decide whether a call may run at all. Confirmation (`confirmation.md`) decides whether this specific call has been approved by the human, each time. Passing the three layers is necessary and never sufficient for a sensitive tool.

---

## 9. Origin Domains for an Aggregator

When the server republishes another MCP's tools (see `aggregator-relay.md`), the origin gets its own
ceiling domain, `none` by default regardless of the ceiling mode. Generic tools that appear to anyone
with read in any domain (such as search and fetch) compute "any read" over the host's own domains only;
otherwise holding the origin domain alone exposes host data. Lowering the origin domain below write
deletes the person's destructive-tool releases; setting it to `none` also disconnects the external
account. The token scope for the new domain appears only after the person re-consents or uses the adjust
screen.

---

## 10. Role Gates and Protected Records

- **Role gate**: an admin-only tool checks the user's role from the user record in addition to the scope, and re-checks scope inside the tool even though `tools/list` already filtered it.
- **Protected records** (recommended): keep a guard for records an assistant must never change (real customers, production tenants, reference data). Mark them by flag and by a fixed id list, since flags drift; call the guard as the first line of every write tool, before any work; test both paths.

---

## 11. Per-Call Access Re-Check

Re-check "may this person still use the server" (allowlist and blocklist, see `access-screens.md`, section 9) on every call, for OAuth and PAT alike, so a change made by any path (admin screen, script, direct database edit) takes effect on the next call. It is a separate step before the effective-scope calculation, and a read failure denies.
