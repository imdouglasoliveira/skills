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
- **Execution Metrics**: `duration_ms` (measuring execution duration), `ok` (boolean status), and `error` string.
- **Payload Inspection**: `args_redacted` (JSON) and `result_summary` (JSON).

---

## 3. Redaction and Result Summaries

Protecting sensitive customer data and credentials in logs is paramount:
- **Argument Redaction**: Tool arguments are filtered via `redactArgs()`. Any argument whose key matches sensitive keywords (email, password, secret, token) has its value replaced with `[redacted]`.
- **Result Summaries**: Output payloads are condensed via `summarizeResult()`. The summary stores only top-level object keys and array length (`items`), never values.
- **Read Isolation**: The admin log viewing procedure `rpc_mcp_admin_usage` never returns raw or redacted arguments to UI callers; it exposes only operational columns.

---

## 4. Traceable Error References

When an unhandled exception or internal error occurs:
- The server generates an opaque identifier `(ref N)` linking the client-facing error message to the database record.
- The user or AI agent receives: `"Internal server error (ref 12345)"`.
- Operators look up the exact stack trace and redacted context in `mcp_request_log` by primary key `id`.

---

## 5. Built-in Rate Limiting via Usage Log

Rate limits can be calculated directly by querying recent entries in `mcp_request_log`:
- Count invocations by `(user_id, tool)` within a sliding window before executing expensive backend operations.
- When the threshold is exceeded, return HTTP 429 with standard `Retry-After` headers and record a refusal row in the log.

---

## 6. Retention Policies and Expunging (`fn_mcp_purge`)

Unchecked audit logs create storage bottlenecks and compliance risks:
- Configure a project retention window (e.g. 30, 60, or 90 days).
- Automate periodic cleanup via `pg_cron` (in Supabase Postgres) or a scheduled Cron Trigger (in Cloudflare Workers).
- The scheduled purge invokes `fn_mcp_purge(p_days)`, deleting expired rows from `mcp_request_log`, `mcp_oauth_tokens`, `mcp_oauth_codes`, and `mcp_oauth_requests`.

---

## 7. State Interpretation: Write and Ok

In reporting dashboards:
- A write mutation actually occurred only when `write && ok` evaluates to true.
- If a tool with `write = true` is refused due to scope or error, the row records `write=true` and `ok=false`, proving that no actual database mutation took place.
