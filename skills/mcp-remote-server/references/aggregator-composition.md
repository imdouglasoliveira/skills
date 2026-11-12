# Aggregator Composition: Profiles, Cache Layers, Origin Failure, Naming, Several Origins

This reference extends `aggregator-relay.md` and `aggregator-discovery.md`. Everything here is opt-in and comes after the exposure modes work. Build an item only when the deployment shows the need: a profile when a client should see less, a circuit breaker when an origin fails often, several origins when a second origin really exists.

---

## 1. Profiles (virtual catalogs)

A profile is a named allowlist of relayed tools: a view, not a role.

- The profile limits what **appears**. Permissions decide what **runs**. A tool refused by token scope or ceiling stays refused in every profile (N-22).
- Bind the profile on the server: per connection (chosen on the consent page or by an admin), per role already present in the app, or per tenant. Do not build a second role system for it.
- Store entries by stable key `(origin_id, original_name)`, not by published name, so a rename of the prefix does not empty the profile.
- An entry naming a tool the origin no longer offers is ignored and reported on the admin screen; it never becomes a placeholder that resolves later to something else.
- A profile change invalidates the composed catalog of every connection bound to it (section 2).
- Removing a tool from a profile does not revoke releases or confirmations; it only hides the tool. Revocation stays in the ceiling and the release screen.

Sketch:

```sql
create table mcp_exposure_profiles (
  tenant_id uuid not null, profile text not null check (profile ~ '^[a-z][a-z0-9_]{0,31}$'),
  mode text not null check (mode in ('full', 'selected', 'discovery')),
  updated_at timestamptz not null default now(),
  primary key (tenant_id, profile)
);

create table mcp_exposure_profile_tools (
  tenant_id uuid not null, profile text not null,
  origin_id text not null, tool text not null check (tool ~ '^[a-z0-9_]{1,55}$'),
  primary key (tenant_id, profile, origin_id, tool),
  foreign key (tenant_id, profile) references mcp_exposure_profiles on delete cascade
);
```

Plus a nullable `profile` column on the connection row. RLS and grants as in `aggregator-relay.md`, section 12; edits through an admin RPC with the role check of `permissions.md`, section 10.

---

## 2. Three cache layers

| Layer | Content | Key | Lifetime |
|---|---|---|---|
| Raw catalog | origin tool metadata and signatures | `origin_id:user_id:generation` | 5 minutes (N-17) |
| Composed catalog | the exposed list or search index for one connection | `origin_id:user_id:generation:profile:profile_updated_at:mode` | same as raw, and dropped on any key change |
| Authorization | effective scopes, classification, releases, confirmation | none | **never cached**, read per call |

- Never share a composed entry between people or tenants. The key carries the user, so a cache hit cannot cross identities.
- Invalidate on: disconnect or reconnect (generation changes), profile edited (timestamp changes), mode changed, origin catalog changed (raw entry refreshed), tenant switch.
- A tool whose signature changed does not inherit a release or a confirmation made for the old signature (`aggregator-relay.md`, section 4).
- A destructive tool re-reads the raw catalog without cache before the call, whatever the mode (N-17).

---

## 3. Origin failure: circuit breaker

Optional. Add it when an origin that is down makes every call wait for the timeout.

- State per origin: `closed`, `open`, `half_open`. Keep it in module memory per isolate by default; a shared store (D1, KV, a table) only when isolates must agree, and never a new service just for this.
- Count only availability failures: timeout, network error, 5xx, malformed response. A 401, 403, 404 or 429 says nothing about availability and never opens the circuit.
- Open after N consecutive counted failures (5 is a start) for a cooldown (30 s); while open, calls to that origin answer "The origin did not answer now. Try again in a few minutes." with no network, and the origin's tools leave `tools/list` as in `aggregator-relay.md`, section 8.4.
- After the cooldown, one probe call passes (`half_open`); success closes, failure reopens.
- The probe still runs every check of the pipeline. Recovery never skips auth, scope or confirmation.
- The state holds counts and times only: no token, argument or result.
- Host tools and other origins are unaffected.

---

## 4. Naming and the registry

Problems to prevent: two origins with the same tool name; prefixes stacked by the host, the IDE and the client; client limits on name length; a rename that breaks prompts and saved automations.

1. Keep the current published names as they are. Changing them is a breaking change.
2. Keep a registry built with the catalog: `published_name -> (origin_id, original_name, signature)`, and the reverse. Every call resolves through it.
3. Do not recover the origin by splitting the published name on `_`: an origin id with `_` or a tool name that starts like another prefix makes the split ambiguous.
4. New compositions may use shorter prefixes; check collisions when building the registry and skip **both** colliding tools with a notice, as `aggregator-relay.md`, section 3, does for duplicates.
5. Check the longest published name against the shortest limit among the target clients (64 characters is common). Count prefixes the client itself adds.
6. To rename, publish the new name and keep the old one as an alias that resolves to the same key for a stated period. Aliases are listed in the registry, not in the model-facing description.

---

## 5. Several origins

Not needed until a second origin exists. The single-origin tables of `aggregator-relay.md`, section 12, already carry a `provider` column; going to N origins means:

- a stable `origin_id` per origin, used in the ceiling domain, the scopes (`<origin>:read`, `<origin>:write`), the registry, the cache keys and the profile entries;
- OAuth accounts separated by `(tenant, user, origin)`, each with its own connect flow, lock, generation and secrets;
- releases keyed by `(user, origin, tool, signature)`;
- a deadline share and a breaker per origin; one origin's failure removes only its tools;
- disconnecting one origin drops its accounts, pending requests, releases, cache entries and profile resolution, and nothing of the others;
- one `origin_connect` per origin, or one connect tool with an enum of the person's allowed origins.

Acceptance: disconnecting an origin leaves no executable orphan tool and changes nothing for the others.

---

## 6. Resources, prompts and views

Compose origin resources and prompts only when a real client needs them. Keep the original URI scheme visible, filter by the person's effective access exactly as tools are filtered, and never let a resource read become a write path. Interactive views (MCP Apps) are a separate design with their own content security rules; they are not part of routing. Arbitrary code execution over the composed catalog is out of scope.

---

## 7. Tests

- Profile: a tool outside the profile is absent in `selected`, absent from search results, and `unknown` through the dispatcher; a tool in the profile but refused by ceiling stays refused.
- Cache: person A's composed entry is never served to person B; a profile edit is visible on the next `tools/list`; a release removed between two calls with a warm cache refuses the second call.
- Breaker: 403s never open it; N timeouts open it; the probe passes every check; host tools work while it is open.
- Naming: two origins with the same tool name never execute each other's tool; an alias resolves to the same key; the longest name fits the target limit.
- Several origins: disconnecting one keeps the other's tools and releases intact.
