/**
 *
 *	@Project: @cldmv/holdmytask
 *	@Filename: /tsup.config.mjs
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

/**
 * @fileoverview Bundler config — produces the published dist/ output from src/.
 *
 *  - dist/index.mjs — the ESM entry, src/index.mjs bundled with everything it imports.
 *  - dist/index.cjs — not built: src/index.cjs is a thin wrapper that require()s the sibling
 *    index.mjs and maps it to the historical CommonJS shape. onSuccess copies it verbatim, so
 *    it never passes through esbuild and never duplicates the library.
 *  - dist/main.mjs — the deprecated "./main" alias (src/main.mjs). ./index.mjs is external, so
 *    it imports dist/index.mjs instead of carrying a second copy of the bundle.
 *
 * ../devcheck.mjs stays external in both: it lives at the repo root, is never published, and
 * the entry loads it by path (and skips it when it is absent), so src/ and dist/ run the same
 * root file in a checkout. Output is minified with names kept; sourcemaps are generated for
 * local debugging and excluded from the tarball via package.json "files".
 */
import { copyFileSync } from "node:fs";
import { join } from "node:path";
import { defineConfig } from "tsup";

const shared = {
	format: ["esm"],
	outDir: "dist",
	target: "node20",
	platform: "node",
	splitting: false,
	sourcemap: true,
	dts: false,
	minify: true,
	// Keep function and class names through minification (HoldMyTask.name, stack traces).
	keepNames: true,
	// Keep `node:` specifiers on built-in imports (tsup strips them by default).
	removeNodeProtocol: false,
	// The two builds run in parallel into the same folder, so neither cleans it; the `build`
	// script clears dist/ before invoking tsup instead.
	clean: false,
	outExtension() {
		return { js: ".mjs" };
	}
};

export default defineConfig([
	{
		...shared,
		entry: { index: "src/index.mjs" },
		external: ["../devcheck.mjs"],
		// tsup calls this on the resolved options, so `this.outDir` is the directory the build
		// actually wrote to.
		onSuccess() {
			copyFileSync("src/index.cjs", join(this.outDir, "index.cjs"));
		}
	},
	{
		...shared,
		entry: { main: "src/main.mjs" },
		external: ["../devcheck.mjs", "./index.mjs"]
	}
]);
