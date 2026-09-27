# Closed Proxy Runtime Implementation Guide

This reference guides implementing a thin, secure gateway in front of an MCP server hosted elsewhere, using `../templates/js/proxy-routes.mjs`.

---

## 1. Closed Route Allowlist (N-11)

The proxy must expose an explicitly closed list of routes.
Any request path not recognized in the routing table must immediately return HTTP 404 locally without forwarding traffic to upstream infrastructure.
This protects origin services from unauthorized probes and path traversal attacks.

---

## 2. Header Allowlist and Strip Rules

The proxy must enforce strict header sanitization:
- **Forwarded headers**: Standard request headers plus `mcp-method` and `mcp-name` (required by MCP spec `2026-07-28` for POST requests).
- **Dropped headers**: Never forward `cookie`, `apikey`, or `accept-encoding` to upstreams. Forwarding cookies breaches credential boundaries, and forwarding `apikey` risks leaking internal service tokens.

---

## 3. Redirect Handling and Caching

- When proxying upstream requests, configure `redirect: "manual"` to capture redirects rather than following them silently. This ensures authorization and location changes remain transparent to the client.
- The proxy must not introduce caching layers over dynamic tool execution responses.

---

## 4. Deno Deploy Specific Caveats

If deploying the proxy onto Deno Deploy:
- Be mindful that automated GitHub integration triggers a build on every push, quickly exhausting hourly deploy limits during heavy development.
- A misconfigured deployment script can inadvertently publish the entire repository as a static site. Implement a periodic leak probe requesting known sensitive source filenames to ensure static file serving is disabled.

---

## 5. Cloudflare Worker Gateway

If deploying the proxy as a Cloudflare Worker:
- Deploy manually using `wrangler deploy` to maintain strict release control.
- Setting up a custom domain in front of a Worker requires an active Cloudflare zone for that domain (via Custom Domain bindings).

---

## 6. Provider Migration and Rollback

When migrating domain endpoints from an old hosting provider to a new one:
1. Update DNS and routing gradually.
2. Decommission the old provider only after public URL traffic has completely drained.
3. Keep a documented rollback plan detailing DNS restore points and routing fallbacks.

---

## 7. Audit Logging Hygiene

When logging request summaries at the proxy layer:
- Never log the `Authorization` header, raw OAuth authorization codes, bearer tokens, or full query parameters.
- Mask or redact all incoming credential payloads prior to writing log events.

---

## 8. Does not apply here

- **Database RLS Policies**: The proxy does not connect to Postgres or D1 directly.
- **Magic link session caching**: Handled inside origin functions.
- **Direct tool execution**: Handled by upstream MCP resource endpoints.
