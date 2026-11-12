# Aggregator MCP: Republishing Another MCP by Relay

This reference covers a **host MCP** that reads an **origin MCP**'s `tools/list` at runtime, republishes each tool under a prefix (`origin_*`), and forwards `tools/call` to the origin with the **caller's own OAuth credential at the origin**. It builds on `permissions.md`, `tool-contract.md`, `usage-log.md` and `auth-modes.md`; read those first.

The point of the pattern: a tool added to the origin appears in the host with no host code, review or deploy. The origin stays the only owner of schema, description, permission rule and tests.

---

## 1. When to use it, and when not to

| Use it when | Do not use it when |
|---|---|
| The origin already has an MCP with per-person OAuth | One tool must join host data and origin data in a single answer: write a host tool that calls the origin inside |
| Several people use both systems from one AI client | The origin has no per-person identity and the relay would need a service credential stronger than the person |
| You do not want to maintain two copies of each tool | The AI client already connects to the origin directly and nothing else is needed |

Two variants exist. Pick by what the origin publishes:

| | **MCP relay** (this file, sections 2 to 10) | **Action catalog** (section 11) |
|---|---|---|
| Origin publishes | its own `tools/list` | an endpoint listing actions as JSON Schema (`name`, `effect`, `destructive`, `input`, contract version) |
| Credential | the person's OAuth token at the origin; host is a confidential client | a host-held server secret plus the person's session id in the body |
| Choose when | origin MCP with per-person OAuth exists | origin has no MCP, or the action acts on behalf of the host |

What the person must do to start using it: a **second authorization** at the origin (the "connect" step, section 6). Nothing else.

### What the origin must guarantee

- Per-person OAuth with a **confidential client** registered for the host (one client per environment).
- `readOnlyHint` and `destructiveHint` set correctly on every tool. In a relay, a wrong annotation becomes a wrong permission.
- Descriptions that stand alone (the host only appends an origin suffix).
- Input and output schemas without `$ref`; tool names short enough to fit the prefix.
- For attachments: a tool that returns a short-lived signed upload URL (section 9).

---

## 2. Step sequence

1. Add a host **domain** for the origin to the ceiling (`permissions.md`), default `none`. Without it the host never calls the origin.
2. Create the tables in section 12 and the encryption helper (section 6).
3. Register the host as a confidential OAuth client at the origin, by a script the owner runs (secret shown once, stored in the host's secret store, never printed).
4. Build the connect flow: initiate endpoint, return page, conclude endpoint (section 6).
5. Build the pure modules: origin client, republish rules, dispatcher, dynamic call handler (sections 3 to 8). Inject all I/O.
6. Wire `tools/list` and `tools/call` in the MCP resource; keep the static path byte-identical (section 8).
7. Add the admin screen block for destructive releases (section 4) and the connect card for the person.
8. Redeploy the **OAuth/authorization function too**: the new scope must appear in `scopes_supported` and in the scopes a new connection requests. Existing connections do not gain the new scope; the person must re-consent or use the adjust screen.
9. Smoke test with a real account, positive and negative (section 14).

---

## 3. Naming, skipping and schema handling

| Rule | Detail |
|---|---|
| Name | `<prefix>_` + origin name. The prefix identifies the origin to the model and prevents collisions |
| Valid original name | `^[a-z0-9_]{1,55}$`. 55 plus a 9-character prefix stays within the 64-character limit of common clients. Use the same pattern in the database `CHECK` |
| Skipped, counted in a notice | invalid name; duplicated name (skip **both**); name equal to a reserved host tool (all static names and the connect tool); missing `name` or object `inputSchema`; any `"$ref"` in input or output schema |
| `$ref` | skip, do not resolve. Resolving without a schema library risks recursive schemas |
| Input schema | publish the origin's `inputSchema` **complete** (required, nested objects, `additionalProperties`). Do not pass it through the host's own schema converter built for static tools |
| Description | origin description plus a fixed suffix such as `(Origin: X. Acts on your X account.)` |
| Size | a full origin manifest can reach tens of KB (thousands of tokens). Publish it only to people who hold the domain **and** have connected |

Order of skip reasons: `format` first only when there is no name to evaluate; then `name`, `ref`, `collision`, `duplicate`.

---

## 4. Classification, destructive tools and admin release

**Classify from the origin's annotations** (and nothing else):

| Origin says | Host class | Required scope |
|---|---|---|
| `readOnlyHint: true` and not destructive | read | `origin:read` |
| `destructiveHint: true`, or ever seen destructive (sticky) | destructive | `origin:write` plus an admin release |
| anything else, including no annotation | write | `origin:write` |

**Sticky classification.** Store per tenant whether a tool was ever seen as destructive. It stays destructive until an admin explicitly reclassifies it, and reclassifying is only allowed while the origin no longer marks it destructive. Without this, an origin that drops the hint silently turns a deletion tool into a plain write.

**Signature.** `sha256(canonical_json({inputSchema, outputSchema, annotations}))` with sorted keys. It changes when schema, output or annotations change; it does not change with title or description.

**Release.** A destructive tool is born off. An admin releases it per person for the pair `(name, signature)`. When the origin changes the tool the signature differs and the release lapses ("The tool changed since you released it. Release again."). Lowering the person's domain below write deletes their releases. The release is compared with the tenant's last-seen signature, not with each person's own list, so two people with different catalogs can invalidate each other; accept and document it.

A destructive tool whose effect says "read" still needs write plus release (action-catalog variant).

---

## 5. Permissions: host ceiling over origin

- The person needs the origin domain in the host ceiling (`origin:read` or `origin:write`). Without it the host does not touch the origin: no token read, no network.
- The origin still applies the person's own permissions. The host never has more power than the person has there.
- **Generic tools must ignore the origin domain.** If the host has `search` and `fetch` that appear to anyone with read in any domain, compute "has any read" over host domains only. Otherwise holding only the origin domain exposes host data.
- Release of destructive tools requires the matching domain at write level for that person.
- Setting the domain to `none` also disconnects the account, deletes pending connect requests and releases.
- Token scope still intersects the current ceiling on every request (`permissions.md`, section 3).

---

## 6. Connect flow, OAuth and token storage

### 6.1 Client and flow

| Item | Choice |
|---|---|
| Client | confidential, `client_secret_basic`, one per environment, minimal scope (an identity scope is enough) |
| PKCE | S256, verifier 32 random bytes base64url |
| Registration | script run by the owner. Dynamic registration may be disabled (403): fallback is asking the origin owner to enable it or to register the client in the admin console |
| Secrets | client id and secret, redirect URI, origin URLs live in the host secret store. Any one missing means the origin is silently absent (fail closed) |

### 6.2 `state` and the connect request

- `state` is an opaque 32-byte random nonce. Store only its **SHA-256**, with the owning user, the PKCE verifier encrypted, a 10-minute expiry and a consumed flag.
- Consume atomically (`for update`): results `ok`, `used`, `expired`, `missing`, `other_person` (do not consume on `other_person`).
- A new request, a disconnect and a domain set to `none` delete the person's pending requests.
- **Return page, not a direct redirect to a function.** The redirect URI is a page of the host app where the person is logged in; it sends `code` and `state` to an authenticated endpoint. This prevents linking-CSRF (one person's link concluded by another person's session).
- The conclude endpoint requires the person's **own session**, a step-up (MFA) when they have a factor, and rejects delegated or impersonated sessions. Check delegation independently of the step-up result; a read failure returns 503, not "allowed".
- Conclude writes in **one transaction** that re-checks: the consumed request still exists and is the person's; the origin domain is still in their ceiling; the tenant is still enabled. Otherwise raise `request_expired` and discard the received tokens. This closes the window where the person is disconnected or downgraded while the code exchange is in flight.
- Order inside the endpoint: method, session, body, disconnect (works even when the origin is not configured), state, "not configured" 503, step-up, delegated, ceiling, then side effects. No side effect before a refusal.
- Keep `code`, `state`, verifier and tokens out of logs, audit rows, error monitoring and session replay. Strip the query string of the return route from monitoring events, transactions, breadcrumbs and replay.
- Disconnect deletes the stored account and pending requests, is idempotent, and is audited. Most OAuth servers have no revocation endpoint: tell the person that access at the origin remains until they revoke the app there.

### 6.3 Encrypted storage

- AES-GCM with **additional authenticated data = purpose** (`pkce`, `pair`, `ticket`). Ciphertext made for one purpose does not open under another. A separate key from any other session-reuse key.
- Table closed to every client role (RLS on, all grants revoked, service role only).
- Audit events with only the provider in the payload: connected, disconnected, expired.
- Retention: delete on disconnect, on refresh rejection, on user deletion (`on delete cascade`), and by a dormant unused-account purge whose retention key is absent by default.

### 6.4 Valid token per person (refresh rotation)

Origin refresh tokens are usually single use with rotation, so two concurrent refreshes lose the connection. Rules, in order:

1. No row: `no_account`. Ciphertext that does not open: delete-if-equal and report `expired`.
2. Access valid for more than 5 minutes and not the one just refused: return it, no network.
3. Take a per-person lock (20 s, owner id). If not granted: poll every 150 ms until the shorter of 9 s and the request deadline; row gone means `no_account`; a new valid access means done; else `queue`.
4. With the lock: re-read; if someone already renewed, return it.
5. Refresh with a timeout of `min(6 s, remaining - 2 s)`; do not start without the margin to also write (otherwise the refresh is consumed and the new pair thrown away, forcing reconnection).
   - success: encrypt the new pair, **write it conditionally on lock owner and unexpired lock, then** return the access. Never return before the write succeeds. If the write is refused (lock lost, disconnect, reconnect), discard the pair and re-read.
   - `invalid_grant`: delete-if-equal on the ciphertext read in step 4; audit `expired`. If the row changed (reconnect), go to step 4 once.
   - network, client or malformed response: keep the row, report `failed`.
6. Release the lock in `finally`. No `console.*` receives token, refresh or ciphertext.

On a 401 from the origin call and at least 10 s of deadline left, ask for a token again passing the refused access and retry once.

`generation` comes from a sequence, not a counter per person, so it never repeats after disconnect and reconnect. It is part of the cache key.

### 6.5 The connect tool

- A static host tool (`origin_connect`, read scope, no input) returning `{connected, link, tools, notice}`; `link` points at the page where the person connects.
- A person with the domain who is not connected sees **only** this tool among the origin's. Its description carries the outage notice when the origin is down ("... Notice: <text>").
- Without configuration it answers `{connected:false, tools:0, notice:"... not configured in this environment."}`.
- Tell the person on the connect card which scopes of their AI connection are missing (adjust screen) when the ceiling has the domain but the token does not.

---

## 7. Catalog, cache and permission per request

| Thing | Cached? |
|---|---|
| Raw republished catalog (metadata and signature, no classification) | yes, 5 min, key `userId:generation`, module memory |
| Sticky classification and signature of the tenant | **never**: read in the same query, on every `tools/list` and `tools/call` |
| Ceiling, effective scopes, releases, feature switch | **never** |
| Destructive tool before a call | re-read the catalog **without cache**, recompute classification and signature, re-check the release |

Consequences: revoking a permission, removing a release or marking a tool destructive applies on the next request in any isolate. A disconnected person gets `no_account` before the cache is read. One window is accepted: if the origin itself starts marking a tool destructive, someone holding the old raw catalog calls it without release for up to the TTL (they already hold write).

`tools/list` for a person: no effective origin read or write scope means an empty result **without** token read or network. Otherwise token, catalog, classification, releases, then filter. Registering the seen tools writes to the database; if that write or the classification read fails, publish nothing (fail closed).

---

## 8. Dispatch, timeouts, failure isolation and error translation

### 8.1 One resolver for names

A single pure function resolves the `tools/call` name; the handler for dynamic tools is also pure with injected dependencies. Order, with a deadline created when the request arrives:

1. Static tool: allowed, or `scope` refusal if it exists but is not allowed.
2. Prefix without a network call: no effective origin scope means `scope`; feature switch off means `disabled`; unknown name means `unknown`.
3. Per-minute rate cap (database, no network).
4. Discovery: warm cache costs no network; a cold cache is the only network before the call (token and `tools/list`). Outcomes `unavailable`, `timeout`, `unknown`.
5. Fine scope from the database classification: write without write scope means `scope`.
6. Destructive without a release matching the signature means `release`.
7. Sensitive call (class A or B; a destructive relayed tool is at least B): the confirmation gate of `confirmation.md` returns the pending link instead of relaying. Add `confirmation_id` to the published schema after computing the signature, and strip it from the arguments before the relay.

No step before the last calls the origin tool. Refusals 1 and 2 cause zero network calls; 5, 6 and 7 cause zero `tools/call`.

### 8.2 Timeouts

| What | Limit |
|---|---|
| Total per `tools/call`, from arrival | 45 s, below the AI client's wait and the platform limit. Pass the same final deadline to every step |
| Origin `tools/list` | 6 s |
| Origin `tools/call` | `min(25 s, remaining)` |
| Token refresh | 6 s |
| Lock wait | 9 s |
| Database calls on the path | abort with the deadline (abort signal); a hung query becomes `failed` or `timeout`, never waits past it |
| Audit row write | after the deadline, own 3 s, failure only logged by code |

Measured without the total deadline, the worst case exceeded 85 s.

### 8.3 Origin client

POST only, no session; headers `Authorization: Bearer`, `Accept: application/json, text/event-stream`, protocol-version header; `redirect: 'manual'`. One abort controller covers the request **and** the body read. Read the body as a stream with a byte cap (2 MiB) that cancels the reader; never `res.text()` or `res.json()`. For `text/event-stream`, join `data:` lines per event and stop at the object whose `id` matches (an SSE that never closes must not hang). Outcomes: `ok`, `http(status)`, `rpc(code)`, `network`, `format` (over cap, not JSON, no `result`).

### 8.4 Failure isolation

- Origin down: only its tools leave `tools/list`, with a notice on the connect tool. Host tools keep working.
- The whole origin branch of `tools/list` runs inside `try/catch`; any exception means nothing from the origin.
- Never throw out of the catalog function; return typed outcomes.
- Origin or token failures never change the answer of a host static tool.

### 8.5 Error translation

Order inside the text cleaner: (1) if the text contains any **known secret** of this request (access, refresh, client secret) literally, discard the whole text; (2) replace URLs with `[address]`; (3) discard if it contains `eyJ` + dot, `Bearer `, `token=`, `secret`, `code_verifier`, `refresh_token` or a run of 32+ base64url characters; (4) only then cut to 300 characters. A discarded text becomes the fixed message of the row. Do the secret check before truncating, or the cut hides it.

| Origin outcome | To the model (plus `(ref N)` on failure) |
|---|---|
| ok, no error flag | result as is (`content`, `structuredContent`) |
| error flag with business text that passes the cleaner | cleaned text only, `isError`, **no** `structuredContent` |
| error flag with a framework wrapper ("Error:" prefix, "tool execution failed", stack trace "at x (") or refused by the cleaner | fixed "The origin could not complete the operation. Try again." |
| 401 after refresh and one retry | "Your connection expired. Use `origin_connect` to connect again." |
| 403 | "The origin refused: your account there has no access to this." |
| 404 or 405 | "The origin did not recognize the request." |
| 413 | "The request is too large for the origin." |
| 429 | "The origin asked for a pause. Try again in a minute." |
| 3xx, 5xx, network | "The origin did not answer now. Try again in a few minutes." |
| JSON-RPC invalid params with a cleaned message | "The origin did not accept the parameters: <message>" |
| other RPC error or malformed | "The origin answered unexpectedly. Try again." |
| total deadline | "The origin took too long. Try again." |

Keep a machine code per row for the audit trail (`origin:http_403`, `origin:rpc_-32602`, `origin:timeout`).

### 8.6 Logging parity

- **Exactly one** `mcp_request_log` row per outcome of a dynamic call (success, refusal, error flag, exception, timeout), with the same columns as static tools: connection id, token id, user, tenant, tool, `write`, redacted argument summary, duration, `ok`, error, result summary.
- Refusals go through the same refusal logger as static tools; no duplicate row.
- The per-minute rate cap counts these rows by connection id, so dynamic tools count against the cap.
- `last_used_at` of the connection updates for dynamic calls too.
- The static path (refusal order, rate cap before the refusal row, text) must stay identical: regression guards written for it are the first to break when the dynamic path is added (section 13).

---

## 9. Attachments

| Case | Approach |
|---|---|
| Relay variant, origin tool returns `upload_url` for the person's own account | pass it through as it came, as a direct client would. The URL is short lived (hours), so log only argument summaries and never the result; scan the log for `token=` and signed-URL fragments in tests |
| Action-catalog variant, URL signed for the host's own secret | do **not** give the signed URL to the model; use a ticket relay |
| Declared limit vs real limit | the origin's schema may promise more than its transport accepts; the 413 arrives translated, and it is the origin's defect |

**Ticket relay** (for signed URLs that must stay out of the model):

- On the prepare action, for each file make a ticket: `jti`, encrypted payload (purpose `ticket`: signed URL, type, size, expiry, jti, user id), and a row `(jti, user, tenant, connection, destination_hash = sha256(url), content_type, size_limit, expires_at, consumed_at)`. Expiry is the smaller of the origin's validity and 15 minutes.
- The model gets `{session_id, uploads:[{kind, upload_url, ticket, content_type, size}], how_to_send}`; never the path or the signed URL.
- The relay endpoint has **no JWT**; the ticket is a bearer capability restricted to one destination, one type, one size, one use, short life, an owner and revocable.
- Checks in order: configured; method `PUT`; ticket header present (header `x-ticket`, **never** the URL, which would land in access logs), opens under the purpose and not expired; URL is `https:`, same origin as the origin host and path under the storage upload-sign prefix; `Content-Type` equals the ticket's; `Content-Length` present (411) and not above the limit (413), both **before** consuming; atomic consume (`used`, `expired`, `revoked`, `other_person`, `destination`); `PUT` with `redirect: 'manual'`, counted stream aborted if it passes the declared length, deadline below the platform limit.
- Consume refuses a ticket whose MCP connection is revoked. Lowering the domain below write deletes the person's unused tickets.
- No log carries URL, query, ticket or jti. Delete tickets older than 1 day on each new ticket batch.
- Unverified until a real smoke: a streamed `PUT` without `Content-Length`; the origin of the configured base URL must equal that of the signed URL, or every upload is a 400 (fail closed).

---

## 10. Admin and person screens

- Domain row for the origin in the ceiling screen.
- Block "Actions that delete" per domain, listing destructive tools with a switch each; confirmation when turning on; a row whose release is stale shows the "tool changed" text and the switch off; a row no longer marked destructive by the origin offers "Treat as a normal action" after confirmation.
- Empty state: "No deleting action has appeared yet. It appears after someone connects."
- Connect card on the person's account page: not connected (button), connected ("Connected as <account> since <date>", disconnect with confirmation and the note about revoking at the origin).
- Add scope labels for `origin:read` and `origin:write` to the consent page and to the connections card.

---

## 11. Variant: action catalog

For an origin without an MCP.

- The origin publishes an endpoint, called with a server token and a project key, that returns `{version, config_revision, dialect, actions:[...]}`. Each action: `name`, `route`, `title`, `description`, `effect` (`read|write`), `destructive`, `input` (full JSON Schema), optional `transfer` for uploads.
- Reject unknown `version` or `dialect` (build nothing). Ignore unknown fields. Skip an action whose `transfer` is not exactly what you can adapt.
- Same rules as the relay for prefix, name pattern, duplicates, `$ref`, signature, sticky classification, release. Scope from `effect`; destructive needs write plus release even when `effect` says read.
- Call: `POST <route>` with body `{...args, project, session}`, in that order, so a model-supplied `project` or `session` can never override identity. `route` must match a fixed pattern and not be the catalog route.
- Cache the catalog 5 minutes and reload when `config_revision` changes; a cache `forget()` after a refusal that means "catalog is stale".
- A feature switch per tenant, off by default, read on both list and call.
- Translate by **status and code together** (a code like `invalid_session` can mean two things). Never pass the origin `message` to the model; map code to a field name and a fixed sentence. 2xx is trusted only if it is a JSON object; a signed URL in a response of an action without `transfer` is a format failure.
- Replace names of other actions in descriptions with their prefixed names. Fixed host tools that the catalog supersedes are removed from the list only when the substitute exists.
- Needs a version-tolerant compare of the live endpoint against a stored fixture before turning the switch on.

---

## 12. Table sketch (provider column keeps it reusable)

```sql
create sequence mcp_ext_generation_seq;

create table mcp_external_accounts (
  user_id uuid not null references auth.users on delete cascade,
  provider text not null check (provider in ('origin')),
  tenant_id uuid not null,
  ciphertext text not null,                 -- AES-GCM, purpose 'pair'
  access_expires_at timestamptz not null,
  generation bigint not null default nextval('mcp_ext_generation_seq'),
  account_email text, connected_at timestamptz not null default now(),
  renewed_at timestamptz, used_at timestamptz,
  lock_owner uuid, lock_until timestamptz,
  primary key (user_id, provider)
);

create table mcp_external_requests (        -- connect requests
  nonce_hash text primary key check (nonce_hash ~ '^[0-9a-f]{64}$'),
  user_id uuid not null, provider text not null,
  verifier_ciphertext text not null,        -- purpose 'pkce'
  expires_at timestamptz not null, consumed_at timestamptz
);

create table mcp_external_tools_seen (
  tenant_id uuid not null,
  tool text not null check (tool ~ '^origin_[a-z0-9_]{1,55}$'),
  read_only_now boolean not null, destructive_now boolean not null,
  destructive_ever boolean not null default false,
  signature text not null check (signature ~ '^[0-9a-f]{64}$'),
  reclassified_by uuid, reclassified_at timestamptz,
  primary key (tenant_id, tool)
);

create table mcp_tool_releases (
  user_id uuid not null references auth.users on delete cascade,
  tenant_id uuid not null, tool text not null, signature text not null,
  released_by uuid not null, released_at timestamptz not null default now(),
  primary key (user_id, tool)
);
```

All tables: RLS on, `revoke all` from `anon`, `authenticated`, `public`, grants to the service role only. Functions: `security definer set search_path = public`, `revoke ... from public, anon`, execute to the service role (admin RPCs to `authenticated` with a role check, as in `permissions.md`). The tool name check must equal the republish name pattern. Service functions: new request, consume request, connect (transactional re-checks of section 6.2), disconnect, take/release lock, conditional renewal write, delete-if-equal, register seen tools (item by item, skipping invalid ones; returns the effective class of what was stored), admin list/release/reclassify.

---

## 13. Pitfalls

| Pitfall | Fix |
|---|---|
| Host-side `search`/`fetch` shown to holders of only the origin domain | compute "any read" over host domains only |
| Adding the domain without extending the OAuth function | new connections never get the origin scope; redeploy it and show re-consent text |
| Redeploying the MCP or OAuth function without `--no-verify-jwt` | turns the gateway JWT check back on and breaks PAT/OAuth clients |
| Migration that recreates the domain list function from an older version | drops the newer domains; start from the latest version and add the new domain in every place (CHECKs, scope derivation, validations) |
| New dynamic path reorders the static one (rate cap after the refusal row, a `(ref N)` on static refusals, session opened before the cap) | existing guards turn red; keep the static path text and order |
| Origin stack traces in error flags | translate to the fixed text; origin frameworks often wrap every exception as `Error: <message>` |
| Refresh used before the new pair is stored | write first, return after |
| Giving the refresh the whole remaining deadline | refresh consumed, pair dropped, person forced to reconnect |
| Classification read from cache | read it from the database each request |
| Body from the model overriding project or session | spread `args` first, identity last |
| Signed URL or ticket in logs, URL query, error monitoring or replay | header only, strip query from monitoring, scan the log in tests |
| Return route with `code`/`state` in the monitoring breadcrumb | scrub query on transactions, breadcrumbs, replay and events |
| React strict mode firing conclude twice | single-shot guard (ref) on the return page |
| Unlocked refresh from two parallel tool calls | per-person lock (6.4) |
| Counting on wire formats you have not measured | measure with a real token: JSON or SSE, header requirements, claims, refresh reuse behaviour, where the person revokes |

---

## 14. Tests to write

- **Pure republish**: names, skips (name, `$ref`, duplicate, collision, format), signature stable across title/description, changes with schema or annotation; classification table incl. no annotation; sticky; counts derived from a fixture, never hard-coded. Generate the first fixture from the origin's published manifest; replace it with the measured one after a real spike.
- **Dispatcher**: each refusal order case with call counters on network and origin (refusals 1 and 2: zero calls cold and warm; 5 and 6: zero `tools/call`).
- **Token**: single lock holder; lock lost; disconnect or reconnect mid-refresh; stale `invalid_grant`; write-before-return; short deadline does not consume the refresh; secrets never reach `console.*` (spy with a floor on calls so the guard is not vacuous).
- **Connect**: replay sequential and parallel; other person's `state`; expired; downgrade or disconnect during exchange; delegated session; MFA; not configured; disconnect when not configured.
- **Client**: JSON and SSE; SSE that never closes; body over cap with and without `Content-Length`; 3xx; hung body.
- **Translation**: known secret placed before and after position 300; URL; token-like run; wrapper text; every table row.
- **Logging parity**: one row per outcome for both origins; refusal not duplicated; rate cap counts dynamic rows by connection id.
- **Release**: bypass attempts (release then schema change; origin drops hint; reclassify while still destructive; domain lowered).
- **SQL rehearsal**: run the migrations and the policy checks in a transaction rolled back, with a non-admin role writing a restricted switch (must fail), purge dry run, conditional write refused when lock is not held.
- **Cache**: release removed between two lists with the same warm cache; classification changed by another isolate.
- **Static regression**: run the existing MCP guards (refusal order, rate cap, scope derivation parity, domain lists) before and after, and compare red sets with the base.
- **Mutation per guard**: break the invariant (call before scope, drop the audit insert, swap connection id, read classification from cache, return before write, cut before secret scan) and watch the test go red.
- **Live smoke** (manual, real account): connect, list, read, write, destructive without release (refused), with release, revoke at the origin and call again, force an expired access, upload via the relay, then scan the audit rows for `token=` and signed-URL fragments.
