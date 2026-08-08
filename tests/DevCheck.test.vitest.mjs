import { test, expect, describe, beforeAll, afterAll } from "vitest";
import { spawnSync } from "node:child_process";
import { mkdtempSync, mkdirSync, copyFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

// devcheck.mjs resolves `src/` relative to its own file location and reads process.env
// / process.execArgv, so each case runs a COPY of it in a purpose-built fixture
// directory with a from-scratch env (only PATH), preventing the real CI environment
// this suite runs in from leaking `CI`/`GITHUB_ACTIONS`/`NODE_OPTIONS` into the
// subprocess.
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const devcheckSrc = path.join(repoRoot, "devcheck.mjs");

let tmpRoot;
let counter = 0;

beforeAll(() => {
	tmpRoot = mkdtempSync(path.join(tmpdir(), "holdmytask-devcheck-"));
});

afterAll(() => {
	if (tmpRoot) rmSync(tmpRoot, { recursive: true, force: true });
});

// Materialize a fixture dir with a copy of devcheck.mjs plus optional src/ and dist/,
// optionally nested under node_modules/<scope>/<pkg> to simulate an installed package.
function makeFixture({ src = true, dist = false, installed = false } = {}) {
	const base = path.join(tmpRoot, `f${counter++}`);
	const pkgDir = installed ? path.join(base, "node_modules", "@cldmv", "holdmytask") : path.join(base, "holdmytask");
	mkdirSync(pkgDir, { recursive: true });
	if (src) mkdirSync(path.join(pkgDir, "src"), { recursive: true });
	if (dist) mkdirSync(path.join(pkgDir, "dist"), { recursive: true });
	copyFileSync(devcheckSrc, path.join(pkgDir, "devcheck.mjs"));
	return path.join(pkgDir, "devcheck.mjs");
}

// nodeArgs are passed on the node CLI (i.e. become process.execArgv); env is a
// from-scratch environment (only PATH plus whatever is given).
function runDevcheck(fixtureOpts, { env = {}, nodeArgs = [] } = {}) {
	const devcheck = makeFixture(fixtureOpts);
	const result = spawnSync(process.execPath, [...nodeArgs, devcheck], {
		env: { PATH: process.env.PATH, ...env },
		encoding: "utf8"
	});
	return { status: result.status, stderr: result.stderr || "" };
}

describe("devcheck", () => {
	test("nags in a source checkout when the holdmytask-dev condition is not set", () => {
		const { status, stderr } = runDevcheck({ src: true });
		expect(status).toBe(1);
		expect(stderr).toContain("Development environment not properly configured");
		expect(stderr).toContain("--conditions=holdmytask-dev");
	});

	test("stays silent when the condition is set via NODE_OPTIONS", () => {
		const { status, stderr } = runDevcheck({ src: true }, { env: { NODE_OPTIONS: "--conditions=holdmytask-dev" } });
		expect(status).toBe(0);
		expect(stderr).toBe("");
	});

	test("stays silent when the condition is passed on the node CLI (execArgv)", () => {
		// vitest passes --conditions to workers this way, so devcheck must detect it here too.
		const { status, stderr } = runDevcheck({ src: true }, { nodeArgs: ["--conditions=holdmytask-dev"] });
		expect(status).toBe(0);
		expect(stderr).toBe("");
	});

	test("NODE_ENV=development alone does NOT silence it (only the condition selects src/)", () => {
		// Keying off NODE_ENV would be a false negative: dev env set but no condition means
		// the package is still resolving to dist/, which is exactly what should be flagged.
		const { status } = runDevcheck({ src: true }, { env: { NODE_ENV: "development" } });
		expect(status).toBe(1);
	});

	test("STILL nags when dist/ has been built but the condition is not set", () => {
		// A build must NOT silence the check: with src/ present the developer should be on
		// src/ via the condition, not the stale dist/.
		const { status } = runDevcheck({ src: true, dist: true });
		expect(status).toBe(1);
	});

	test("does NOT accept a generic development condition (namespacing)", () => {
		const { status } = runDevcheck({ src: true }, { nodeArgs: ["--conditions=development"] });
		expect(status).toBe(1);
	});

	test("does NOT match a condition that merely contains 'holdmytask-dev' as a substring", () => {
		// Exact-value match, not substring: --conditions=not-holdmytask-dev must NOT silence it.
		const { status } = runDevcheck({ src: true }, { nodeArgs: ["--conditions=not-holdmytask-dev"] });
		expect(status).toBe(1);
	});

	test("accepts holdmytask-dev among comma-separated conditions", () => {
		const { status } = runDevcheck({ src: true }, { nodeArgs: ["--conditions=foo,holdmytask-dev,bar"] });
		expect(status).toBe(0);
	});

	test("skips in CI", () => {
		const { status, stderr } = runDevcheck({ src: true }, { env: { CI: "true" } });
		expect(status).toBe(0);
		expect(stderr).toBe("");
	});

	test("skips when installed as a scoped dependency (node_modules/@cldmv/holdmytask)", () => {
		const { status, stderr } = runDevcheck({ src: true, installed: true });
		expect(status).toBe(0);
		expect(stderr).toBe("");
	});

	test("does nothing when there is no src/ (published dist-only layout)", () => {
		const { status, stderr } = runDevcheck({ src: false, dist: true });
		expect(status).toBe(0);
		expect(stderr).toBe("");
	});
});
