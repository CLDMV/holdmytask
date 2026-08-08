import { test, expect, describe, beforeAll, afterAll } from "vitest";
import { spawnSync } from "node:child_process";
import { mkdtempSync, mkdirSync, copyFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

// devcheck.mjs resolves `src/`/`dist/` relative to its own file location and reads
// process.env, so each case runs a COPY of it in a purpose-built fixture directory
// with a from-scratch env (only PATH), preventing the real CI environment this suite
// runs in from leaking `CI`/`GITHUB_ACTIONS` into the subprocess and skewing results.
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const devcheckSrc = path.join(repoRoot, "devcheck.mjs");

let tmpRoot;

beforeAll(() => {
	tmpRoot = mkdtempSync(path.join(tmpdir(), "holdmytask-devcheck-"));
});

afterAll(() => {
	if (tmpRoot) rmSync(tmpRoot, { recursive: true, force: true });
});

/**
 * Materialize a fixture: a directory containing a copy of devcheck.mjs, plus
 * optional src/ and dist/ subdirs, optionally nested under a node_modules/<pkg>
 * path to simulate an installed package. Returns the path to the devcheck copy.
 */
let counter = 0;
function makeFixture({ src = true, dist = false, installed = false } = {}) {
	const base = path.join(tmpRoot, `f${counter++}`);
	const pkgDir = installed ? path.join(base, "node_modules", "@cldmv", "holdmytask") : path.join(base, "holdmytask");
	mkdirSync(pkgDir, { recursive: true });
	if (src) mkdirSync(path.join(pkgDir, "src"), { recursive: true });
	if (dist) mkdirSync(path.join(pkgDir, "dist"), { recursive: true });
	copyFileSync(devcheckSrc, path.join(pkgDir, "devcheck.mjs"));
	return path.join(pkgDir, "devcheck.mjs");
}

function runDevcheck(fixtureOpts, env = {}) {
	const devcheck = makeFixture(fixtureOpts);
	// From-scratch env: only PATH (so node runs); nothing else unless explicitly set.
	const result = spawnSync(process.execPath, [devcheck], {
		env: { PATH: process.env.PATH, ...env },
		encoding: "utf8"
	});
	return { status: result.status, stderr: result.stderr || "" };
}

describe("devcheck", () => {
	test("advises and exits non-zero in a source checkout with no dist and no dev condition", () => {
		const { status, stderr } = runDevcheck({ src: true, dist: false });
		expect(status).toBe(1);
		expect(stderr).toContain("Development environment not properly configured");
		expect(stderr).toContain("--conditions=holdmytask-dev");
	});

	test("stays silent when the holdmytask-dev condition is set", () => {
		const { status, stderr } = runDevcheck({ src: true, dist: false }, { NODE_OPTIONS: "--conditions=holdmytask-dev" });
		expect(status).toBe(0);
		expect(stderr).toBe("");
	});

	test("stays silent once dist/ has been built (even without the condition)", () => {
		const { status, stderr } = runDevcheck({ src: true, dist: true });
		expect(status).toBe(0);
		expect(stderr).toBe("");
	});

	test("does NOT fire when a generic development condition is set (namespacing)", () => {
		// The old generic `development` condition must no longer satisfy the check -
		// otherwise a consumer's dev settings would mask a genuinely unbuilt checkout.
		const { status } = runDevcheck({ src: true, dist: false }, { NODE_OPTIONS: "--conditions=development" });
		expect(status).toBe(1);
	});

	test("skips in CI", () => {
		const { status, stderr } = runDevcheck({ src: true, dist: false }, { CI: "true" });
		expect(status).toBe(0);
		expect(stderr).toBe("");
	});

	test("skips when installed as a dependency (parent dir is node_modules)", () => {
		const { status, stderr } = runDevcheck({ src: true, dist: false, installed: true });
		expect(status).toBe(0);
		expect(stderr).toBe("");
	});

	test("does nothing when there is no src/ (published dist-only layout)", () => {
		const { status, stderr } = runDevcheck({ src: false, dist: true });
		expect(status).toBe(0);
		expect(stderr).toBe("");
	});
});
