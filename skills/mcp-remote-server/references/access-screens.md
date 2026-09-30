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
- Displays connected AI clients, granted scopes, and connection creation dates.
- Users can adjust granted scopes up to (but never exceeding) their current administrative ceiling.
- Clicking revoke immediately invalidates the connection and cascades to revoke all linked OAuth access tokens, refresh tokens, and active PATs.

---

## 4. Consent and Scopes Screen (OAuth Handshake)

During the OAuth 2.1 authorization code flow, users approve or reject access requests:
- Displays the client identity, requested scopes, and purpose.
- Only scopes that fall within the user's current administrative ceiling are selectable:
  $$\text{approvable scopes} = \text{requested scopes} \cap \text{user ceiling}$$
- Consent labels must match human-friendly descriptions documented in the integration guide.

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

---

## 7. Explicit Error Handling in UI

User interface components must render failure alerts visibly when RPCs fail or networks disconnect. Silently masking an error with a fallback like `return null` hides authorization rejections from operators and frustrates users.
