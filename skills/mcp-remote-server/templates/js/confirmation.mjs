// confirmation.mjs - Pure confirmation gate for sensitive tools; I/O is injected (see references/confirmation.md).

const SENSITIVE = ["A", "B"];

const MESSAGES = {
  pending: "The user has not confirmed yet. Show the link again and wait for the user to say they confirmed.",
  refused: "The user refused this action. Do not retry unless the user asks again.",
  revoked: "This connection was removed, so the confirmation is no longer valid.",
  fresh: "This action needs the user's confirmation. Show the summary and the link to the user; after they confirm on the page, repeat the same call with the same arguments.",
};

export function canonicalJson(value) {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (value && typeof value === "object") {
    const keys = Object.keys(value).filter((k) => value[k] !== undefined).sort();
    return `{${keys.map((k) => `${JSON.stringify(k)}:${canonicalJson(value[k])}`).join(",")}}`;
  }
  return JSON.stringify(value ?? null);
}

export async function sha256Hex(text) {
  const bytes = await globalThis.crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return Array.from(new Uint8Array(bytes), (b) => b.toString(16).padStart(2, "0")).join("");
}

export function stripConfirmation(args) {
  const { confirmation_id: confirmationId, ...rest } = args || {};
  return { args: rest, confirmationId: confirmationId || null };
}

export function argsHash(args) {
  return sha256Hex(canonicalJson(stripConfirmation(args).args));
}

// Hash only what the user approved (target and before/after), never warnings or relative times.
export function previewHash(preview) {
  return sha256Hex(canonicalJson({ target: preview?.target ?? null, fields: preview?.fields ?? [] }));
}

// cfg: { classes: {tool: "A"|"B"|"C"}, conditions: {tool: (args) => class}, dryRun: {tool: "simulate"|"write"} }
export function classOfCall(name, args, cfg) {
  const byCondition = cfg.conditions?.[name];
  return byCondition ? byCondition(args) : cfg.classes[name] ?? "none";
}

export function writesInThisCall(name, args, cfg) {
  const mode = cfg.dryRun?.[name];
  if (mode === "simulate") return args.simulate === false;
  if (mode === "write") return args.simulate !== true;
  return true;
}

export function needsConfirmation(name, args, cfg) {
  return SENSITIVE.includes(classOfCall(name, args, cfg)) && writesInThisCall(name, args, cfg);
}

export function pendingResult({ id, link, expiresAt, summary }, message = MESSAGES.fresh) {
  const structured = { status: "confirmation_pending", confirmation_id: id, link, expires_at: expiresAt, summary };
  return {
    isError: false,
    structuredContent: structured,
    content: [{ type: "text", text: `${message}\n\n${summary}\n${link}` }],
  };
}

function refusal(text) {
  return { isError: true, content: [{ type: "text", text }] };
}

// deps: { cfg, consume, create, buildPreview, linkFor }; returns { run, args, confirmationId } or { result, log }.
export async function gate(call, deps) {
  const { name, userId, connectionId } = call;
  const { args, confirmationId } = stripConfirmation(call.args);
  if (!needsConfirmation(name, args, deps.cfg)) return { run: true, args, confirmationId: null };

  const cls = classOfCall(name, args, deps.cfg);
  const hash = await argsHash(args);
  const keys = { userId, connectionId, tool: name, argsHash: hash };
  const consumed = await deps.consume({ ...keys, id: confirmationId });

  let situation = consumed.situation;
  if (situation === "ok" && cls === "A") {
    const now = await previewHash(await deps.buildPreview(name, args));
    if (now !== consumed.previewHash) situation = "changed";
  }
  if (situation === "ok") return { run: true, args, confirmationId: consumed.id };

  if (situation === "refused") return { result: refusal(MESSAGES.refused), log: { write: true, ok: false, error: situation } };
  if (situation === "revoked") return { result: refusal(MESSAGES.revoked), log: { write: true, ok: false, error: situation } };

  const preview = await deps.buildPreview(name, args);
  const row = await deps.create({ ...keys, cls, preview, previewHash: await previewHash(preview) });
  const pending = { id: row.id, link: deps.linkFor(row.id), expiresAt: row.expiresAt, summary: preview.title || name };
  const first = situation === "missing";
  return {
    result: pendingResult(pending, situation === "pending" ? MESSAGES.pending : MESSAGES.fresh),
    confirmationId: row.id,
    log: first ? { write: false, ok: true } : { write: true, ok: false, error: situation },
  };
}
