/**
 * permissions.mjs - Pure permission logic for remote MCP servers.
 *
 * Copy this file into your project and adapt:
 *   - DOMAINS: the list of domains your server exposes
 *   - CEILING_MODE: "deny" (safe default) or "allow" (open by default)
 *
 * No external imports; no I/O. All state comes in as parameters.
 */

export const LEVELS = /** @type {const} */ (["none", "read", "write"]);
export const CEILING_MODES = /** @type {const} */ (["deny", "allow"]);

/**
 * Build the full scope catalog for a list of domains.
 * @param {string[]} domains
 * @returns {string[]} Stable-ordered array like ["orders:read", "orders:write", ...]
 */
export function scopeCatalog(domains) {
  const out = [];
  for (const d of domains) {
    out.push(`${d}:read`);
    out.push(`${d}:write`);
  }
  return out;
}

/**
 * Derive ceiling scopes for a user given their ceiling rows and the project mode.
 *
 * @param {Record<string, "none"|"read"|"write">} rows  Map of domain -> level from the DB ceiling table.
 * @param {string[]} domains                            Full domain list (same order as scopeCatalog).
 * @param {"deny"|"allow"} mode                         Project ceiling mode.
 * @returns {string[]} Granted ceiling scopes.
 *
 * Rules:
 *   - domain with row "write"  -> grants "<d>:read" and "<d>:write"
 *   - domain with row "read"   -> grants "<d>:read"
 *   - domain with row "none"   -> grants nothing
 *   - domain without row:
 *       mode "deny"  -> grants nothing  (same as "none")
 *       mode "allow" -> grants "<d>:read" and "<d>:write"
 */
export function ceilingScopes(rows, domains, mode) {
  const out = [];
  for (const d of domains) {
    const level = Object.prototype.hasOwnProperty.call(rows, d) ? rows[d] : (mode === "allow" ? "write" : "none");
    if (level === "write") {
      out.push(`${d}:read`);
      out.push(`${d}:write`);
    } else if (level === "read") {
      out.push(`${d}:read`);
    }
    // "none" -> nothing
  }
  return out;
}

/**
 * Compute the effective scopes as the intersection of token scopes and the current ceiling.
 * Write implies read: if ceiling grants "x:write", a token scope of "x:read" is also satisfied.
 *
 * @param {string[]} tokenScopes  Scopes requested/granted in the token.
 * @param {string[]} ceiling      Output of ceilingScopes().
 * @returns {string[]} Effective scopes, sorted, without duplicates.
 */
export function effectiveScopes(tokenScopes, ceiling) {
  // Expand ceiling: "d:write" implies "d:read" is also in ceiling
  const ceilingSet = new Set(ceiling);
  for (const s of ceiling) {
    if (s.endsWith(":write")) {
      ceilingSet.add(s.replace(":write", ":read"));
    }
  }
  const catalog = new Set([...ceilingSet]);
  // Filter token scopes: must be in catalog (not outside) AND in ceilingSet
  const result = [];
  for (const s of tokenScopes) {
    if (catalog.has(s) && ceilingSet.has(s)) {
      result.push(s);
    }
  }
  // Deduplicate and sort for stable output
  return [...new Set(result)].sort();
}

/**
 * Filter a tool list to only those the user is allowed to call.
 *
 * @param {{name: string, scope: string|null}[]} tools   Tool definitions.
 * @param {string[]} effective                            Output of effectiveScopes().
 * @returns {{name: string, scope: string|null}[]}       Filtered list in original order.
 *
 * scope null = any read scope suffices (the tool is readable by anyone with at least one read scope).
 */
export function allowedTools(tools, effective) {
  const effectiveSet = new Set(effective);
  const hasAnyRead = effective.some(s => s.endsWith(":read"));
  return tools.filter(t => {
    if (t.scope === null) return hasAnyRead;
    return effectiveSet.has(t.scope);
  });
}

/**
 * ScopeError is thrown when required scopes are missing.
 * The .required property lists ALL missing scopes (not just the first).
 */
export class ScopeError extends Error {
  /**
   * @param {string[]} required
   */
  constructor(required) {
    super(`insufficient_scope: missing ${required.join(", ")}`);
    this.name = "ScopeError";
    /** @type {string[]} */
    this.required = required;
  }
}

/**
 * Assert that the effective scopes satisfy the required scopes.
 * Throws ScopeError listing ALL missing scopes if any are absent.
 *
 * @param {string[]} effective   Output of effectiveScopes().
 * @param {string|string[]} required  One or more required scopes.
 */
export function requireScope(effective, required) {
  const effectiveSet = new Set(effective);
  const needs = Array.isArray(required) ? required : [required];
  const missing = needs.filter(s => !effectiveSet.has(s));
  if (missing.length > 0) {
    throw new ScopeError(missing);
  }
}

/**
 * Build the value for the WWW-Authenticate header when scopes are insufficient.
 *
 * @param {string[]} required              Missing scopes.
 * @param {string} resourceMetadataUrl     URL of the OAuth protected resource metadata document.
 * @returns {string}
 */
export function insufficientScopeHeader(required, resourceMetadataUrl) {
  return `Bearer error="insufficient_scope", scope="${required.join(" ")}", resource_metadata="${resourceMetadataUrl}"`;
}
