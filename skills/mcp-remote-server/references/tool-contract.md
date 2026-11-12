# Tool Contract and Schema Design

This reference specifies how tools are defined, validated, and exposed in remote MCP servers using `../templates/js/tool-contract.mjs`.

---

## 1. Tool Definition and Scope Map Parity (N-02)

Each tool declares its required scope directly inside the tool definition using `defineTool()`. The server-wide scope map is derived automatically via `scopeMap()` rather than maintained by hand. A parity test locks the derived map against the exposed catalog to ensure no tool is left unprotected.

```javascript
import { defineTool, scopeMap, toListEntry } from "../templates/js/tool-contract.mjs";

export const getOrderTool = defineTool({
  name: "get_order",
  title: "Get Order Details",
  description: "Fetches full details of a specific order.",
  scope: "orders:read",
  readOnly: true,
  destructive: false,
  sensitivity: "none",   // "A" | "B" | "C" | "none"; reads are always "none"
  input: {
    order_id: { type: "string", description: "Unique order identifier" }
  },
  required: ["order_id"],
  output: { type: "object" },
  run: async ({ order_id }, ctx) => { /* ... */ }
});
```

`sensitivity` is declared in the definition and checked against the classification map by the parity test (same pattern as the scope map, N-02). Classes are defined in `confirmation.md`, section 2.

---

## 2. Input and Output Schemas

Every tool must publish an `inputSchema` and an `outputSchema`.
- The list of mandatory fields in `required` is published directly in `inputSchema` so client models know what arguments cannot be omitted.
- Where a field uses a closed vocabulary, it must be represented as an `enum` derived from the source definition. When input fails validation, the error refusal lists the accepted values explicitly.
- Responses must return `structuredContent` conforming to `outputSchema`, while also serializing the payload into `content[0].text` for compatibility with clients that do not parse structured content blocks.
- **Validate on the server.** Check `arguments` against the same schema you publish; clients do not always do it, and an `enum` in the schema is documentation until the server enforces it. Refuse, never correct. The error names the dotted path and the value received.
- **User text never enters a filter expression.** Values from the model go through parameter binding or are compared in memory; never concatenate them into a query, a filter string or a URL query language.
- **Images** go back as `image` content blocks with a byte cap, never inside `structuredContent`. When the image source is not configured, run the remaining work and return `available: false` with the reason.

---

## 3. List Pagination and Truncation Warnings (N-03)

Truncating lists without informing the client causes AI agents to make faulty assumptions about total counts. When a list is limited:
- The response must include a `notice` object with `cut_at` indicating the slice boundary and pointing to the full-list tool.
- A silent cut is strictly forbidden.
- Every list reply carries `total`, `returned` and `truncated`, even when nothing was cut. `total` is the same number the app's screen shows for the same filter.
- Push the limit into the query (`limit + 1` to detect a cut). Slicing after loading every row gets the notice right but leaves memory and database reads unbounded.

---

## 4. Write Operations and Batch Guarantees

Write operations must follow predictable state guarantees:
- **Batch writes**: When multiple items are updated in one call, process item by item and return individual statuses: `changed`, `unchanged`, or `refused`.
- **Re-reading state**: After applying database side effects, the tool must re-read the affected row and return both previous and current state to confirm successful persistence. For sensitive tools the same before/after is shown to the user in the confirmation preview before the write.
- **Stored value, not echo**: Return the value read back after the write (the database may change it), the fields actually changed, and a `notice` when the re-read failed ("applied, but the confirmation read did not come back; check before reporting success"). A call that changes nothing says so.
- **Side effects reported**: Each side effect (email sent to N people, comment posted, external system updated) comes back with its own outcome. A side-effect failure never rolls back the main change.
- **Partial updates**: Validate the partial payload before merging; an invalid field refuses the whole call with "nothing was written". The description states whether omitted fields are kept, whether an empty string clears a value, and whether arrays are replaced or merged.
- **Idempotency for machine callers**: tools called by pipelines (not people) take an idempotency key, guarded by a unique index per tenant. Order: validate, check replay, write. A refused call does not consume the key, so the corrected resend applies. A replay returns the stored result flagged `deduplicated`. Reported totals replace, never add. Client timestamps must carry a zone; normalize to UTC, clamp values too far in the future, and keep the raw value as evidence.
- **Silent by default** (recommended): a tool that can notify third parties (email, push, in-app bell) does not notify unless the caller passes an explicit flag such as `notify: true`. The reply echoes whether it notified and what suppressed it. Test both modes side by side so loosening one does not change the app's normal behavior.

---

## 5. Sensitive Operations (N-04)

Sensitive tools (class A or B in `confirmation.md`) do not take a `confirm` parameter. Their first call returns `status: "confirmation_pending"` with a link and a summary and executes nothing; the same call repeated after the user confirms on the host-app page executes once.

For these tools:
- `tools/list` adds an optional `confirmation_id` (uuid) to `inputSchema`, forces `destructiveHint: true`, and publishes `outputSchema` as `anyOf: [<tool output>, <pending output>]`.
- `confirmation_id` is removed from the arguments before the handler, the relay and the argument hash.
- An optional `preview(args, ctx)` on the definition builds the human preview (read-only, same validations as `run`).
- The classification lives in one map, locked by a parity test (every write tool classified, no read tool classified).

---

## 6. Error Formatting

Errors are categorized into three distinct layers:
1. **Business/domain refusal**: Returns HTTP 200 with an MCP error envelope where `isError: true` and a helpful explanation.
2. **Protocol error**: Formatted as standard JSON-RPC error codes (e.g. `-32602` Invalid params, `-32020` HeaderMismatch).
3. **Unexpected internal error**: Returns a sanitized generic message accompanied by a log trace reference like `(ref N)` to facilitate operator debugging without leaking sensitive internal details.

**Scope refusal inside a call is a tool result, not HTTP 403.** HTTP 401/403 is only for refusing the whole request or endpoint (no token, wrong audience, access removed, kill switch). A refusal of one tool inside `tools/call` is a normal result with `isError: true` naming the missing scope, so clients do not start a re-consent loop. Hide the tool from `tools/list` too, and still re-check in the call. Prove both through the real route.

**Empty is not unreadable.** Every output distinguishes three states: empty, could not read (with a reason), and not configured. Never return an empty list for a source that failed: the model concludes "there is none". For automatic pipelines, expose a diagnostic tool that says whether the job ran and what it dropped, so "nothing appeared" is not answered by looking at the data.

---

## 7. Instructions and Discovery

Server-wide guidance and workflow guidelines for client agents should be provided through the `instructions` field of the server discovery response.

`instructions` is the cheapest guardrail. Write it as a guide, not one line:
1. Which tool answers which question (count, list or filter versus aggregate versus report).
2. The canonical order of the main workflows.
3. Rules that always apply: currency, test versus production data, timezone for dates without offset, what a `null` means.
4. What the server cannot do, with the instruction to say so and hand over a link instead of claiming it was done.
5. What the model must ask the user instead of inventing (field names, ids, values).

Each rule should exist because a model once got it wrong. Keep a test that every tool named in the guide exists in the catalog.

---

## 8. Relayed Tools

Tools republished from another MCP are not defined with `defineTool()`. Publish the origin's
`inputSchema` complete, as received, and derive `readOnly` and `destructive` from the origin's
annotations plus the sticky per-tenant record; the parity test in section 1 covers static tools and a
separate test covers the relayed ones (see `aggregator-relay.md`, sections 3 and 4). A relayed
destructive tool needs both the admin release and the confirmation gate of section 5 before the relay.
How many relayed tools appear up front (all, a profile's subset, or none plus a search tool) is the
exposure mode of `aggregator-discovery.md`; it changes the list, never the checks on the call.

---

## 9. Output Shaping

- **Money storage**: integer minor units plus an ISO currency code; decimals come from a currency table; an unknown currency is an error and extra decimals are refused, never rounded.
- **Money**: aggregates come grouped by currency; the server never sums across currencies and the tool description says so. Offer one aggregate tool per report need so the model does not add up lines itself.
- **Partial totals**: a total that omits records the caller cannot see carries a `notice` saying it is partial.
- **Visibility of values**: decided by one authoritative database function that fails closed (an error hides the value).
- **`null` is "not set"**, never `0`. Say it in the output schema descriptions.
- **Test data** (recommended): when the app has test records, every list or summary tool takes an `environment` enum (`production` by default, `test`, `all`). Test records are identified by an explicit marker, never by name; keep one shared predicate, treat a missing marker as production, and refuse (do not cut) filters that would exceed the request size limit.
- **Deep links** (recommended): every record carries a `url` to the screen that shows the same data. Build all links in one module whose parameter names are constants shared with the page that reads them, and test them: a mismatched parameter name leaves both ends green.

---

## 10. Bulk and Irreversible Changes (recommended)

- **Check, then apply**: `check` writes nothing, returns totals and a batch id, and holds a short lock; `apply` takes the batch id and the checked totals and refuses when they differ. Large inputs travel in numbered parts.
- **Simulate before an audience**: anything that reaches other people (publish, broadcast) has a read-only "who would receive this" tool.
- **Reversible deletes**: a delete requires a reason, states what can be restored and what cannot, and has a restore tool.
- **One write per call** for composite workflows; batch only homogeneous items, with per-item status (section 4). A composite tool hides partial failure.

These shape the call; class A and B tools still go through the confirmation gate (section 5), once per batch.

---

## 11. Egress from Tools

A tool that fetches a URL taken from model input goes through one shared guard:
- `https` only; every resolved address must be public (check all of them; block private, loopback, link-local and internal names); fail closed when resolution fails.
- Redirects followed by hand with the same check per hop, no downgrade to `http`, a hop cap.
- Time and byte caps per fetch.

Internal calls use a destination from configuration only. Add a test that fails if a tool module contains a bare `fetch(` outside the guard.

---

## 12. File Uploads

Binary input never travels through tool arguments, except small payloads under a stated cap.
- A prepare-upload tool checks permission and type/size **before** signing, then returns `upload_url`, `path`, `method`, `expires_in` and a copy-paste command. The object name includes a random component.
- The follow-up tool takes the `path`, never the file.
- The description lists the steps. Build the public upload URL from the public base URL when the platform URL sits behind a proxy.
- Signed URLs are short lived and never written to the usage log (see `usage-log.md`, section 3).

---

## 13. Generic `search` and `fetch`

Some chat clients expect tools named `search` and `fetch`. When you expose them:
- `search` returns `{results: [{id, title, url}]}`; ids carry a type prefix, and `fetch` takes that id.
- `search` shows a small fixed number per type and always warns when it cut (N-03). Counts come from list tools; the guide says "never count with search".
- Visibility follows the same scopes as the specific tools (see `aggregator-relay.md`, section 5, when an origin domain exists).
- These are for **data**. An aggregator's search over its **tool catalog** is a different tool with a different name (`relay_tools_search`), and its dispatcher `relay_tool_call` is annotated as the worst case (`readOnlyHint: false`, `destructiveHint: true`) because the concrete tool decides the risk (see `aggregator-discovery.md`, sections 3 to 5).

---

## 14. Metered Tools

A tool that spends money or quota (LLM, OCR, SMS, paid API) calls one budget helper before the call and records the spend after it.
- The daily cap per tenant is data, not code; a cap of 0 switches the feature off without a deploy.
- Over budget is a typed, humane refusal that names when the budget resets.
- A source-scan test fails if the paid API is called outside the helper's module.
- Usage reports keep metering (tokens, units, cost) and tool-call counts in separate sections, never summed together.

---

## 15. Entry Points Other Than the MCP Endpoint

REST side doors, chat bots and queue consumers that run tools go through the same preflight and call pipeline as `tools/call` (N-21, `permissions.md`, section 5). A side door that cannot enforce a PAT restriction refuses restricted PATs. Sensitive tools keep the confirmation gate on every door (`confirmation.md`, section 14).
