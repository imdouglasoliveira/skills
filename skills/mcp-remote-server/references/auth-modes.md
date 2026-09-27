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
- **Hash storage**: Authorization codes and tokens must never be persisted in plain text; store only cryptographic hashes (SHA-256) in the database.

---

## 7. Loopback Redirect URIs

For native and CLI clients using loopback addresses (such as `http://127.0.0.1` or `http://[::1]`), the redirect URI port must be ignored during matching, as ephemeral ports are assigned at runtime.

---

## 8. Personal Access Tokens (PAT)

- Every PAT must have a mandatory expiration period between 1 and 365 days.
- The raw token string is shown exactly once upon creation and only the hash is preserved in storage.
- It is recommended to issue at most one PAT per client or device integration.

---

## 9. Challenge Headers and Client Pitfalls

- When responding to unauthenticated requests, send HTTP 401 with:
  `WWW-Authenticate: Bearer resource_metadata="<url>", scope="<scopes>"`
- When scopes are insufficient, send HTTP 403 with `error="insufficient_scope"`.
- Warning: An HTTP 401 that advertises OAuth metadata may prompt a PAT client to mistakenly attempt an OAuth discovery handshake. See `clients.md` for client-specific headers and workarounds.
