# Usage Log and Retention Architecture

This reference defines the audit trail schema, redaction guarantees, error references, and data retention mechanics for remote MCP servers using `../templates/js/usage-log.mjs`.

---

## 1. Universal Outcome Logging (N-14)

A log record must be inserted for every outcome of a `tools/call` invocation:
- Successful tool completions.
- Refusals due to insufficient scope.
- Invocations blocked by rate limits.
- Failures caused by session or authentication timeouts.
Logging every outcome ensures complete operational visibility and security auditing.

---

## 2. Minimal Log Schema

The `mcp_request_log` table captures:
- **Identity & Timing**: `user_id`, `created_at`.
- **Request Metadata**: `origin` (`oauth` vs `pat`), `client`, `protocol`, `connection_id`, `token_id`.
- **Tool Details**: `tool` name, `write` flag, and `target` identifier.
- **Confirmation**: `confirmation_id` (nullable uuid) links the pending call and the executing call of a sensitive tool (see `confirmation.md`, section 10).
- **Execution Metrics**: `duration_ms` (measuring execution duration), `ok` (boolean status), and `error` string.
- **Payload Inspection**: `args_redacted` (JSON) and `result_summary` (JSON).

---

## 3. Redaction and Result Summaries

Protecting sensitive customer data and credentials in logs is paramount:
- **Argument Redaction**: Tool arguments are filtered via `redactArgs()`. Any argument whose key matches sensitive keywords (email, password, secret, token) has its value replaced with `[redacted]`.
- **Result Summaries**: Output payloads are condensed via `summarizeResult()`. The summary stores only top-level object keys and array length (`items`), never values.
- **Read Isolation**: The admin log viewing procedure `rpc_mcp_admin_usage` never returns raw or redacted arguments to UI callers; it exposes only operational columns.
- **Key matching**: compare keys case-insensitively with `_` and `-` removed, by substring; recurse into nested objects up to a depth cap, and redact whatever lies beyond it.
- **Values, not only keys**: mask personal identifiers found inside free text and numbers by pattern. Mask and truncate error strings before storing them.
- **Never break the call**: write the row after the response (the platform's after-response hook, such as `waitUntil`) and let a failed insert log a warning, never fail the tool.
- **Throttle "last used"**: update `last_used_at`/`last_seen` only when the stored value is older than about a minute (conditional upsert), to bound writes per call.
- **Retire unused tools**: a usage tool that returns per-tool call counts shows which tools nobody calls.

---

## 4. Traceable Error References

When an unhandled exception or internal error occurs:
- The server generates an opaque identifier `(ref N)` linking the client-facing error message to the database record.
- The user or AI agent receives: `"Internal server error (ref 12345)"`.
- Operators look up the exact stack trace and redacted context in `mcp_request_log` by primary key `id`.

**Defects versus refusals.** Send unexpected tool failures to the error tracker with tool name, step and tenant/user ids; never send business refusals (scope, rate limit, validation), or the tracker fills with expected noise.

**Session failure is never a 401.** A failure to open the user session or reach the database during `tools/call` is a tool error with `(ref N)`, not HTTP 401: clients read 401 as an expired token and discard working credentials, forcing the user to reconnect.

**Calls to other systems** made from inside a tool (error tracker, notification service) return a status per outcome, never throw into the tool, and never undo the main change.

---

## 5. Built-in Rate Limiting via Usage Log

Rate limits can be calculated directly by querying recent entries in `mcp_request_log`:
- Count invocations by `(user_id, tool)` or by `connection_id` within a sliding window **before** any expensive step (opening the user session, calling an upstream). The count is cheap; the session is what costs.
- When the threshold is exceeded, return HTTP 429 with standard `Retry-After` headers and record a refusal row in the log.
- The refusal message gives the wait time (never "0 seconds") and names the cheaper tool when one exists (an aggregate instead of repeated lists).
- Cap dynamic client registration globally per hour; it is unauthenticated.
- A native rate-limit binding (Cloudflare) is cheaper than counting rows; see `runtime-cloudflare.md`, section 5. Compute `Retry-After` from the window, never a constant, and state whether the unit is the HTTP request or the tool call.

---

## 6. Retention Policies and Expunging (`fn_mcp_purge`)

Unchecked audit logs create storage bottlenecks and compliance risks:
- Configure a project retention window (e.g. 30, 60, or 90 days).
- Automate periodic cleanup via `pg_cron` (in Supabase Postgres) or a scheduled Cron Trigger (in Cloudflare Workers).
- The scheduled purge invokes `fn_mcp_purge(p_days)`, deleting expired rows from `mcp_request_log`, `mcp_oauth_tokens`, `mcp_oauth_codes`, and `mcp_oauth_requests`, plus old `mcp_confirmations` rows (suggested 7 days) when the confirmation gate is used.

---

## 7. State Interpretation: Write and Ok

In reporting dashboards:
- A write mutation actually occurred only when `write && ok` evaluates to true.
- If a tool with `write = true` is refused due to scope or error, the row records `write=true` and `ok=false`, proving that no actual database mutation took place.
- A call that only returns a confirmation link logs `write = false, ok = true`; the executing call logs `write = true` with the same `confirmation_id`. Refusals of an execution attempt (pending, refused, expired, mismatch, revoked, changed) log `write = true, ok = false`.

---

## 8. Relayed Calls

A relayed call (see `aggregator-relay.md`) writes exactly one row per outcome, with the same columns as a
static tool and the connection id of the request, so the per-minute rate cap of section 5 counts it. The
error column carries a machine code such as `origin:http_403` or `origin:timeout`; the model receives only
the translated sentence plus `(ref N)`. The row is written after the call deadline with its own short
timeout, and a failed write is logged by code only.

---

## 9. Actor Attribution in the App's Own History (recommended)

The MCP log says what the assistant did; the app's own edit history usually does not. Pass origin, client name and connection id to the database on the user-session client (request headers read by a trigger, or session settings), so the app's history shows "changed by this person through this assistant". Send those headers only from the server, not from the browser app, where they can trigger extra CORS preflights.
