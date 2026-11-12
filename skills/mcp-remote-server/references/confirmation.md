# Mandatory Human Confirmation for Sensitive Tools

This reference specifies a server-enforced confirmation step for sensitive tool calls (N-04). The model can never confirm for the user: the decision happens on a page of the host app, in the user's own browser session, outside the MCP channel. It replaces the old "literal `confirm` field in input" rule, which any model can fill in by itself.

---

## 1. Why a `confirm` field is not enough

| Mechanism | Why it fails |
|---|---|
| Literal `confirm: "yes"` in `input` | The model writes it. No proof a human saw anything. |
| "Repeat to the user and wait for approval" in descriptions or server instructions | Plain text. A model can skip it or invent the approval. |
| A `simulate`/`dry_run` boolean that defaults to true | Convention only: the model can send `simulate: false` directly. The server cannot tell whether the preview was shown or whether the previewed diff is the one executed. |
| `destructiveHint` annotation | Advisory. A client's "always allow" setting for a server or tool bypasses it. |
| MCP `elicitation` | Optional client capability; needs a stateful transport (SSE plus a session). Stateless JSON-only servers and several major clients cannot use it. Revisit when both sides support it. |

Rule: the proof of consent must live in a channel the model cannot write to, and the server must check it on every execution.

---

## 2. Which tools are sensitive

Classify every tool that writes. Read tools never need confirmation.

| Class | Meaning | Confirmation | Second-factor window |
|---|---|---|---|
| **A** | Money, approvals, limits, credentials, anything hard to undo financially | Required | Short (suggested 2 min) |
| **B** | Destructive, bulk, public-facing, overwrites already-sent content, notifies third parties | Required | Longer (suggested 15 min) |
| **C** | Drafts, comments, reorder, hide/show, image upload, reversible low-impact edits | None | n/a |
| Read | `readOnly: true` | None, never | n/a |

- **Who decides:** the product owner decides the list, not the implementer. Build it as one map, `SENSITIVITY_BY_TOOL`, next to the scope map. Ship a recommended list, mark it reviewable; changing the list means editing the map.
- **Conditional classes:** classify by call, not only by tool: `classOfCall(name, args)`. Example: a text-template tool is B only when `overwrite === true`; a feedback tool is B only when it acts on behalf of other people. Keep conditions few and tested.
- **Dry-run defaults:** record per tool whether it simulates by default (`simulate !== false` means no write) or writes by default (simulates only with `simulate === true`). `writesInThisCall(name, args)` is true only for the call that actually writes. A simulation call stays free; only the writing call goes through the gate. A tool with no `simulate` parameter always writes.
- **Dynamic tools** (relayed from another MCP server or a remote catalog): classify by the effective destructive flag (declared or inferred) and send them through the same gate before the relay. Never change the signature or hash that an allow-list keys on when you add the confirmation fields to their schema.
- **Annotations:** sensitive classes force `destructiveHint: true` in `tools/list` even when the definition says false (audit tools that move money or publish but were marked non-destructive). Do not rely on the hint for enforcement; it only helps the client prompt.

---

## 3. Pending-action record

One row per requested action. Closed table: RLS on, no client policy, privileges revoked from public roles; access only through security-definer functions (see `access-screens.md` section 6).

| Field | Purpose |
|---|---|
| `id` (uuid) | Goes into the link; unguessable |
| `tenant_id`, `user_id` | Owner. Only this person can read or decide |
| `connection_id` | The MCP connection that asked; not valid on another connection |
| `tool`, `class` | What was requested and how strict |
| `args_hash` | sha256 of canonical JSON of the arguments (keys sorted recursively; `confirmation_id` excluded) |
| `preview` (jsonb, nullable) | What the user sees; may hold personal data, so cleared when no longer useful |
| `preview_hash` | sha256 of the canonical target and before/after values (not of warnings or time-relative text) |
| `status` | `pending` -> `confirmed` -> `consumed`, or `pending` -> `refused`; expiry is derived from timestamps |
| `created_at`, `expires_at` | Decision deadline (suggested 10 min) |
| `decided_at`, `decided_aal` | When, and at what assurance level |
| `consume_until` | Execute-by deadline after confirmation (suggested 10 min) |
| `consumed_at` | Single-use marker |

```sql
create table mcp_confirmations (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  user_id uuid not null references auth.users on delete cascade,
  connection_id uuid not null references mcp_connections on delete cascade,
  tool text not null,
  class text not null check (class in ('A','B')),
  args_hash text not null,
  preview jsonb,
  preview_hash text not null,
  status text not null default 'pending'
    check (status in ('pending','confirmed','refused','consumed')),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  decided_at timestamptz, decided_aal text,
  consume_until timestamptz, consumed_at timestamptz
);
create index on mcp_confirmations (user_id, connection_id, tool, args_hash, status);
alter table mcp_confirmations enable row level security;
revoke all on mcp_confirmations from anon, authenticated, public;
-- also: alter table mcp_request_log add column confirmation_id uuid;
```

Functions (all `security definer`, fixed `search_path`, `revoke ... from public, anon` before any `grant`):

| Function | Caller | Does |
|---|---|---|
| `create(...)` | server (service role) | Insert, or return the existing unexpired `pending` row with the same `(user, connection, tool, args_hash)`; refuse above a cap of pending rows per user (suggested 20) |
| `consume(user, connection, tool, args_hash, id?)` | server (service role) | Find by id, or by the same four keys. One atomic statement: `UPDATE ... SET status='consumed', consumed_at=now(), preview=null WHERE status='confirmed' AND consume_until > now() RETURNING preview_hash`. Otherwise return the situation: `pending`, `refused`, `expired`, `used`, `mismatch`, `missing`, `revoked` (connection revoked) |
| `read(id)` | the page (authenticated) | Refuses delegated sessions and other people; returns tool, class, preview, status, deadlines, client name, `recent_code` |
| `decide(id, 'confirm' or 'refuse')` | the page (authenticated) | Same refusals; `confirm` also checks the second factor; one atomic `UPDATE ... WHERE status='pending' AND expires_at > now()` (confirm vs refuse race); refuse clears `preview` |

Nothing in the MCP server ever calls `read` or `decide`.

Templates: `templates/sql/mcp_core.sql` (confirmation block) has the table, the four functions and the purge; mark the delegated-session and second-factor checks as ADAPT for your auth provider. On D1 (`templates/d1/mcp_core.sql`) there are no stored functions: the Worker runs the consume as one statement, and `read`/`decide` live in the host app's backend with the same refusals:

```sql
update mcp_confirmations set status = 'consumed', consumed_at = datetime('now'), preview = null
where id = (select id from mcp_confirmations
            where user_id = ?1 and connection_id = ?2 and tool = ?3 and args_hash = ?4
              and status = 'confirmed' and consume_until > datetime('now')
            order by decided_at desc limit 1)
  and status = 'confirmed'
returning id, preview_hash;
```

---

## 4. Flow end to end

1. **Call 1.** The model calls a sensitive tool. The server authenticates, checks scope and rate limit, validates the arguments exactly as the tool would, builds the preview with read-only queries under the user's own identity, and creates (or reuses) the pending row. **Nothing executes.** It returns the confirmation link and a short human message (section 8).
2. **Human step.** The model shows the summary and the link. The user opens it in the host app logged in as themselves, reviews the preview, completes the second factor when required, and presses Confirm (or Refuse). Status becomes `confirmed`.
3. **Call 2.** The user tells the model they confirmed; the model repeats the same call with the same arguments (optionally adding `confirmation_id`). The server computes `args_hash`, calls `consume`, and on success executes exactly once. One confirmation is one execution.
4. **Repeat.** Another execution, even an identical one, creates a new pending row and needs a new confirmation. There is no confirmation per session, conversation, tool or time period.

Design points:
- **Find by arguments, `confirmation_id` optional.** Clients cache tool lists and may not send the new field. Matching on `(user, connection, tool, args_hash)` lets the model simply retry the same call; a retry before confirming returns the same pending link instead of multiplying rows.
- **Strip `confirmation_id` from the arguments** before any handler, relay or hash: relayed servers often validate schemas strictly.
- **Place the gate after session and scope checks and before the handler**, inside the same `try`/`finally` that writes the log row. For relayed tools, place it before the relay call. Enforce by a source-reading test: every handler invocation and every relay call must come after the `needsConfirmation` check.
- **No "yes" in the chat.** Update server instructions and tool descriptions: show the summary and link, wait for the user to say they confirmed, repeat the call. The page is the "yes"; the model must not ask for another in chat.
- Keep the old description text intact and prepend one fixed warning constant, so tests that anchor on description endings stay valid.

---

## 5. Preview rendering rules

Each sensitive tool has an optional `preview(args, ctx)`; read-only, run under the user's identity (so row-level security applies).

- Run the tool's own validations first (ids, required reason, scope). An invalid call returns the human error and creates no row; otherwise the user burns a confirmation on a call that would fail.
- Shape: `{ title, target, fields: [{label, before, after}], items?: [{label, detail}], total_items?, warnings?: string[] }`.
- Human language: no internal ids, values with currency and units, names not codes, "before -> after" for every field the call changes.
- Bulk calls: list up to a cap (suggested 50) plus "and N more"; show totals per currency; confirm the whole batch once.
- Free text supplied by the model (reason, description) is labeled "Provided by the assistant" and truncated (suggested 500 characters). Untrusted: render as text only, never as HTML.
- Mask personal data inside items (emails, phones) and store no more than the preview needs.
- Class A needs a bespoke preview. Class B may use a generic one (human tool name, resolved target, arguments as a readable list).
- Parity guard: every input key of a class A tool appears as a `fields[].label` or in a justified `NO_PREVIEW_EFFECT` list.
- On execution, class A recomputes the preview and compares `preview_hash` with the confirmed one. If it differs (the record changed in between), refuse with "the item changed since you confirmed" and create a new confirmation.

---

## 6. Second factor

- Confirming requires a recently typed TOTP code, read from the session's authentication-method claims (a `totp` entry whose timestamp is inside the class window). `aal2` alone is not enough: users who enrolled a factor already browse at `aal2`, so an agent driving their open browser could click Confirm.
- Windows: A short (2 min: every money action asks for a code), B longer (15 min: several actions in a row ask once). The window only spares retyping the code; every action still needs its own Confirm click on its own page.
- Refusing never needs a code.
- Users without a factor are sent to enrollment and return to the same URL. Do not offer "confirm without code" for them: that reopens the hole.
- The page shows the code challenge before enabling Confirm when `recent_code` is false. Use a dedicated hook that reads the factor list and the claim; do not reuse a hook that skips the challenge at `aal2`.
- Record as explicit product decisions: window per class, treatment of users with no factor.

---

## 7. Binding and replay protection

| Threat | Control |
|---|---|
| Model confirms on its own | `decide` and `read` refuse the delegated (MCP-minted) session; only a real user login reaches the page |
| Another person opens the link | `read` and `decide` compare `user_id` with the caller; the page shows a neutral "this belongs to someone else" |
| Confirmation reused for another action | user, `connection_id`, `tool` and `args_hash` must all match, else `mismatch` |
| Same confirmation executed twice | Atomic single-statement consume; concurrent consumes give one success and one `used` |
| Confirmation outlives the connection | `consume` returns `revoked` when the connection is revoked |
| State changed between preview and run | Class A recomputes `preview_hash` |
| Stale pending rows | Decision deadline plus execute-by deadline; expired rows return `expired` |
| Flooding | Cap on pending rows per user; reuse of the identical pending row |
| Personal data lingering | `preview` nulled on consume, refuse or expiry; scheduled purge of old rows (suggested 7 days); the permanent trail is the usage log |

Idempotency summary: identical retries before confirmation return the same link; a retry after execution gets `used` and a fresh confirmation, never a second silent execution.

---

## 8. What the tool returns to the model

Call 1 returns a normal, non-error result (`isError: false`) so clients do not treat it as a failure:

```json
{
  "status": "confirmation_pending",
  "confirmation_id": "<uuid>",
  "link": "<app url>/mcp/confirm/<uuid>",
  "expires_at": "<iso>",
  "summary": "<short human summary of the preview>"
}
```

- Also put link and summary in `content[0].text`: "This action needs the user's confirmation. Show the summary and the link to the user; after they confirm on the page, repeat the same call with the same arguments." Clients that read only text must still work.
- Publish `outputSchema` as `anyOf: [<tool output>, <pending output>]` for sensitive tools; clients validate `structuredContent` against it. Test that the pending shape validates against every sensitive tool's schema.
- Add an optional `confirmation_id` (uuid) to the sensitive tools' `inputSchema` and force `destructiveHint: true`.
- Build the link from the host app's public base URL, not from the MCP server's own URL helpers.
- Other situations, all human-readable and none executing: still pending ("the user has not confirmed yet", same link), refused ("the user refused; do not retry unless they ask again"), expired (new confirmation created), mismatch, revoked, changed since confirmation.
- Never expose raw hints, internal codes or stack traces to the model; keep the `(ref N)` pattern for unexpected errors.

---

## 9. The confirmation page

- A protected route that returns to the same URL after login; centered card; title naming the action, the connection (client name), a "before -> after" table, items, warnings, countdown to expiry. Preview rendered as text only.
- Buttons: Refuse (secondary) and Confirm (destructive style for class A).
- States, each with a humane message and technical detail only in the console: loading, pending, already decided, expired, belongs to another person, assistant session (neutral text; also covers impersonation), error.
- After deciding: "Done. Go back to the conversation and tell the assistant you confirmed", or "Refused. The assistant will not run it."
- Icons from the project's single icon set, never text characters.

---

## 10. Audit log rows (N-14)

- The call that only creates or returns a pending row logs `write = false`, `ok = true`, `result_summary = {keys: ["status"]}` and `confirmation_id`. The "writes only" filter in the usage view must not show a write that never happened.
- The execution logs `write = true`, `ok = true/false` and the same `confirmation_id`, so call 1 and call 2 join on it.
- Refusals (still pending, refused, expired, mismatch, revoked, changed) log `write = true, ok = false` with a short reason, like scope refusals.
- Add `confirmation_id` to `mcp_request_log`; add the new table to `fn_mcp_purge`.
- Argument redaction (`usage-log.md` section 3) still applies; the preview is never copied into the log.

---

## 11. Failure modes

| Situation | Behavior |
|---|---|
| Confirmation table or function missing at deploy | Gate fails closed: the tool refuses, never executes. Deploy order: migration, then app page, then server |
| Preview query fails | Humane error, no row created |
| User has no factor | Page leads to enrollment (classes A and B) |
| Connection revoked after confirm | `revoked`, no execution |
| Concurrent consume | One wins |
| Model repeats with changed arguments | `mismatch`/new pending row; the old confirmation stays unused |
| Client cached the old tool list (no `confirmation_id`) | Still works through argument matching; after publishing, refresh the connector in each client |
| Model asks for a chat "yes" anyway | Harmless; the page remains the only valid confirmation |

---

## 12. Tests to write

- **Database smoke (real SQL, not mocks):** create is idempotent for identical keys; cap on pending rows; closed table and function grants; consume once, second consume `used`; different args, connection, tool or user gives `mismatch`; expired; revoked; concurrent consume (real Postgres only); delegated session refused on `read` and `decide`; other user refused; class A code 10 min old refused and 30 s old accepted; class B window; `aal1` refused; double decide refused; refuse needs no code; preview null after consume or refuse; purge deletes old rows and keeps recent ones (with a positive control).
- **Server through the real entry point (no private mock):** a sensitive call without confirmation does not call the handler, creates a row, returns pending with the link in structured and text content, logs `write = false`; same call again returns the same link; a consumed confirmation runs the handler once with no `confirmation_id` in its arguments and logs `write = true`; pending, refused and changed-argument cases do not run; relayed tools pass the gate and reach upstream without `confirmation_id`; `tools/list` shows the hint, the field and the `anyOf` schema without changing relay signatures; dry-run-default tools do not gate the simulation call; class C and read tools run directly.
- **Page:** every state, challenge shown on a stale claim, no-factor path, Confirm calls `decide`, other person's message.
- **Permanent guard:** every write tool is classified and no read tool is; every A/B tool with a dry-run is in the default-behavior map; every A tool has a preview and field parity; a source scan proves the gate precedes every handler and relay call; the pending shape validates against each output schema.
- **Mutation checks (`testing.md`):** make `needsConfirmation` return false; remove the delegated-session refusal in `decide`. Each must make a named test fail.
- **Manual:** with the client's "always allow" on, request an action, open the link, confirm with the code, repeat the call; request a second action in the same conversation (new link, new code); open a link as another user; call a read tool (no link).
- Existing tests that run sensitive tools directly, the catalog snapshot (description hashes) and any generated test schema dump change: update them in the same change.

---

## 13. Pitfalls found in review

| Pitfall | Fix |
|---|---|
| `aal2` taken as proof of presence | Require a recent `totp` entry in the session claims |
| Class B with no second factor | Longer window instead of none |
| Pending result breaks clients that validate `structuredContent` | `outputSchema` as `anyOf` with the pending shape |
| Link built from the MCP server's URL helper | Use the host app's public base URL |
| Preview without the tool's validations burns confirmations | Validate first, then preview |
| Preview with personal data kept for months | Null at end of life, purge in days, mask items |
| Retries multiply pending rows | Reuse the identical unexpired row, cap per user |
| Round trips tire the user | Class C and simulation stay free; one confirmation per batch; no chat "yes" |
| Tools that simulate only when `simulate === true` treated like default-simulate ones | Per-tool default map, tested |
| Sensitive tools marked non-destructive | Force the hint in `tools/list`; the classification map and guard are the real control |
| Gate forgotten on a route (relay) | Source-scan test plus a relay test |
| Dynamic tool signature changed by the new field | Add fields after computing the signature |
| Pending call logged as a write | `write = false` on pending |
| New tool escapes classification | Parity test fails when a write tool is unclassified |

---

## 14. Other Entry Points

Every door that can run a tool (MCP endpoint, chat bot, queue consumer, REST side door) runs the same gate.
- No channel accepts a model-typed `confirm`, a chat "yes" or a bot message as consent. The confirmation page is the only valid "yes".
- A chat-bot channel may deliver the summary and the link to the human; the decision still happens on the page, in the person's own session.
- A queue consumer or scheduled job has no human present: it never runs a class A or B call unless a confirmation for the same user, tool and argument hash was already consumed for it. Otherwise it records the pending link for the person and stops.

---

## 15. Through an Aggregator Dispatcher

When relayed tools are called through a dispatcher (`relay_tool_call`, `aggregator-discovery.md`, section 5), the gate binds to the **concrete tool**, never to the dispatcher.
- `tool` in the pending-action record is the concrete published name; `args_hash` is computed over the concrete tool's `arguments` only. `tool_ref`, `confirmation_id` and any dispatcher field stay out of the hash.
- `confirmation_id` is a top-level dispatcher field, stripped before the relay; it never reaches the origin and never enters the tool signature.
- The pending text tells the model to call the dispatcher again with the same `tool_ref`, the same `arguments` and the `confirmation_id`, because the concrete tool is not in its list.
- A confirmation created by a direct call is valid through the dispatcher and the reverse, when user, connection, concrete tool and argument hash match.
- Tests: a sensitive tool reached through the dispatcher returns the pending link and never relays on the first call; a confirmation for tool X does not run tool Y through the dispatcher with the same arguments.
