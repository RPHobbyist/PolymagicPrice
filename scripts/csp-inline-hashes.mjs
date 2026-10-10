/*
 * PolymagicPrice - post-build CSP hardening
 * Copyright (C) 2025 Rp Hobbyist
 *
 * Replaces the INLINE_SCRIPT_HASHES placeholder in dist/_headers with a sha256 source for every
 * inline <script> in dist/index.html, so `script-src` no longer needs 'unsafe-inline'.
 *
 * Why a build step: the page carries seven inline scripts — the Trusted Types policy and six
 * application/ld+json blocks that Google reads — and Cloudflare Pages serves static headers, so
 * there is no request-time nonce to hand out. Hashes are stable because the markup is static.
 *
 * A browser ignores 'unsafe-inline' as soon as a hash or nonce is present, so a missed script is
 * a blocked script: run `npm run build` (which calls this) rather than `vite build` alone, and
 * check a preview deployment before promoting it.
 */
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const htmlPath = resolve(root, "dist/index.html");
const headersPath = resolve(root, "dist/_headers");
const PLACEHOLDER = "INLINE_SCRIPT_HASHES";

const fail = (message) => {
    console.error(`[csp] ${message}`);
    process.exit(1);
};

if (!existsSync(htmlPath)) fail("dist/index.html not found — run the build first.");
if (!existsSync(headersPath)) fail("dist/_headers not found — is public/_headers still in place?");

const html = readFileSync(htmlPath, "utf8");

// Inline scripts only: a tag with a `src` loads its code from elsewhere and is covered by 'self'.
const inlineScripts = [...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)]
    .filter(([, attrs]) => !/\bsrc\s*=/i.test(attrs))
    .map(([, , body]) => body);

if (inlineScripts.length === 0) fail("no inline scripts found — the regex or the page changed.");

// The hash is over the exact bytes between the tags, which is what the browser hashes too.
const hashes = [...new Set(
    inlineScripts.map(body => `'sha256-${createHash("sha256").update(body, "utf8").digest("base64")}'`)
)];

const headers = readFileSync(headersPath, "utf8");

if (!headers.includes(PLACEHOLDER)) {
    fail(`the ${PLACEHOLDER} placeholder is missing from _headers; refusing to ship a CSP that was not filled in.`);
}

const filled = headers.replaceAll(PLACEHOLDER, hashes.join(" "));

// Check the directive itself, not just that a replacement happened: the placeholder was once
// mentioned in a comment above the policy, and replacing only the first occurrence filled in the
// comment and shipped a CSP that still said INLINE_SCRIPT_HASHES.
const cspLine = filled.split("\n").find(line => line.includes("Content-Security-Policy:"));
if (!cspLine) fail("no Content-Security-Policy line in _headers.");
if (cspLine.includes(PLACEHOLDER)) fail("the policy still contains the placeholder after substitution.");
if (!cspLine.includes("sha256-")) fail("the policy contains no script hashes after substitution.");
if (cspLine.includes("'unsafe-inline'") && cspLine.split("style-src")[0].includes("'unsafe-inline'")) {
    fail("script-src still allows 'unsafe-inline', which makes the hashes pointless.");
}

writeFileSync(headersPath, filled, "utf8");

console.log(`[csp] script-src pinned to ${hashes.length} inline hash(es) across ${inlineScripts.length} inline script(s).`);
