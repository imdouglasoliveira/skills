# User Access Management Screens

This reference describes the user interface flows, admin screens, consent modals, and security patterns for remote MCP servers.

---

## 1. Ceiling Management Screen (Admin)

The ceiling management view lets administrators configure access per user across all exposed domains:
- **Matrix Layout**: Rows display users, columns display registered functional domains.
- **Access Levels**: For each user x domain cell, an administrator chooses from three explicit levels:
  1. `none`: No access to the domain.
  2. `read`: Read-only queries permitted.
  3. `write`: Read and write mutations permitted.
- **Write Availability Rule**: The `write` option is enabled only for domains configured with write capability in `mcp_domains` (`write_enabled = true`). Domains without write support disable or hide the write option.
- **Persistence**: Invokes `rpc_mcp_admin_set_ceiling(user_id, domain, level)`.

```
+-------------------------------------------------------------------------------+
| User Ceiling Administration                                                   |
+---------------------+-------------------+-------------------+-----------------+
| User                | Orders Domain     | Catalog Domain    | Customers Domain|
+---------------------+-------------------+-------------------+-----------------+
| alice@example.com   | [ Read & Write v] | [ Read Only    v] | [ None       v] |
| bob@example.com     | [ Read Only    v] | [ Read Only    v] | [ None       v] |
+---------------------+-------------------+-------------------+-----------------+
```

---

## 2. Ceiling Audit History (Admin)

Every ceiling update is tracked in an append-only audit trail:
- Displays who changed the ceiling, timestamp when it changed, previous level (`from`), and new level (`to`).
- Gives visibility into administrative authorization decisions for security reviews.

---

## 3. My Connected Applications Screen (End User)

End users manage active AI connections established under their account:
- Displays connected AI clients, granted scopes, connection creation dates, and when each connection was last used (needed when idle connections expire; see `auth-modes.md`, section 10).
- Users can adjust granted scopes up to (but never exceeding) their current administrative ceiling.
- Clicking revoke immediately invalidates the connection and cascades to revoke all linked OAuth access tokens, refresh tokens, and active PATs.

---

## 4. Consent and Scopes Screen (OAuth Handshake)

During the OAuth 2.1 authorization code flow, users approve or reject access requests:
- Displays the client identity, requested scopes, and purpose.
- Only scopes that fall within the user's current administrative ceiling are selectable:
  $$\text{approvable scopes} = \text{requested scopes} \cap \text{user ceiling}$$
- Consent labels must match human-friendly descriptions documented in the integration guide.
- Group requested scopes by level. Clients usually ask for read only, so add an unchecked "optional write" group built from the user's ceiling.
- On submit, drop any scope outside the ceiling (a forged form field must not widen the grant); "nothing granted" is a denial.
- When the app has a second factor, the consent requires it once per new connection, and the function that records the decision checks it too (for example the session's assurance level), not only the screen. An existing connection never asks again; idle expiry is what sends people back through consent. The same applies to the admin function that writes ceilings.
- Make approval idempotent: a per-request completion mark set in the same redirect means a repeated POST (back button, double submit) shows a "done" page and issues no second code or grant. Denial is not marked.
- Render the page on the server with a strict CSP and no script. Do not set `form-action`: it breaks the redirect to loopback clients. Show a client logo only for a verified client identity; label the others unverified.
- Send the issuer parameter on both the approve and the deny redirect.

---

## 5. Admin Role Enforcement on Management RPCs (N-13)

Every remote procedure call (RPC) that reads usage logs or manages user ceilings must verify that the calling identity possesses an administrator role (`admin`), not merely that a valid session exists. Authenticated non-admin users must be rejected immediately with an authorization error.

---

## 6. Closed Database Tables and Security Definer RPCs

All internal `mcp_*` tables in the database are completely closed:
- Table-level Row Level Security (RLS) is enabled.
- Zero client-facing policies are defined (`create policy` is omitted).
- All permissions are revoked from `anon`, `authenticated`, and `public`.
- The user interface interacts exclusively through `security definer` functions where permissions are explicitly managed using `revoke execute ... from public, anon` placed before `grant execute ... to authenticated`.
- `mcp_confirmations` is closed the same way: its read and decide functions are granted to `authenticated`, its create and consume functions to the service role only.

---

## 7. Explicit Error Handling in UI

User interface components must render failure alerts visibly when RPCs fail or networks disconnect. Silently masking an error with a fallback like `return null` hides authorization rejections from operators and frustrates users.

---

## 8. Confirmation Page (End User)

A protected host-app route opened from the link a sensitive tool returns. It shows the connected client's name, the action in human language, a before/after table and items, the deadline, and Refuse / Confirm buttons. Confirm requires a recently typed second-factor code; the page challenges first when the session lacks one. It refuses assistant (delegated) sessions and other people's links with neutral messages. Full behavior in `confirmation.md` sections 6 and 9.

---

## 9. Allow, Remove and Block

Keep "who may sign in" apart from "who was judged unfit":
- **Allowlist**: sign-in identities with status `allowed` or `removed`. Removing stops new sign-ins; it does not block the person's other identities.
- **Blocklist**: typed identifiers (e-mail, identity subject, IP or network prefix, device hash, whole person). An active block beats everything.
- **Block revokes everything**: blocking also revokes every PAT, session and OAuth grant of the target, and reports how many of each.
- **Backstop**: the per-call re-check (`permissions.md`, section 11) catches what revocation missed, such as a PAT left alive after a removal or a direct database edit.
- **History**: allow and block tables keep an append-only history written in the same transaction or batch as the change.
- **Sign-in attempts**: if you keep them, never store cookies, tokens or form bodies; derive a device hash with a keyed HMAC; set a retention period.
