/**
 * proxy-routes.mjs - Closed-route proxy helpers for remote MCP servers.
 *
 * Copy this file into your project. Adapt `targets` when calling routeFor().
 * The proxy exposes exactly the routes listed in routeFor(); everything else returns 404 locally.
 * This file has no external imports, no Deno.env, no fetch.
 */

/**
 * Headers to forward from the client to the upstream MCP resource.
 * mcp-method and mcp-name are required by MCP spec 2026-07-28 for POST requests.
 */
export const REQUEST_HEADERS = [
  "authorization",
  "content-type",
  "accept",
  "mcp-protocol-version",
  "mcp-session-id",
  "mcp-method",
  "mcp-name",
  "origin",
  "user-agent",
];

/**
 * Headers that must never reach the upstream (security / encoding control).
 */
export const DROPPED_REQUEST_HEADERS = ["cookie", "apikey", "accept-encoding"];

/**
 * Headers to forward from the upstream back to the client.
 */
export const RESPONSE_HEADERS = [
  "content-type",
  "www-authenticate",
  "location",
  "retry-after",
  "cache-control",
];

/**
 * Detect path traversal attempts.
 * @param {string} pathname
 * @returns {boolean}
 */
function hasDangerousPath(pathname) {
  const lower = pathname.toLowerCase();
  if (/%2e|%2f|%5c/.test(lower)) return true;
  if (pathname.includes("\\")) return true;
  const segments = pathname.split("/");
  if (segments.some(s => s === "." || s === "..")) return true;
  return false;
}

/**
 * Resolve a pathname to an upstream target URL, or null if the route is not in the closed list.
 * A null return means the proxy should respond 404 locally without contacting any upstream.
 *
 * @param {string} pathname
 * @param {{ mcp: string, oauth: string }} targets  Base URLs without trailing slash.
 * @returns {string|null} Full upstream URL, or null.
 */
export function routeFor(pathname, targets) {
  // Reject dangerous paths before any routing
  if (hasDangerousPath(pathname)) return null;

  // MCP resource routes
  if (pathname === "/" || pathname === "/mcp") {
    return targets.mcp;
  }
  if (
    pathname === "/.well-known/oauth-protected-resource" ||
    pathname === "/.well-known/oauth-protected-resource/mcp"
  ) {
    return targets.mcp + "/.well-known/oauth-protected-resource";
  }

  // OAuth authorization server routes
  if (
    pathname === "/.well-known/oauth-authorization-server" ||
    pathname === "/.well-known/oauth-authorization-server/oauth"
  ) {
    return targets.oauth + "/.well-known/oauth-authorization-server";
  }
  if (
    pathname === "/.well-known/openid-configuration" ||
    pathname === "/.well-known/openid-configuration/oauth"
  ) {
    return targets.oauth + "/.well-known/openid-configuration";
  }
  if (pathname === "/oauth" || pathname.startsWith("/oauth/")) {
    const rest = pathname.slice("/oauth".length);
    return targets.oauth + (rest || "");
  }

  return null;
}

/**
 * Build the headers to forward from a client request to the upstream.
 * Includes REQUEST_HEADERS allowlist plus x-mcp-header-* and x-forwarded-*.
 *
 * @param {Headers} incoming
 * @param {{ clientIp?: string, publicHost: string }} ctx
 * @returns {Record<string, string>}
 */
export function forwardRequestHeaders(incoming, ctx) {
  /** @type {Record<string, string>} */
  const out = {};
  const allowed = new Set(REQUEST_HEADERS);
  const dropped = new Set(DROPPED_REQUEST_HEADERS);
  incoming.forEach((value, key) => {
    const kl = key.toLowerCase();
    if (dropped.has(kl)) return;
    if (allowed.has(kl) || kl.startsWith("x-mcp-header-") || kl.startsWith("x-forwarded-")) {
      out[key] = value;
    }
  });
  if (ctx.clientIp) {
    out["x-forwarded-for"] = ctx.clientIp;
  }
  out["x-forwarded-host"] = ctx.publicHost;
  return out;
}

/**
 * Build the headers to forward from an upstream response back to the client.
 * Includes RESPONSE_HEADERS allowlist plus access-control-* headers.
 *
 * @param {Headers} upstream
 * @returns {Record<string, string>}
 */
export function forwardResponseHeaders(upstream) {
  /** @type {Record<string, string>} */
  const out = {};
  const allowed = new Set(RESPONSE_HEADERS);
  upstream.forEach((value, key) => {
    const kl = key.toLowerCase();
    if (allowed.has(kl) || kl.startsWith("access-control-")) {
      out[key] = value;
    }
  });
  return out;
}
