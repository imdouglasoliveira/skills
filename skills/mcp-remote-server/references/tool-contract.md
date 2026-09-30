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
  input: {
    order_id: { type: "string", description: "Unique order identifier" }
  },
  required: ["order_id"],
  output: { type: "object" },
  run: async ({ order_id }, ctx) => { /* ... */ }
});
```

---

## 2. Input and Output Schemas

Every tool must publish an `inputSchema` and an `outputSchema`.
- The list of mandatory fields in `required` is published directly in `inputSchema` so client models know what arguments cannot be omitted.
- Where a field uses a closed vocabulary, it must be represented as an `enum` derived from the source definition. When input fails validation, the error refusal lists the accepted values explicitly.
- Responses must return `structuredContent` conforming to `outputSchema`, while also serializing the payload into `content[0].text` for compatibility with clients that do not parse structured content blocks.

---

## 3. List Pagination and Truncation Warnings (N-03)

Truncating lists without informing the client causes AI agents to make faulty assumptions about total counts. When a list is limited:
- The response must include a `notice` object with `cut_at` indicating the slice boundary and pointing to the full-list tool.
- A silent cut is strictly forbidden.

---

## 4. Write Operations and Batch Guarantees

Write operations must follow predictable state guarantees:
- **Batch writes**: When multiple items are updated in one call, process item by item and return individual statuses: `changed`, `unchanged`, or `refused`.
- **Re-reading state**: After applying database side effects, the tool must re-read the affected row and return both previous and current state to confirm successful persistence.

---

## 5. Destructive Operations (N-04)

Any tool marked as `destructive: true` must require a literal `confirm` string parameter in both its `input` schema and its `required` array. This parameter must be validated before executing any read or side effect.

---

## 6. Error Formatting

Errors are categorized into three distinct layers:
1. **Business/domain refusal**: Returns HTTP 200 with an MCP error envelope where `isError: true` and a helpful explanation.
2. **Protocol error**: Formatted as standard JSON-RPC error codes (e.g. `-32602` Invalid params, `-32020` HeaderMismatch).
3. **Unexpected internal error**: Returns a sanitized generic message accompanied by a log trace reference like `(ref N)` to facilitate operator debugging without leaking sensitive internal details.

---

## 7. Instructions and Discovery

Server-wide guidance and workflow guidelines for client agents should be provided through the `instructions` field of the server discovery response.
