# Production Lessons and Anti-Patterns

This reference compiles critical architectural lessons, operational incidents, and anti-patterns encountered across remote MCP deployments.

---

## Lessons Summary

| Problem | Root Cause | Fix | Where It Bites |
|---|---|---|---|
| Scope map drift | Maintaining tool scopes in a separate hand-written dictionary caused permissions to fall out of sync with tools. | Derive the scope map automatically from tool definitions using `scopeMap()` and lock with a parity test. | Tools/call authorization checks |
| Premature request rejection | Edge gateway rejected incoming OAuth or PAT tokens before reaching function code because gateway expected Supabase Auth JWTs. | Configure `verify_jwt = false` in gateway config and perform authentication inside handler code. | Supabase Edge Functions |
| Path routing failure | Edge runtime stripped `/functions/v1/` prefix on some environments while preserving it on others. | Accept both prefixed and root pathnames in the HTTP router. | Edge Function URL routing |
| Resource URL rejection | OAuth clients failed authorization because the `resource` parameter differed by a trailing slash. | Strip trailing slashes and perform strict byte-for-byte audience matching in `/authorize` and `/token`. | OAuth 2.1 discovery and token exchange |
| Misleading 401 error | Database query failure returned HTTP 401 `invalid_client` instead of HTTP 500 `server_error`, causing clients to discard valid credentials. | Differentiate credential mismatches (401) from database exceptions (500). | Token endpoint error handling |
| Sensitive credentials in logs | Storing raw JSON arguments exposed user passwords, tokens, and documents in audit logs. | Filter arguments through `redactArgs()` to mask sensitive keys before insertion. | Request audit logging |
| Log storage exhaustion | High-volume tool calls caused the audit log table to consume gigabytes of storage without bounds. | Implement scheduled purge (`fn_mcp_purge`) via cron to expunge logs older than the retention window. | Long-term operational maintenance |
| Untracked ceiling changes | Operators could not identify who modified user domain ceilings when diagnosing unauthorized access. | Track every modification in `mcp_user_ceiling_history` recording who, when, from_level, and to_level. | Access administration audit |
| Silent result truncation | Truncating query results without notifying the AI model caused agents to assume incomplete lists represented total counts. | Return an explicit `notice` object with `cut_at` and pointer to the full-list pagination tool. | List queries and data retrieval |
| Unauthorized ceiling read | Management RPCs checked session presence but omitted role verification, allowing any authenticated user to view company ceilings. | Call `fn_mcp_is_admin()` inside all `rpc_mcp_admin_*` functions to enforce administrative role. | Admin procedure calls |
| PAT client OAuth confusion | Returning 401 with OAuth discovery challenge headers caused headless PAT clients to attempt interactive browser flows. | Tailor 401 response challenge headers and workarounds based on client user-agent. | CLI and headless integrations |
| Accidental static repo publish | Deno Deploy build misconfiguration published the repository root as static assets rather than executing backend code. | Deploy automated leak probes requesting private files to verify static serving is disabled. | Deno Deploy hosting |
| Cross-tenant data leakage | Cloudflare D1 does not offer native RLS, allowing queries that omit tenant filters to access records across tenants. | Route all database queries through an abstraction helper requiring explicit `tenant_id` and `user_id`. | Cloudflare Workers + D1 |
| Burst session invalidation | Concurrent tool calls from the same user generated multiple magic links simultaneously, invalidating each other. | Implement encrypted session token reuse with an in-memory or database mutex lock per user. | Parallel AI agent execution |
| Security bypass via service role | Querying business tables with the database service role bypassed Row Level Security policies entirely. | Execute business data queries strictly using the user's authenticated context JWT. | Supabase database access |
| Accidental destructive mutation | Autonomous AI agents executed permanent deletion commands when exploring tools without human intervention. | Require a literal `confirm` parameter in destructive tool schemas, validated prior to any execution. | Destructive tool handlers |
| False positive unit tests | Mocks masked schema column renames and SQL syntax bugs, allowing broken migrations into staging. | Supplement mocks with real SQL migration smoke tests verifying actual column and RLS existence. | Pre-deployment verification |
| Error detail erasure | External SDK helper `functions.invoke` cleared response `data` to null on non-2xx status codes, hiding error details. | Read the `error` object or use native `fetch` to capture structured JSON error payloads. | Client integration testing |
| Refresh token hijack | Compromised refresh tokens allowed attackers to maintain persistent access after user password changes. | Implement single-use refresh token rotation and revoke the entire token family upon token reuse. | OAuth session persistence |
| In-band logging deprecation | Protocol specification 2026-07-28 deprecated MCP in-band logging notifications, breaking legacy handlers. | Direct operational logs to custom audit tables or OpenTelemetry instead of in-band MCP protocol channels. | Protocol conformance |
