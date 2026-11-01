/**
 *
 *	@Project: @cldmv/holdmytask
 *	@Filename: /tests/cjs/entry.test.cjs
 *	@Date: 2026-10-03T00:00:00-07:00 (1791010800)
 *	@Author: Nate Corcoran <CLDMV>
 *	@Email: <Shinrai@users.noreply.github.com>
 *	-----
 *	@Last modified by: Nate Corcoran <CLDMV> (Shinrai@users.noreply.github.com)
 *	@Last modified time: 2026-10-03T10:31:55-07:00 (1791048715)
 *	-----
 *	@Copyright: Copyright (c) 2013-2026 Catalyzed Motivation Inc. All rights reserved.
 *
 */

/**
 * Entry-point tests. These run under Node's own test runner (`node --test`), not Vitest:
 * Vitest loads files through its own module runner, so it cannot show whether a plain
 * `require()` of the package works the way it does for a CommonJS consumer. `test:cjs`
 * builds dist/ first and runs this file with --conditions=holdmytask-dev.
 */
"use strict";

const { test } = require("node:test");
const assert = require("node:assert/strict");
const { spawnSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

const repoRoot = path.resolve(__dirname, "../..");

const CJS_KEYS = ["HoldMyTask", "Queue", "QueueManager", "TaskManager", "TaskProcessor", "TaskQueue", "queue"];
const ESM_KEYS = [
	"HoldMyTask",
	"Queue",
	"QueueManager",
	"TaskManager",
	"TaskProcessor",
	"TaskQueue",
	"createHoldMyTask",
	"createQueue",
	"createTaskManager",
	"createTaskProcessor",
	"default",
	"queue"
];

/**
 * Checks that a CJS entry keeps the historical shape: the class itself as module.exports,
 * with the class aliases as properties, all the same object as the ESM entry's default.
 * @param {Function} required - What require() returned.
 * @param {object} esm - The ESM namespace of the sibling index.mjs.
 */
function assertSameShape(required, esm) {
	assert.equal(typeof required, "function");
	assert.deepEqual(Object.keys(required).sort(), CJS_KEYS);
	assert.deepEqual(Object.keys(esm).sort(), ESM_KEYS);
	assert.equal(required, esm.default);
	for (const key of CJS_KEYS) assert.equal(required[key], esm[key], key);
}

test("dist: require() returns the same HoldMyTask object as import", async () => {
	const HoldMyTask = require("../../dist/index.cjs");
	const esm = await import("../../dist/index.mjs");
	assertSameShape(HoldMyTask, esm);

	// Cheap smoke call - no timers running (autoStart: false), destroy immediately.
	const instance = new HoldMyTask({ autoStart: false });
	assert.ok(instance instanceof HoldMyTask);
	assert.equal(HoldMyTask.name, "HoldMyTask");
	instance.destroy();
	assert.ok((await esm.createQueue({ autoStart: false })) instanceof HoldMyTask);
});

test("src: src/index.cjs loads from source with the same shape", async () => {
	const required = require("../../src/index.cjs");
	const esm = await import("../../src/index.mjs");
	assertSameShape(required, esm);
});

test("dist/index.cjs is a verbatim copy of src/index.cjs", () => {
	assert.equal(
		fs.readFileSync(path.join(repoRoot, "dist/index.cjs"), "utf8"),
		fs.readFileSync(path.join(repoRoot, "src/index.cjs"), "utf8")
	);
});

test("require() fails with a clear message where Node.js has no require(esm)", () => {
	// --no-experimental-require-module turns require(esm) off, which is what Node.js
	// versions before 20.19 / 22.12 look like to the entry.
	const res = spawnSync(process.execPath, ["--no-experimental-require-module", "-e", "require('./dist/index.cjs')"], {
		cwd: repoRoot,
		encoding: "utf8"
	});

	assert.notEqual(res.status, 0);
	assert.match(res.stderr, /ERR_REQUIRE_ESM/);
	assert.match(res.stderr, /require\(\) needs Node\.js \^20\.19\.0 or >=22\.13\.0/);
	assert.match(res.stderr, /import\(\)/);
});

test("the holdmytask-dev condition routes require() and import() of the package to src/", async () => {
	// This file runs with --conditions=holdmytask-dev (package.json "test:cjs"), so the
	// package's self-reference resolves through that branch of the "." export.
	assert.equal(require.resolve("@cldmv/holdmytask"), path.join(repoRoot, "src", "index.cjs"));
	assert.equal(require("@cldmv/holdmytask"), require("../../src/index.cjs"));
	const esm = await import("@cldmv/holdmytask");
	assert.equal(esm.HoldMyTask, (await import("../../src/index.mjs")).HoldMyTask);
});

test("dist/index.mjs loads ../devcheck.mjs instead of bundling it", () => {
	const bundle = fs.readFileSync(path.join(repoRoot, "dist/index.mjs"), "utf8");
	assert.match(bundle, /createRequire\(import\.meta\.url\)\(\s*["']\.\.\/devcheck\.mjs["']\s*\)/);
	assert.doesNotMatch(bundle, /Development environment not properly configured/);
});

test("dist/main.mjs re-exports dist/index.mjs instead of carrying a second bundle", () => {
	const alias = fs.readFileSync(path.join(repoRoot, "dist/main.mjs"), "utf8");
	assert.match(alias, /from\s*["']\.\/index\.mjs["']/);
	assert.doesNotMatch(alias, /class HoldMyTask/);
	assert.ok(alias.length < 1024, `dist/main.mjs is ${alias.length} bytes`);
});

/**
 * Runs an ESM snippet from the repo root with a scrubbed environment (no CI flags or
 * NODE_OPTIONS leaking in from the machine running the suite).
 * @param {string[]} nodeArgs - Extra node CLI flags.
 * @param {string} code - Module source to evaluate.
 * @returns {import("node:child_process").SpawnSyncReturns<string>} The child's result.
 */
function runModule(nodeArgs, code) {
	return spawnSync(process.execPath, [...nodeArgs, "--input-type=module", "-e", code], {
		cwd: repoRoot,
		env: { PATH: process.env.PATH },
		encoding: "utf8"
	});
}

test("the deprecated ./main alias warns once and exports the root's objects (dist)", () => {
	// The condition only satisfies devcheck here (dist/ is loaded by path, not through it).
	const ok = runModule(
		["--conditions=holdmytask-dev"],
		`const a = await import("./dist/main.mjs"); await import("./dist/main.mjs");
		const root = await import("./dist/index.mjs");
		if (a.HoldMyTask !== root.HoldMyTask || a.default !== root.default) process.exit(2);
		console.log(JSON.stringify(Object.keys(a).sort()));`
	);
	assert.equal(ok.status, 0, ok.stderr);
	assert.deepEqual(JSON.parse(ok.stdout), ESM_KEYS);
	assert.equal(ok.stderr.match(/CLDMV_HOLDMYTASK_MAIN/g)?.length, 1, ok.stderr);
	assert.match(ok.stderr, /DeprecationWarning: "@cldmv\/holdmytask\/main" is deprecated; import "@cldmv\/holdmytask" instead\./);
});

test("the src entry exits before any library code without the holdmytask-dev condition", () => {
	for (const [file, code] of [
		["src/index.mjs", `await import("./src/index.mjs"); console.log("loaded");`],
		[
			"src/index.cjs",
			`import { createRequire } from "node:module"; createRequire(import.meta.url)("./src/index.cjs"); console.log("loaded");`
		]
	]) {
		const res = runModule([], code);
		assert.equal(res.status, 1, `${file}: ${res.stderr}`);
		assert.doesNotMatch(res.stdout, /loaded/, file);
		assert.match(res.stderr, /holdmytask-dev/, file);

		const ok = runModule(["--conditions=holdmytask-dev"], code);
		assert.equal(ok.status, 0, `${file}: ${ok.stderr}`);
		assert.match(ok.stdout, /loaded/, file);
	}
});
