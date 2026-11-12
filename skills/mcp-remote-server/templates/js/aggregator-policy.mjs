// aggregator-policy.mjs - Dispatcher bridge into the existing call pipeline, and a per-origin circuit breaker; I/O is injected (see references/aggregator-discovery.md and references/aggregator-composition.md).

import { parseToolRef } from "./aggregator-discovery.mjs";

const UNKNOWN = "There is no tool with this reference that you can use. Search again with relay_tools_search.";

// deps.runPipeline must be the same function tools/call uses for relayed tools, so the dispatcher adds no second gate.
export async function dispatchByRef({ identity, input }, deps) {
  const { tool_ref: toolRef, arguments: args, confirmation_id: confirmationId } = input ?? {};
  const tool = parseToolRef(toolRef) ? deps.registry.byRef.get(toolRef) : undefined;
  const validArgs = args !== null && typeof args === "object" && !Array.isArray(args);
  if (!tool || !deps.inProfile(tool) || !validArgs) {
    return deps.refuse({ identity, name: "relay_tool_call", code: "unknown", text: UNKNOWN });
  }
  return deps.runPipeline({ identity, name: tool.publishedName, args, confirmationId: confirmationId ?? null, via: "dispatcher" });
}

export function dispatcherPendingMessage() {
  return "This action needs the user's confirmation. Show the summary and the link to the user; after they confirm on the page, call relay_tool_call again with the same tool_ref, the same arguments and this confirmation_id.";
}

const AVAILABILITY = new Set(["timeout", "network", "http_5xx", "format"]);

export function countsAsUnavailable(outcome) {
  return AVAILABILITY.has(outcome);
}

export function createBreaker({ threshold = 5, cooldownMs = 30_000, now = () => Date.now() } = {}) {
  const origins = new Map();
  const closed = { state: "closed", failures: 0, openedAt: 0 };
  const get = (id) => origins.get(id) ?? closed;

  return {
    canCall(id) {
      const s = get(id);
      if (s.state === "closed") return true;
      if (s.state === "open" && now() - s.openedAt >= cooldownMs) {
        origins.set(id, { ...s, state: "half_open" });
        return true;
      }
      return false;
    },
    record(id, outcome) {
      if (!countsAsUnavailable(outcome)) {
        origins.set(id, closed);
        return;
      }
      const s = get(id);
      const failures = s.failures + 1;
      const open = s.state === "half_open" || failures >= threshold;
      origins.set(id, { state: open ? "open" : "closed", failures, openedAt: open ? now() : s.openedAt });
    },
    state(id) {
      return get(id).state;
    },
  };
}
