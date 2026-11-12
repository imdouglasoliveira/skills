# Protocol Conformance (MCP Spec 2026-07-28)

This reference outlines protocol requirements for remote MCP servers under the `2026-07-28` specification, while maintaining backwards compatibility with legacy eras (`2025-11-25` and `2025-06-18`).

---

## 1. Conformance Checklist

| Requirement | 2026-07-28 Era | Legacy Eras (2025-11-25, 2025-06-18) |
|---|---|---|
| Target version | `2026-07-28`, serving also `2025-11-25` and `2025-06-18` via version negotiation | Legacy version headers |
| Discovery | `server/discover` endpoint is mandatory | `initialize` handshake endpoint |
| Protocol session | Stateless request/response model; no protocol session or `initialize` handshake | Stateful protocol session ID |
| Request headers | POST carries `Mcp-Method` and `Mcp-Name` headers | Method and name inside JSON-RPC body |
| Error codes | Renumbered standard codes: `-32020` (HeaderMismatch), `-32021` (MissingRequiredClientCapability), `-32022` (UnsupportedProtocolVersion) | Generic `-32600` / `-32601` |
| Result metadata | Every result carries `resultType`; lists carry `ttlMs` and `cacheScope`; `tools/list` returns items in deterministic order | Simple content array |
| Deprecated features | `Logging`, `Sampling` and `Roots` are deprecated; log entries go to the custom usage log or OpenTelemetry | In-band logging/sampling notifications |

---

## 2. Early Pipeline Execution (N-01)

Authentication, `Origin` header validation, and tenant kill switch checks must run before any request body parse occurs. Parsing unvalidated payloads exposes the server to denial-of-service and unauthenticated processing costs.

---

## 3. SDK vs Hand-Written Fallback

Using the official TypeScript SDK v2 (`@modelcontextprotocol/server`) with `createMcpHandler` allows handling both legacy and current protocol eras cleanly out of the box. If implementing hand-written JSON-RPC routing, the handler must adhere to this exact conformance list, enforcing the same header validation, error codes, and response structures.

---

## 4. Two Different Sessions

The concept of a protocol "session" in legacy specs is not the same as the user session stored in the database. A protocol session represents transport-level continuity between client and edge worker, whereas a user session tracks authenticated identity, tenant boundaries, and access ceiling rows in persistence.

---

## 5. Request Deadline

Compute one deadline when the request arrives and pass an abort signal derived from it to every database and upstream call. When it expires, return a retryable tool error tagged `timeout` (with `(ref N)`), not a platform 5xx. Keep the deadline below the client's wait and the platform limit. Give `tools/list` its own budget, and cache whatever is dynamic in it.

---

## 6. Conformance Details

- Accept a request without the protocol-version header. Echo the version the client **asked for**, never simply the newest you support. Read the version from the header, then `_meta`, then params; a version only in params that you do not support falls back to the legacy era.
- Wrap every result in one function that adds the era's metadata (`resultType`, `ttlMs`, `cacheScope`). A missing field can make a client connect and then reject `tools/list` entirely.
- CORS exposes `WWW-Authenticate` and `Retry-After`, and allows the `mcp-protocol-version` and `mcp-session-id` request headers.
- Notifications get 202 with no body. Answer `ping`.
- Cache the protected-resource metadata document briefly (minutes).
- Bump `serverInfo.version` whenever the catalog changes; announce `listChanged` only if you send the notification.

---

## 7. Server Prompts (recommended)

Ship `prompts` for tasks where models fail repeatedly (turning free text into records, analyzing a report, configuring something). A prompt takes few arguments and returns one message with numbered rules, each tied to a past failure; it is the script that stops the model filling gaps with invented values.

Advertise `capabilities.prompts` only when `prompts/list` and `prompts/get` both answer: announcing without answering breaks the client on its first call.

---

## 8. Elicitation and Confirmation

Stateless JSON-only servers cannot use `elicitation`, and some clients decline it automatically. Human confirmation of sensitive calls is done out of band (see `confirmation.md`, section 1).
