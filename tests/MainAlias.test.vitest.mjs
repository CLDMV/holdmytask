/**
 *
 *	@Project: @cldmv/holdmytask
 *	@Filename: /tests/MainAlias.test.vitest.mjs
 *	@Date: 2026-11-01T00:00:00-07:00 (1793516400)
 *	@Author: Nate Corcoran <CLDMV>
 *	@Email: <Shinrai@users.noreply.github.com>
 *	-----
 *	@Last modified by: Nate Corcoran <CLDMV> (Shinrai@users.noreply.github.com)
 *	@Last modified time: 2026-11-01T00:00:00-07:00 (1793516400)
 *	-----
 *	@Copyright: Copyright (c) 2013-2026 Catalyzed Motivation Inc. All rights reserved.
 *
 */

import { test, expect, describe, vi, afterEach } from "vitest";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

afterEach(() => {
	vi.restoreAllMocks();
});

describe("@cldmv/holdmytask/main (deprecated alias)", () => {
	test("warns once with code CLDMV_HOLDMYTASK_MAIN and exports the root's objects", async () => {
		const emitWarning = vi.spyOn(process, "emitWarning").mockImplementation(() => {});

		const alias = await import("@cldmv/holdmytask/main");
		await import("@cldmv/holdmytask/main");
		const root = await import("@cldmv/holdmytask");

		expect(emitWarning).toHaveBeenCalledTimes(1);
		expect(emitWarning).toHaveBeenCalledWith('"@cldmv/holdmytask/main" is deprecated; import "@cldmv/holdmytask" instead.', {
			type: "DeprecationWarning",
			code: "CLDMV_HOLDMYTASK_MAIN"
		});

		expect(Object.keys(alias).sort()).toEqual(Object.keys(root).sort());
		expect(alias.HoldMyTask).toBe(root.HoldMyTask);
		expect(alias.default).toBe(root.default);
		for (const key of Object.keys(root)) expect(alias[key], key).toBe(root[key]);
	});

	test("falls back to console.warn where process.emitWarning is unavailable", async () => {
		vi.resetModules();
		const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
		const emitWarning = process.emitWarning;
		process.emitWarning = undefined;
		try {
			const alias = await import("@cldmv/holdmytask/main");
			expect(typeof alias.HoldMyTask).toBe("function");
		} finally {
			process.emitWarning = emitWarning;
		}
		expect(warn).toHaveBeenCalledTimes(1);
		expect(warn).toHaveBeenCalledWith('DeprecationWarning: "@cldmv/holdmytask/main" is deprecated; import "@cldmv/holdmytask" instead.');
	});

	test("prints the warning once per process under plain Node.js, silenced by --no-deprecation", () => {
		const code = `const a = await import("@cldmv/holdmytask/main"); await import("@cldmv/holdmytask/main");
			const { HoldMyTask } = await import("@cldmv/holdmytask");
			if (a.HoldMyTask !== HoldMyTask) process.exit(2);`;
		const run = (args) =>
			spawnSync(process.execPath, ["--conditions=holdmytask-dev", ...args, "--input-type=module", "-e", code], {
				cwd: repoRoot,
				env: { PATH: process.env.PATH },
				encoding: "utf8"
			});

		const loud = run([]);
		expect(loud.status, loud.stderr).toBe(0);
		expect(loud.stderr.match(/CLDMV_HOLDMYTASK_MAIN/g)).toHaveLength(1);

		const quiet = run(["--no-deprecation"]);
		expect(quiet.status, quiet.stderr).toBe(0);
		expect(quiet.stderr).not.toMatch(/CLDMV_HOLDMYTASK_MAIN/);
	});
});
