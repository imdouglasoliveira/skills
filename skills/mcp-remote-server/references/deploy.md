# Deploy Pipeline and Operator Runbook

This reference covers the release order, smoke checks and bootstrap of a remote MCP server on any runtime. Runtime-specific deploy notes stay in `runtime-supabase.md` (section 10) and `runtime-cloudflare.md`.

---

## 1. Pipeline Order

1. **Verify**: type check, unit and guard tests, SQL smoke.
2. **Apply migrations** to the remote database **before** the code deploy.
3. **Deploy** the code.
4. **Smoke** the public URL (section 2).
5. **Tag** the release.

Restrict the production environment to the main branch, and end the pipeline with a job that always reports each step's result, so a failed smoke is not hidden behind a green deploy.

---

## 2. Smoke Checks

- Health returns 200. Retry with a limit: DNS and certificates lag on a first deploy.
- An unauthenticated `POST` to the MCP route returns 401 with the `WWW-Authenticate` challenge.
- The protected-resource metadata `resource` equals the public URL byte for byte (N-05).
- After a catalog change, refresh the tool list in each client (`clients.md`, section 4).

---

## 3. Migrations

- **Expansion only**: add tables, columns and functions; a new nullable column keeps the old behavior; unreadable data fails closed. Removal is a separate, later release.
- The code must work before and after its migration (`runtime-supabase.md`, section 10).
- Remote and local migration runners can split statements differently: test trigger and function bodies in the form the remote runner accepts.
- A test that drops a table also checks that no orphan index remains, with a positive control that the other tables still exist.

---

## 4. Credentials and Bootstrap

- Document the deploy token's exact permissions (account and zone rights). Pass the account id explicitly on every command when the token can see more than one account.
- Note which secrets can only be set after the first deploy; until they exist, sign-in should deny everyone (fail closed).
- Rotate paired secrets (both sides of a signature) in one step.
- Create the first tenant, admin and ceiling with an idempotent bootstrap script that reads identities from the environment, never from arguments or the repository, and offers `--dry-run`. Do not dry-run in a shared log if the output would print a personal identifier.
