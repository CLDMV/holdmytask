import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";
import path from "node:path";

// Anchor the project root to the package directory so include/exclude work no
// matter what cwd vitest is invoked from.
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

export default defineConfig({
	root,
	// The package-scoped dev condition that routes `@cldmv/holdmytask/main` to `src/`
	// (see the `./main` export in package.json). Tests exercise and cover the SOURCE
	// tree, so the resolver must add `holdmytask-dev`. This *replaces* vite's default
	// conditions, so the usual ones are kept alongside it. `test.nodeOptions`/`test.env`
	// below carry the same condition into forked test workers (for native imports of
	// the package entry, e.g. CommonAliases importing index.mjs -> /main), so a bare
	// local `npm test` resolves to src the same way CI does. Mirrors @cldmv/uuid.
	resolve: {
		conditions: ["holdmytask-dev", "module", "browser", "development|production"]
	},
	ssr: {
		// Vitest often routes node-environment resolution through the SSR pipeline. Keep
		// `module` here alongside the non-SSR resolver so a dependency's `module`-keyed
		// export resolves the same under Vitest's SSR pipeline as in a normal build.
		resolve: {
			conditions: ["holdmytask-dev", "module", "node", "development|production"]
		}
	},
	test: {
		// Fleet-wide vitest test-file convention: `*.test.vitest.mjs`.
		include: ["tests/**/*.test.vitest.mjs"],
		exclude: ["node_modules"],
		environment: "node",
		globals: true,
		testTimeout: 30000,
		// Carry the dev condition into forked workers (native imports of the package
		// entry, e.g. CommonAliases importing index.mjs -> /main). NODE_ENV is left
		// alone: it does not select the conditional export (that's `--conditions`), and
		// forcing a non-standard `NODE_ENV=holdmytask-dev` could confuse deps that key
		// off the usual test/development/production values.
		nodeOptions: ["--conditions=holdmytask-dev"],
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
			include: ["src/**"],
			exclude: ["**/*.json", "tests/**"],
			reporter: ["text", "html", "json-summary", "json"]
		}
	}
});
