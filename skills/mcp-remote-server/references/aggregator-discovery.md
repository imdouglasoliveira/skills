# Aggregator Exposure Modes: Full, Selected and Discovery

This reference extends `aggregator-relay.md`. It decides **how** the republished tools reach the client: all of them, a configured subset, or on demand through a search tool and a dispatcher. It never decides **whether** a tool may run: that stays with the pipeline of `permissions.md` (N-21), the release of `aggregator-relay.md`, section 4, and the gate of `confirmation.md`.

Read `aggregator-relay.md` first. Profiles, cache layers, origin failure, naming and several origins are in `aggregator-composition.md`.

---

## 1. Principle

Finding a tool grants nothing. Exposure is a view over the tools the person may already run; the dispatcher is one more door into the same pipeline, not a second gateway. Every rule below follows from that:

- what is exposed is a subset of what is allowed (N-22);
- a call through the dispatcher runs exactly the checks of a direct call (N-23);
- a name, a `tool_ref`, a search result, a profile or a cached schema is never a credential (N-24).

---

## 2. The three modes

| Mode | `tools/list` shows | Choose when |
|---|---|---|
| `full` (default) | every relayed tool the person is allowed, as today | catalog is small, or clients cache `tools/list` and you cannot change them |
| `selected` | the allowed tools that are also in the profile's allowlist | a client or role should see a narrow set (read-only assistant, one workflow) |
| `discovery` | host tools plus `relay_tools_search` and `relay_tool_call`; no relayed schema up front | catalog is large and the schemas announced up front cost more context than the extra calls |

Rules:

- `full` stays the default and keeps the current names, schemas and hints byte-identical. Adding the other modes must not change a deployment that configures nothing (keep the catalog snapshot test of `testing.md`, section 7, green).
- The mode and the profile are chosen **by the server** from trusted configuration bound to the connection, the role or the tenant. Never from an argument, a header the model controls, or text in the prompt.
- Exposure applies only to relayed tools. Host static tools keep their own path and their own `tools/list` entries.
- Changing the mode of a connection takes effect on the next `tools/list`. Tell the person to refresh the tool list in the client (`clients.md`).

The exposed set is:

```
exposed = allowed_by_identity ∩ allowed_by_ceiling ∩ offered_by_origin ∩ selected_by_profile
```

`selected_by_profile` is "everything" in `full` and in `discovery` (where it bounds what the search may return). Classification, release and confirmation are not part of the exposed set: they are checked on the call.

---

## 3. Two kinds of search: keep them apart

| | Tool search | Data search |
|---|---|---|
| Finds | an operation in the catalog (`origin_list_items`) | business records (the items themselves) |
| Tool | `relay_tools_search` | the generic `search` of `tool-contract.md`, section 13, or a list tool |
| Scope needed | any effective scope on the origin domain | the scopes of the data it returns |
| Returns | references, descriptions, schemas on request | records with ids and links |

Do not merge them, and do not name the tool search `search`: clients that expect `search`/`fetch` for data would call it with the wrong intent. Describe each one so the model knows which to pick ("Finds which origin tool to use. It does not return data.").

---

## 4. `relay_tools_search`

Input:

| Field | Type | Rule |
|---|---|---|
| `query` | string, 1 to 200 chars | required |
| `limit` | integer, 1 to 20, default 8 | capped by the server |
| `with_schema` | boolean, default false | include `inputSchema` per result |

Annotations: `readOnlyHint: true`, `destructiveHint: false`. Scope: any effective read or write on the origin domain; without it the tool is not listed.

Algorithm (deterministic, no model and no embeddings in the first version):

1. Build the candidate set: the person's **allowed** relayed tools, computed exactly as `tools/list` in `full` mode would, then intersected with the profile. Disconnected person: answer as `origin_connect` does, no network.
2. Normalize the query and each candidate: lower case, strip accents, split on `_`, `-`, `.`, `/`, spaces and camel case, drop empty tokens and a short stop-word list.
3. Score each candidate per query token: exact token in the original name 5, prefix of a name token 3, token in the origin label 2, token in the description 1, token in curated tags 2. Add 4 when the whole normalized query equals the normalized name. Ignore candidates with score 0.
4. Sort by score descending, then by name ascending, so equal scores come out in a stable order.
5. Cut to `limit` and say so: `{tools, truncated, total, notice}`. `notice` names how to narrow ("Refine the query or add a word from the tool name."). Silent truncation is forbidden (N-03).
6. Each result: `tool_ref`, `name` (the published name), `title`, `description`, `read_only`, `destructive`, and `inputSchema` only when `with_schema` is true. Never return a tool the person cannot call, a tool of another origin they lack, or internal metadata (signature, release state of other people).
7. Log one usage row like any read tool (N-14).

Rank quality is measured, not assumed: keep a fixture of queries with the expected first result and assert it (`testing.md`, section 8).

---

## 5. `relay_tool_call`

Input:

| Field | Type | Rule |
|---|---|---|
| `tool_ref` | string | required; from a search result or typed by the model |
| `arguments` | object | required; the concrete tool's arguments |
| `confirmation_id` | string | optional; only on the repeat call after a confirmation |

Annotations: `readOnlyHint: false`, `destructiveHint: true`. The dispatcher can reach any allowed tool, so its own hints describe the worst case; the real risk is the concrete tool's, decided on the call.

Order, with the deadline of `aggregator-relay.md`, section 8.2, created on arrival:

1. Validate `tool_ref` against the reference pattern (section 6). Malformed means `unknown`, no network.
2. Resolve it to `(origin, original name)` through the registry. Unknown, removed or belonging to an origin the person lacks: `unknown`, the same text for all three, so the answer does not reveal tools the person cannot see.
3. Hand the **concrete published name** and `arguments` to the existing dynamic-call resolver of `aggregator-relay.md`, section 8.1, from step 2 onward: effective scope, feature switch, rate cap, discovery, fine scope from the classification read now, destructive release, confirmation gate. The profile check runs here too: a tool outside the profile is `unknown`.
4. The confirmation gate binds to the concrete tool and the hash of `arguments`, never to `relay_tool_call` (`confirmation.md`, section 15). `confirmation_id` stays out of `arguments` and never reaches the origin.
5. Write exactly one usage row, as the concrete tool, with the dispatcher noted in a separate column or field (`via = 'dispatcher'`). Not one row for the dispatcher and another for the tool (N-20).

A model that calls `relay_tool_call` with a `tool_ref` it never searched for gets the same answer as a model that searched first. That is the property to test.

---

## 6. `tool_ref`

- Format: `<origin_id>:<original_name>`, matching `^[a-z][a-z0-9_]{0,15}:[a-z0-9_]{1,55}$`. Readable, stable across sessions and isolates, derived from data the person can already see.
- It is a routing key, not a capability: it carries no signature, no expiry and no user id. All authority comes from the resolution in section 5, read at call time.
- Do not sign or encrypt it to "protect" it. A signed reference invites code that trusts the signature and skips the checks.
- Resolve through the registry kept when the catalog is built (`aggregator-composition.md`, section 4), never by splitting the published name on `_`.

---

## 7. Pending confirmation through the dispatcher

The pending result of `confirmation.md`, section 8, tells the model to repeat the same call. Through the dispatcher that means: call `relay_tool_call` again with the same `tool_ref`, the same `arguments` and the `confirmation_id` received. The text returned must say so, naming `relay_tool_call`, since the concrete tool is not in the model's tool list.

A confirmation created for a direct call (`full` mode) and repeated through the dispatcher, or the reverse, is valid when user, connection, concrete tool and argument hash match. The door does not change what the person approved.

---

## 8. Cost: measure before you choose

`discovery` trades schemas announced up front for extra calls. It can lower the context spent on tool definitions and raise the number of round trips and the latency per task. Do not promise a saving before measuring, per mode, on the same task list:

| Metric | How |
|---|---|
| Tools announced | count in `tools/list` |
| Schema bytes | length of the `tools/list` JSON |
| Tokens per task | client telemetry, when available |
| MCP calls per task | usage log grouped by task run |
| End-to-end latency, p50 and p95 | trace from first call to final answer |
| Right tool picked | scripted tasks with an expected tool |
| Refusals that should refuse | negative cases, all must refuse |

Pick the mode per connection or role from these numbers. A small catalog usually stays in `full`.

---

## 9. Pitfalls

| Pitfall | Fix |
|---|---|
| Search candidates computed by a second, simpler permission function | reuse the function that builds `tools/list` in `full` |
| Dispatcher marked read-only because "it only forwards" | mark it as the worst case; the concrete tool decides the gate |
| Dispatcher writes its own log row and the concrete call writes another | one row, as the concrete tool, with `via` |
| Mode or profile taken from tool arguments or a header the model sets | server-side configuration bound to the connection |
| `unknown` and `scope` answered with different texts for invisible tools | same text, so refusals do not enumerate the catalog |
| Tool search named `search` | separate name; `search` is for data |
| Schema returned for every result by default | `with_schema` on request; the point of the mode is a small payload |
| Truncated result without notice | `truncated`, `total`, `notice` always present |
