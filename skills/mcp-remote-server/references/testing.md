# Testing Strategy and Test Layer Architecture

This reference outlines test layers, automation boundaries, matrix derivation, and fixture hygiene for remote MCP servers.

---

## 1. Test Layers Overview

A complete remote MCP server test strategy spans several distinct layers:
1. **Unit tests with injected I/O**: Pure logic in `.mjs` modules tested with mock stores.
2. **Textual and contract guards**: Automated assertions verifying conformance facts against references.
3. **Database migrations**: Applied to temporary databases to verify schema validity.
4. **SQL smoke tests**: Running `check:sql-conventions` and verifying RLS and RPC boundaries (`smoke`).
5. **Burst and concurrency tests**: Simulating parallel bursts (`burst`) of requests from the same user to detect session race conditions and token refresh deadlocks.
6. **Live wire integration tests**: End-to-end tests talking over real HTTP transports.
7. **Client verification**: Testing actual AI client connections across the three proof levels.

Every new guard added to the test suite must be verified through deliberate mutation testing to confirm that the test fails when the invariant is broken. Examples: make `needsConfirmation` return false; remove the delegated-session refusal from the decision function.

---

## 2. Derived Case Matrix

Rather than hand-crafting arbitrary tests, the test matrix is derived systematically from the tool catalog:
- For every tool in the catalog, generate:
  1. A happy-path test exercising valid inputs with full permissions.
  2. A permission test invoking the tool without scope to assert proper refusal.
  3. Edge-case tests covering boundary values, empty lists, and invalid input parameters.
- For every sensitive tool (class A or B), generate dedicated cases: the first call executes nothing and returns a link; a pending, refused, expired, changed-argument or other-connection confirmation does not execute; a consumed confirmation executes exactly once and a second identical call asks again. Full list in `confirmation.md` section 12.
- Add two permanent guards: classification parity (every write tool classified, no read tool) and gate-before-handler (source scan: every handler and relay call is preceded by the confirmation check).

---

## 3. Fixture Hygiene and Blocklists

- Test data must be synthetically generated and explicitly tagged (e.g. `synthetic_test_item_123`).
- Clean up test fixtures using an exact list of created primary keys, never with broad wildcard or prefix deletions (e.g. `DELETE WHERE name LIKE 'test_%'`), to prevent accidental deletion of co-located data.
- The test harness must maintain a strict blocklist of real production domains and customer email patterns, aborting immediately if live production identifiers appear in test parameters.

---

## 4. Live Wire Automation Safeguards

Live wire integration suites make actual network requests and execute database operations:
- A live wire suite never runs in CI, git commit hooks, or automated cron jobs. It must only run manually with explicit developer intent.
- Implement an anti-automation guard at the entry point of live wire scripts that aborts if CI environment variables (`CI=true` or the CI provider's own marker variable) are detected.

---

## 5. Dual Oracle Validation

Validating tool execution requires a dual oracle:
1. The immediate HTTP response payload returned to the client.
2. The corresponding audit row inserted into `mcp_request_log`.
Every end-to-end test must verify that the response payload and the audit log record are paired by id and reflect consistent parameters, durations, and status flags.

---

## 6. Ceiling Mode Verification

The test harness must validate both deployment ceiling modes:
- In `deny` mode: verify that a user lacking a row for a domain receives zero permissions.
- In `allow` mode: verify that a user lacking a row for a domain receives full access by default.

---

## 7. Catalog Contract Tests

- **Catalog snapshot**: names, scopes, enums and `required` of every tool, compared with a stored snapshot that changes only when updated on purpose (an explicit flag), so a catalog change is always a reviewed change.
- **Domains never shrink**: parse the migrations and fail if the permission domain list in SQL loses an entry (a migration that recreates the function from an older version drops newer domains).
- **SQL versus code ceiling**: the ceiling computed by the database grants the same scopes as the code's ceiling function for the same rows.
- **Screen versus server payload**: for configuration tools, the payload the app's screen builds and the one the server builds from tool arguments are equal.
- **Writes in dependency order**: prove write tools in a fixed order where each step uses the previous step's output, never in isolation with `{}`; skip dependents when a predecessor failed; a tool missing from `tools/list` counts as not executed.
- **Counting writes**: count with `write && ok`; scope refusals carry `write = true, ok = false` (`usage-log.md`, section 7). Pair log rows with responses by id, not by time, and do not let a run cross a deploy.

---

## 8. Aggregator Tests

Add the layers listed in `aggregator-relay.md`, section 14: dispatcher call counters, refresh race cases,
connect replay and downgrade-during-exchange, secrets scan in error translation, one log row per outcome,
SQL rehearsal in a rolled-back transaction, and a comparison of the existing static guards' red set before
and after the change.

---

## 9. Guard Proofs Through the Real Route

- A guard that depends on identity (kind of credential, origin, restriction) is proven with a credential minted the real way and sent through the real route. A hand-built identity object proves nothing once the identity mapper changes; a regression there can leave every such test green.
- Assert annotations on the served `tools/list`: every tool has boolean `readOnlyHint` and `destructiveHint`, checked on a read, a write and a destructive tool.
- Instructions test: a length cap, and every tool name cited in the guide exists.
- Every refusal case has a positive control next to it (exact `resource` accepted, trailing slash refused at both endpoints), so a check that refuses everything cannot pass.
- Census tests: scan source text to assert that every reader of protected tables goes through the visibility or tenant helper; keep an allow-list with a reason per entry and fail on entries that no longer match anything.
- Workers test pool: pass the D1 migrations as a binding and apply them in a setup file, use a single worker, disable remote bindings, reset tables in each file, and give the first heavy import a longer timeout in CI.
