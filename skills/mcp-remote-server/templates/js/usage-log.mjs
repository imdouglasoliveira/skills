/**
 * usage-log.mjs - Pure usage log helpers for remote MCP servers.
 *
 * Copy this file into your project. No external imports, no I/O.
 * Adapt DEFAULT_REDACTED_KEYS to your domain if you store additional sensitive fields.
 * The insert call itself lives in your server code; this module only builds the row.
 */

export const DEFAULT_REDACTED_KEYS = [
  "email", "phone", "token", "secret", "password",
  "authorization", "apikey", "document",
];

/**
 * Redact sensitive argument values.
 * Matching is case-insensitive substring; the key is preserved, the value becomes "[redacted]".
 * Only top-level keys are redacted (one level deep).
 *
 * @param {unknown} args
 * @param {string[]} [keys]
 * @returns {unknown} A new object with sensitive values replaced.
 */
export function redactArgs(args, keys = DEFAULT_REDACTED_KEYS) {
  if (args === null || typeof args !== "object" || Array.isArray(args)) {
    return args;
  }
  const lowerKeys = keys.map(k => k.toLowerCase());
  const out = /** @type {Record<string, unknown>} */ ({});
  for (const [k, v] of Object.entries(/** @type {Record<string, unknown>} */ (args))) {
    const kl = k.toLowerCase();
    const sensitive = lowerKeys.some(lk => kl.includes(lk));
    out[k] = sensitive ? "[redacted]" : v;
  }
  return out;
}

/**
 * Summarize a tool result without copying any values.
 * Returns the top-level keys of an object (or first item of a list), a count, and a truncation flag.
 *
 * @param {unknown} result
 * @returns {{ keys: string[], items: number|null, truncated: boolean }}
 */
export function summarizeResult(result) {
  if (result === null || result === undefined) {
    return { keys: [], items: null, truncated: false };
  }
  if (Array.isArray(result)) {
    const first = result[0];
    const keys = (first !== null && typeof first === "object" && !Array.isArray(first))
      ? Object.keys(/** @type {object} */ (first)).slice(0, 40)
      : [];
    const truncated = keys.length === 40 && Object.keys(/** @type {object} */ (first)).length > 40;
    return { keys, items: result.length, truncated };
  }
  if (typeof result === "object") {
    const allKeys = Object.keys(result);
    const keys = allKeys.slice(0, 40);
    return { keys, items: null, truncated: allKeys.length > 40 };
  }
  return { keys: [], items: null, truncated: false };
}

/**
 * Build a log row ready for database insertion.
 * Arguments are redacted; result is summarized; error is truncated to 500 chars.
 *
 * @param {{
 *   userId: string,
 *   connectionId: string|null,
 *   tokenId: string|null,
 *   origin: "oauth"|"pat",
 *   client: string|null,
 *   protocol: string|null,
 *   tool: string,
 *   write: boolean,
 *   target: string|null,
 *   args: unknown,
 *   result: unknown,
 *   ok: boolean,
 *   error: string|null,
 *   durationMs: number
 * }} input
 * @returns {object} Row ready to INSERT into mcp_request_log.
 */
export function buildLogRow(input) {
  return {
    user_id: input.userId,
    connection_id: input.connectionId,
    token_id: input.tokenId,
    origin: input.origin,
    client: input.client,
    protocol: input.protocol,
    tool: input.tool,
    write: input.write,
    target: input.target,
    args_redacted: redactArgs(input.args),
    result_summary: summarizeResult(input.result),
    ok: input.ok,
    error: input.error ? input.error.slice(0, 500) : null,
    duration_ms: input.durationMs,
  };
}

/**
 * Build a human-readable reference string for a log row ID.
 * Use this in error messages returned to the client so operators can find the row.
 *
 * @param {number|string} id
 * @returns {string} E.g. "(ref 123)"
 */
export function errorRef(id) {
  return `(ref ${id})`;
}
