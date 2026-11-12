// aggregator-discovery.mjs - Exposure modes, registry and deterministic tool search; pure, no I/O (see references/aggregator-discovery.md).

export const MODES = ["full", "selected", "discovery"];
export const TOOL_REF = /^[a-z][a-z0-9_]{0,15}:[a-z0-9_]{1,55}$/;

const STOP_WORDS = new Set(["a", "an", "the", "of", "to", "for", "in", "on", "and", "or", "by", "with", "tool"]);
const WEIGHTS = { exactName: 5, namePrefix: 3, origin: 2, tag: 2, description: 1, wholeName: 4 };

export function formatToolRef(originId, originalName) {
  const ref = `${originId}:${originalName}`;
  if (!TOOL_REF.test(ref)) throw new Error("invalid tool reference parts");
  return ref;
}

export function parseToolRef(ref) {
  if (typeof ref !== "string" || !TOOL_REF.test(ref)) return null;
  const [originId, name] = ref.split(":");
  return { originId, name };
}

// tools: [{originId, name, publishedName, signature, ...}]; colliding published names are skipped on both sides.
export function buildRegistry(tools) {
  const byPublished = new Map();
  const collisions = new Set();
  for (const tool of tools) {
    if (byPublished.has(tool.publishedName)) collisions.add(tool.publishedName);
    else byPublished.set(tool.publishedName, tool);
  }
  for (const name of collisions) byPublished.delete(name);
  const byRef = new Map([...byPublished.values()].map((t) => [formatToolRef(t.originId, t.name), t]));
  return { byPublished, byRef, skipped: [...collisions].sort() };
}

// allowed(tool) must be the same function that builds tools/list; selected is a Set of tool refs or null.
export function chooseExposedTools({ tools, allowed, selected, mode }) {
  if (!MODES.includes(mode)) throw new Error(`unsupported exposure mode: ${mode}`);
  const permitted = tools.filter((t) => allowed(t));
  const inProfile = selected ? permitted.filter((t) => selected.has(formatToolRef(t.originId, t.name))) : permitted;
  return { listed: mode === "discovery" ? [] : mode === "full" ? permitted : inProfile, searchable: mode === "full" ? permitted : inProfile };
}

export function tokenize(text) {
  return String(text ?? "")
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((t) => t && !STOP_WORDS.has(t));
}

export function scoreTool(queryTokens, tool) {
  const nameTokens = tokenize(tool.name);
  const originTokens = tokenize(tool.originLabel ?? tool.originId);
  const descTokens = new Set(tokenize(tool.description));
  const tagTokens = new Set((tool.tags ?? []).flatMap(tokenize));
  let score = 0;
  for (const q of queryTokens) {
    if (nameTokens.includes(q)) score += WEIGHTS.exactName;
    else if (nameTokens.some((n) => n.startsWith(q))) score += WEIGHTS.namePrefix;
    if (originTokens.includes(q)) score += WEIGHTS.origin;
    if (tagTokens.has(q)) score += WEIGHTS.tag;
    if (descTokens.has(q)) score += WEIGHTS.description;
  }
  if (score > 0 && queryTokens.join("_") === nameTokens.join("_")) score += WEIGHTS.wholeName;
  return score;
}

// candidates must already be the person's searchable set from chooseExposedTools.
export function searchTools(candidates, { query, limit = 8, withSchema = false }, maxLimit = 20) {
  const cap = Math.min(Math.max(1, Number.isInteger(limit) ? limit : 8), maxLimit);
  const queryTokens = tokenize(query);
  const ranked = queryTokens.length === 0 ? [] : candidates
    .map((tool) => ({ tool, score: scoreTool(queryTokens, tool) }))
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score || (a.tool.publishedName < b.tool.publishedName ? -1 : 1));
  const page = ranked.slice(0, cap).map(({ tool }) => ({
    tool_ref: formatToolRef(tool.originId, tool.name),
    name: tool.publishedName,
    title: tool.title ?? null,
    description: tool.description ?? "",
    read_only: tool.readOnly === true,
    destructive: tool.destructive === true,
    ...(withSchema ? { inputSchema: tool.inputSchema } : {}),
  }));
  const truncated = ranked.length > page.length;
  return {
    tools: page,
    truncated,
    total: ranked.length,
    notice: truncated ? `Showing ${page.length} of ${ranked.length}. Refine the query or add a word from the tool name.` : null,
  };
}
