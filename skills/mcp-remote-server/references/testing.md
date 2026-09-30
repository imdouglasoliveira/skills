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

Every new guard added to the test suite must be verified through deliberate mutation testing to confirm that the test fails when the invariant is broken.

---

## 2. Derived Case Matrix

Rather than hand-crafting arbitrary tests, the test matrix is derived systematically from the tool catalog:
- For every tool in the catalog, generate:
  1. A happy-path test exercising valid inputs with full permissions.
  2. A permission test invoking the tool without scope to assert proper refusal.
  3. Edge-case tests covering boundary values, empty lists, and invalid input parameters.
- For every tool marked as `destructive: true`, generate a dedicated case verifying that omitting or falsifying the `confirm` parameter rejects execution prior to any data read.

---

## 3. Fixture Hygiene and Blocklists

- Test data must be synthetically generated and explicitly tagged (e.g. `synthetic_test_item_123`).
- Clean up test fixtures using an exact list of created primary keys, never with broad wildcard or prefix deletions (e.g. `DELETE WHERE name LIKE 'test_%'`), to prevent accidental deletion of co-located data.
- The test harness must maintain a strict blocklist of real production domains and customer email patterns, aborting immediately if live production identifiers appear in test parameters.

---

## 4. Live Wire Automation Safeguards

Live wire integration suites make actual network requests and execute database operations:
- A live wire suite never runs in CI, git commit hooks, or automated cron jobs. It must only run manually with explicit developer intent.
- Implement an anti-automation guard at the entry point of live wire scripts that aborts if CI environment variables (`CI=true`, `GITHUB_ACTIONS=true`) are detected.

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
