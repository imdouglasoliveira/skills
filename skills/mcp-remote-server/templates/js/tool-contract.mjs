/**
 * tool-contract.mjs - Tool definition, validation and list helpers for remote MCP servers.
 *
 * Copy this file into your project and adapt:
 *   - Tool definitions: call defineTool() for each tool your server exposes.
 *   - Use toListEntry() to build the tools/list response.
 *   - Use scopeMap() to derive the scope map from your definitions.
 *   - Use cutNotice() when paginating the tool list.
 *   - Declare sensitivity on every write tool (see references/confirmation.md).
 *
 * No external imports, no I/O. All validation is synchronous.
 */

const TOOL_NAME_RE = /^[a-z][a-z0-9]*(_[a-z0-9]+)+$/;

/**
 * @typedef {{
 *   name: string,
 *   title: string,
 *   description: string,
 *   scope: string|null,
 *   readOnly: boolean,
 *   destructive: boolean,
 *   sensitivity?: "A"|"B"|"C"|"none",
 *   preview?: Function,
 *   input: Record<string, object>,
 *   required: string[],
 *   output: object,
 *   run: Function
 * }} ToolDef
 */

/**
 * Validate and freeze a tool definition.
 *
 * @param {ToolDef} def
 * @returns {Readonly<ToolDef>}
 * @throws {Error} With a message naming the invalid field.
 */
export function defineTool(def) {
  if (!TOOL_NAME_RE.test(def.name)) {
    throw new Error(`defineTool: name "${def.name}" must match /^[a-z][a-z0-9]*(_[a-z0-9]+)+$/`);
  }
  if (def.readOnly && def.destructive) {
    throw new Error(`defineTool: "${def.name}" cannot be both readOnly and destructive`);
  }
  if (!def.output || typeof def.output !== "object") {
    throw new Error(`defineTool: "${def.name}" must have an output schema`);
  }
  // Validate input properties: each must have a description
  for (const [prop, schema] of Object.entries(def.input || {})) {
    if (!schema || typeof schema !== "object" || !/** @type {any} */ (schema).description) {
      throw new Error(`defineTool: "${def.name}" input property "${prop}" must have a description`);
    }
  }
  // required must only cite existing input properties
  for (const req of def.required || []) {
    if (!Object.prototype.hasOwnProperty.call(def.input || {}, req)) {
      throw new Error(`defineTool: "${def.name}" required cites unknown property "${req}"`);
    }
  }
  // Sensitive tools are gated by the server (see references/confirmation.md); a "confirm" input is forbidden.
  if (Object.prototype.hasOwnProperty.call(def.input || {}, "confirm")) {
    throw new Error(`defineTool: "${def.name}" must not declare a "confirm" input; the server gates sensitive tools`);
  }
  if (def.readOnly && def.sensitivity && def.sensitivity !== "none") {
    throw new Error(`defineTool: read-only "${def.name}" cannot be sensitive`);
  }
  if (!def.readOnly && !["A", "B", "C"].includes(String(def.sensitivity))) {
    throw new Error(`defineTool: write tool "${def.name}" must declare sensitivity A, B or C`);
  }
  return Object.freeze(def);
}

/**
 * Derive a scope map from an array of tool definitions.
 * The map has exactly one entry per tool name.
 *
 * @param {ReadonlyArray<Readonly<ToolDef>>} tools
 * @returns {Record<string, string|null>}
 */
export function scopeMap(tools) {
  /** @type {Record<string, string|null>} */
  const map = {};
  for (const t of tools) {
    map[t.name] = t.scope;
  }
  return map;
}

/**
 * Build an MCP tools/list entry from a tool definition.
 *
 * @param {Readonly<ToolDef>} tool
 * @returns {object}
 */
export function toListEntry(tool) {
  const gated = isGated(tool);
  const properties = gated
    ? {
        ...tool.input,
        confirmation_id: {
          type: "string",
          format: "uuid",
          description: "Optional. Id from the confirmation link, after the user confirmed.",
        },
      }
    : tool.input;
  return {
    name: tool.name,
    title: tool.title,
    description: tool.description,
    inputSchema: {
      type: "object",
      properties,
      required: tool.required,
      additionalProperties: false,
    },
    outputSchema: gated ? { anyOf: [tool.output, PENDING_OUTPUT] } : tool.output,
    annotations: {
      readOnlyHint: tool.readOnly,
      destructiveHint: gated || tool.destructive,
      openWorldHint: false,
    },
  };
}

/**
 * Build a cut notice when a paginated tool list is truncated.
 * Returns null when no truncation occurred.
 *
 * @param {number} returned    Number of tools returned in this response.
 * @param {number} total       Total number of tools available.
 * @param {string} fullListTool  Name of the tool that returns the full list.
 * @returns {{ notice: string, cut_at: number, total: number }|null}
 */
export function cutNotice(returned, total, fullListTool) {
  if (returned >= total) return null;
  return {
    notice: `Showing ${returned} of ${total} tools. Call "${fullListTool}" to get the full list.`,
    cut_at: returned,
    total,
  };
}

// Output of the first call of a sensitive tool (references/confirmation.md, section 8).
export const PENDING_OUTPUT = Object.freeze({
  type: "object",
  properties: {
    status: { type: "string", enum: ["confirmation_pending"] },
    confirmation_id: { type: "string", format: "uuid" },
    link: { type: "string" },
    expires_at: { type: "string" },
    summary: { type: "string" },
  },
  required: ["status", "confirmation_id", "link", "expires_at", "summary"],
});

// Classes A and B go through the confirmation gate; C and reads run directly.
export function isGated(tool) {
  return tool.sensitivity === "A" || tool.sensitivity === "B";
}
