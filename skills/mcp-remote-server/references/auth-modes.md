# Authentication Modes and OAuth Strategy

This reference details the four authentication modes supported for remote MCP servers and provides the selection matrix across runtimes and client types.

---

## 1. Selection Matrix

| Mode | Runtime | Client Type | When to Choose |
|---|---|---|---|
| **Own OAuth 2.1 server** | Supabase direct, Supabase + proxy, Cloudflare Workers | Desktop and CLI OAuth clients (Claude Code, ChatGPT Desktop) | You need complete control over token expiration, consent UI, and client registration. |
| **Supabase Auth OAuth 2.1 Server** | Supabase direct, Supabase + proxy | Standard OAuth 2.1 clients supporting RFC 8414 | Built-in Supabase Auth server using `withOAuthProtectedResource` and `withSupabase`. |
| **Personal Access Token (PAT)** | Supabase direct, Supabase + proxy, Cloudflare Workers | CLI clients, developer integrations, headless environments (Codex, Antigravity) | Static token bearer auth where interactive OAuth flow is unfeasible. |
| **`workers-oauth-provider`** | Cloudflare Workers | Web AI clients (claude.ai) | Turnkey OAuth server embedded into the Worker edge lifecycle. |

---

## 2. Client Registration: CIMD vs DCR

Client ID Metadata Documents (CIMD) are the preferred registration mechanism. Dynamic Client Registration (DCR) is maintained solely as a deprecated fallback for older tooling. When supporting DCR, the server must validate the client's `application_type` (e.g. `web` or `native`).

---

## 3. PKCE and Issuer Validation

- All authorization code flows require PKCE with code challenge method `S256`. Plain text challenges must be rejected.
- To prevent authorization code injection and mix-up attacks according to RFC 9207, the authorization response must include the parameter `iss` matching the authorization server issuer URL.

---

## 4. Resource Parameter and Audience (N-05)

The `resource` parameter indicates the target protected resource:
- It must be verified during `/authorize` and re-verified during `/token`.
- Matching must be strict byte-for-byte, specifically ensuring no trailing slash discrepancies between the client request and server configuration.
- The granted `audience` must be recorded in the token store and validated on every MCP resource call.

---

## 5. Token Endpoint Error Semantics (N-06)

The `/token` endpoint must validate the client record before attempting to look up the authorization code:
- If client credentials fail, return HTTP 401 with `invalid_client` error code only if the client genuinely does not exist or credentials mismatch.
- A database query failure, network timeout, or transient storage error must return HTTP 500 with `server_error`, never a 401.

---

## 6. Token Lifecycle: Rotation and Hashes

- **Refresh token rotation**: Issuing a new access token via refresh token must invalidate the used refresh token and issue a new one. If an invalidated refresh token is presented, the entire family of tokens associated with that session must be revoked immediately.
- **Clients with several sessions**: a desktop app, a CLI and parallel agents of the same client can share one refresh token. With strict single use, the second session presents a refresh the first already rotated and the family is revoked: people get disconnected every hour. Choose on purpose: a short grace window (seconds) in which the previous refresh still answers, with family revocation only after it; or, as an owner decision with the risk written down, keep the used refresh valid until it expires (a stolen refresh then lives until expiry). Either way keep a bounded refresh lifetime and idle expiry (section 10) as the backstop.
- **Hash storage**: Authorization codes and tokens must never be persisted in plain text; store only cryptographic hashes (SHA-256) in the database.

---

## 7. Loopback Redirect URIs

For native and CLI clients using loopback addresses (such as `http://127.0.0.1` or `http://[::1]`), the redirect URI port must be ignored during matching, as ephemeral ports are assigned at runtime.

---

## 8. Personal Access Tokens (PAT)

- Every PAT must have a mandatory expiration period between 1 and 365 days.
- The raw token string is shown exactly once upon creation and only the hash is preserved in storage.
- It is recommended to issue at most one PAT per client or device integration.
- **Visible prefix**: tokens start with a fixed prefix, so secret scanners find leaks and a wrong prefix is rejected before any database access.
- **Mint rules**: only an interactive OAuth session can mint a PAT (a PAT cannot create children that outlive its own revocation). Requested scopes must be inside the user's current ceiling and inside the catalog.
- **Audit**: the creation audit row is written in the same transaction or batch, without token or hash.
- **Last used**: record `last_used_at` (throttled, see `usage-log.md`, section 3) and show it in the list; the list never shows the token.
- **Optional narrowing** (project or tenant list): a nullable column where null keeps the normal behavior and an unreadable value restricts to nothing (fail closed). Clip at request time, so an edited row cannot widen it.
- Accept PATs through the same route and audience as OAuth tokens. Closing proof: create, list (last used, no token), revoke, then 401.

---

## 9. Challenge Headers and Client Pitfalls

- When responding to unauthenticated requests, send HTTP 401 with:
  `WWW-Authenticate: Bearer resource_metadata="<url>", scope="<scopes>"`
- When scopes are insufficient for the whole request or endpoint, send HTTP 403 with `error="insufficient_scope"`. A single tool refused inside `tools/call` is a tool result with `isError: true`, not a 403 (see `tool-contract.md`, section 6).
- Warning: An HTTP 401 that advertises OAuth metadata may prompt a PAT client to mistakenly attempt an OAuth discovery handshake. See `clients.md` for client-specific headers and workarounds.

---

## 10. Idle Connection Expiry (recommended)

A refresh token keeps a forgotten connection alive forever: a client left plugged in for months still holds a valid grant. Expire connections that nobody uses. This is a recommendation, not a default; the owner picks the window (7 to 14 days: a weekly user never notices, someone back from a trip still has access, an abandoned client loses access). Make the window a per-tenant setting, not a constant.

| Decision | Recommendation |
|---|---|
| Liveness signal | `greatest(coalesce(max(last_used_at) over the connection's tokens, created_at), updated_at)`. `last_used_at` is written on `tools/call` (a throttled write is enough); `updated_at` covers a re-authorization that reuses the old connection row. Using only `created_at` or only one token revokes connections in active use. Add both columns if your schema lacks them. |
| Window | A parameter (`p_days`, default 7), not a constant in the query. |
| Effect | Same as the user's own "Remove": set `revoked_at` on the connection and on every live token. Refresh must fail after that. |
| Stored delegated session | Delete it only when the user is left with no active connection; another live connection may still use it. |
| Runner | A daily job (`pg_cron`, Worker cron trigger) calling a function granted only to the service role. Schedule it idempotently (unschedule then schedule by name). |
| Business data | Untouched. The job revokes access only; say so in one line in the migration (useful for privacy records). |
| User-facing | Show "last used" per connection in the connections screen (`access-screens.md`, section 3) and state the rule in the connect guide ("connections unused for N days are removed; reconnect to continue"). |
| Return | The job returns the count of revoked connections; log it. |

Tests: a connection used yesterday survives; one idle for N+1 days is revoked with all its tokens; a re-authorized old connection (fresh `updated_at`) survives; the stored session survives while another connection is active; mutating the liveness expression (drop `updated_at` or `max`) turns a test red.

Rollback: unschedule the job and drop the function. A revoked connection only comes back through a new authorization.

---

## 11. Second Authorization at an Origin

An aggregator is an OAuth client of the origin system, separate from the auth mode the host serves. Use a
confidential client, PKCE S256, an opaque single-use `state` stored hashed, a return page inside the host
app (not a function URL), and a step-up for people who have a factor. Details and token rotation rules:
`aggregator-relay.md`, section 6.
