/**
 * tool-contract.mjs - Tool definition, validation and list helpers for remote MCP servers.
 *
 * Copy this file into your project and adapt:
 *   - Tool definitions: call defineTool() for each tool your server exposes.
 *   - Use toListEntry() to build the tools/list response.
 *   - Use scopeMap() to derive the scope map from your definitions.
 *   - Use cutNotice() when paginating the tool list.
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
  // Destructive tools must have a literal "confirm" field in input and required
  if (def.destructive) {
    if (!Object.prototype.hasOwnProperty.call(def.input || {}, "confirm")) {
      throw new Error(`defineTool: destructive "${def.name}" must have a "confirm" property in input`);
    }
    if (!(def.required || []).includes("confirm")) {
      throw new Error(`defineTool: destructive "${def.name}" must include "confirm" in required`);
    }
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
  return {
    name: tool.name,
    title: tool.title,
    description: tool.description,
    inputSchema: {
      type: "object",
      properties: tool.input,
      required: tool.required,
      additionalProperties: false,
    },
    outputSchema: tool.output,
    annotations: {
      readOnlyHint: tool.readOnly,
      destructiveHint: tool.destructive,
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
