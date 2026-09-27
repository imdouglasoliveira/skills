# Supabase Runtime Implementation Guide

This reference explains how to build a remote MCP server hosted on Supabase Edge Functions using `../templates/sql/mcp_core.sql`.

---

## 1. Edge Function Configuration (N-10)

A remote MCP deployment on Supabase typically uses two Edge Functions:
1. `mcp-resource`: Serves `server/discover`, `tools/list`, and `tools/call`.
2. `mcp-auth`: Serves OAuth discovery, authorization, code exchange, and token refresh.

Both functions must declare `verify_jwt = false` in `supabase/config.toml`.
Reason: In an MCP server, incoming requests carry custom Bearer tokens (OAuth access tokens or PATs) that are authenticated against custom tables (`mcp_oauth_tokens` or `mcp_pats`), not against the Supabase Auth internal gateway JWT secret. If `verify_jwt = true`, the Supabase Kong gateway rejects standard MCP client tokens before your function code can validate them.

---

## 2. Public URLs and Dual Audience

Public hostnames must be configured via environment variables (`MCP_RESOURCE_URL` and `MCP_ISSUER_URL`), with a fallback derived from the Supabase project reference.
During custom domain transitions or proxy migrations, the server must support dual audience validation so tokens issued under the legacy URL remain valid until fully drained.

---

## 3. Pathname Routing

Supabase Edge Functions can receive incoming request paths either stripped or including the prefix:
- With prefix: `/functions/v1/mcp-resource/...`
- Without prefix: `/mcp-resource/...` or `/`
The request router must normalize the path and accept both formats seamlessly.

---

## 4. User Session and Magic Link Lifecycle

When authenticating a user to establish a database session:
- Use `supabase.auth.admin.generateLink()` to create a magic link token, then verify it via `supabase.auth.verifyOtp()`.
- When terminating an ephemeral session, always call `signOut(token, 'local')`, never `'global'`. Using `'global'` invalidates all active sessions for that user across all devices and dashboards.

---

## 5. Reused Session per User (Encryption & Lock)

Under high load or burst requests, generating a new Supabase Auth session per tool call is slow and rate-limited.
Implement session reuse per user:
- Persist ephemeral session tokens encrypted at rest using AES-GCM.
- Acquire a concurrency lock by `user_id` when initializing or refreshing the session.
- Validate that the token subject matches (`sub == user_id`).
- Include an automatic circuit breaker that clears the cached session upon authentication errors.

---

## 6. Parallel Requests without Session Reuse

When a client fires multiple parallel tool calls for the same user simultaneously, each attempting to use a freshly generated magic link, the second request will fail because the magic link is single-use. Reusing the decrypted session across concurrent calls prevents this race condition.

---

## 7. Supabase Auth OAuth 2.1 Server Option

If utilizing the built-in Supabase Auth OAuth 2.1 Server (configured under `[auth.oauth_server]` in `config.toml`):
- Wrap function handlers using `withOAuthProtectedResource`.
- Access the authenticated context through `withSupabase({ auth: 'user' })` to ensure the client interacts strictly within the user's RLS boundaries.

---

## 8. Client Invocation Error Handling

When calling Edge Functions from external client scripts or tests using `supabase.functions.invoke`:
- Any non-2xx HTTP status clears `data` to null and populates the `error` property.
- To inspect custom error payloads returned by the MCP server, read `error` directly or use native `fetch`.

---

## 9. Test Architecture

Separate pure business logic from modules with network and database I/O so that Vitest can import and execute unit tests locally without spinning up a live Supabase container.

---

## 10. Does not apply here

- **Cloudflare Bindings**: D1, R2, and KV bindings are specific to Cloudflare Workers.
- **`workers-oauth-provider`**: Specific to Cloudflare Workers.
- **Manual proxy allowlisting**: Handled in proxy or Worker gateways.
