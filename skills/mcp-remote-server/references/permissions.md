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

## 4. Scope Hierarchy: Write Implies Read

Access levels follow a strict hierarchical containment:
- `write` implies `read`: Granting `<domain>:write` automatically satisfies requirements for `<domain>:read`.
- A tool requesting read access will execute if the effective scopes include either `<domain>:read` or `<domain>:write`.

---

## 5. Three Points of Enforcement

Permissions are checked at three mandatory stages:
1. **Catalog filtering (`tools/list`)**: Tools that the caller lacks permission to use are excluded from the discovery list via `allowedTools()`.
2. **Pre-call guard (`tools/call`)**: Before executing any handler, the router validates that the effective scopes cover the tool's required scope, refusing calls early with an informative error.
3. **In-tool assertions**: Each individual tool function explicitly calls `requireScope(effective, required)` before reading or modifying domain resources.

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
