import { test, expect, describe, beforeAll, afterAll } from "vitest";
import { spawnSync } from "node:child_process";
import { mkdtempSync, mkdirSync, copyFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

// devcheck.mjs resolves `src/` relative to its own file location and reads
// process.env, so each case runs a COPY of it in a purpose-built fixture directory
// with a from-scratch env (only PATH), preventing the real CI environment this suite
// runs in from leaking `CI`/`GITHUB_ACTIONS`/`NODE_OPTIONS` into the subprocess.
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

// Materialize a fixture dir with a copy of devcheck.mjs plus optional src/ and dist/.
function makeFixture({ src = true, dist = false } = {}) {
	const pkgDir = path.join(tmpRoot, `f${counter++}`);
	mkdirSync(pkgDir, { recursive: true });
	if (src) mkdirSync(path.join(pkgDir, "src"), { recursive: true });
	if (dist) mkdirSync(path.join(pkgDir, "dist"), { recursive: true });
	copyFileSync(devcheckSrc, path.join(pkgDir, "devcheck.mjs"));
	return path.join(pkgDir, "devcheck.mjs");
}

function runDevcheck(fixtureOpts, env = {}) {
	const devcheck = makeFixture(fixtureOpts);
	const result = spawnSync(process.execPath, [devcheck], {
		env: { PATH: process.env.PATH, ...env },
		encoding: "utf8"
	});
	return { status: result.status, stderr: result.stderr || "" };
}

describe("devcheck", () => {
	test("nags in a source checkout when neither NODE_ENV nor the dev condition is set", () => {
		const { status, stderr } = runDevcheck({ src: true }, { NODE_ENV: "production" });
		expect(status).toBe(1);
		expect(stderr).toContain("Development environment not properly configured");
		expect(stderr).toContain("--conditions=holdmytask-dev");
	});

	test("stays silent with the holdmytask-dev condition set (even when NODE_ENV isn't development)", () => {
		const { status, stderr } = runDevcheck({ src: true }, { NODE_ENV: "production", NODE_OPTIONS: "--conditions=holdmytask-dev" });
		expect(status).toBe(0);
		expect(stderr).toBe("");
	});

	test("stays silent with NODE_ENV=development", () => {
		const { status, stderr } = runDevcheck({ src: true }, { NODE_ENV: "development" });
		expect(status).toBe(0);
		expect(stderr).toBe("");
	});

	test("STILL nags when dist/ has been built but the dev condition is not set", () => {
		// The presence of a build must NOT silence the check: with src/ present the
		// developer should be running from src/ via the condition, not the stale dist/.
		const { status } = runDevcheck({ src: true, dist: true }, { NODE_ENV: "production" });
		expect(status).toBe(1);
	});

	test("does NOT accept a generic development condition (namespacing)", () => {
		const { status } = runDevcheck({ src: true }, { NODE_ENV: "production", NODE_OPTIONS: "--conditions=development" });
		expect(status).toBe(1);
	});

	test("skips in CI", () => {
		const { status, stderr } = runDevcheck({ src: true }, { NODE_ENV: "production", CI: "true" });
		expect(status).toBe(0);
		expect(stderr).toBe("");
	});

	test("does nothing when there is no src/ (published dist-only layout)", () => {
		const { status, stderr } = runDevcheck({ src: false, dist: true }, { NODE_ENV: "production" });
		expect(status).toBe(0);
		expect(stderr).toBe("");
	});
});
