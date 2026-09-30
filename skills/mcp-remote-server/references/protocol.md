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
