/**
 *
 *	@Project: @cldmv/holdmytask
 *	@Filename: /.configs/vitest.config.mjs
 *	@Date: 2025-11-09T18:48:36-08:00 (1762742916)
 *	@Author: Nate Corcoran <CLDMV>
 *	@Email: <Shinrai@users.noreply.github.com>
 *	-----
 *	@Last modified by: Nate Corcoran <CLDMV> (Shinrai@users.noreply.github.com)
 *	@Last modified time: 2026-11-01T09:53:57-08:00 (1793555637)
 *	-----
 *	@Copyright: Copyright (c) 2013-2026 Catalyzed Motivation Inc. All rights reserved.
 *
 */

import { defineConfig, mergeConfig } from "vitest/config";
import { devCondition } from "@cldmv/configs/vitest.config.mjs";
import { fileURLToPath } from "node:url";
import path from "node:path";

// Anchor the project root to the package directory so include/exclude work no
// matter what cwd vitest is invoked from.
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

export default mergeConfig(
	devCondition({ root }),
	defineConfig({
		root,
		test: {
			// Fleet-wide vitest test-file convention: `*.test.vitest.mjs`.
			include: ["tests/**/*.test.vitest.mjs"],
			exclude: ["node_modules"],
			environment: "node",
			globals: true,
			testTimeout: 30000,
			// "dot" keeps CI logs to one character per test file instead of a full
			// "RUN vX.Y.Z" + per-file pass/fail block for every file — vitest's
			// non-interactive fallback (no TTY to redraw) otherwise reprints that
			// whole block per file on top of the final aggregate summary, which
			// dominates the log. The final "Test Files X passed" / "Tests Y passed"
			// summary is unaffected — every built-in reporter prints it regardless
			// of per-test verbosity.
			reporters: ["dot"],
			coverage: {
				provider: "v8",
				// src/index.cjs is loaded by Node's own require(), outside Vitest's module graph,
				// so it is covered by tests/cjs/entry.test.cjs (node --test) instead.
				include: ["src/**/*.mjs"],
				exclude: ["**/*.json", "tests/**"],
				reporter: ["text", "html", "json-summary", "json"]
			}
		}
	})
);
