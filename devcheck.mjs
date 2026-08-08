/**
 *	@Project: @cldmv/holdmytask
 *	@Filename: /devcheck.mjs
 *	@Date: 2025-11-08 22:18:57 -08:00 (1762669137)
 *	@Author: Nate Hyson <CLDMV>
 *	@Email: <Shinrai@users.noreply.github.com>
 *	-----
 *	@Last modified by: Nate Hyson <CLDMV> (Shinrai@users.noreply.github.com)
 *	@Last modified time: 2025-11-21 14:51:16 -08:00 (1763765476)
 *	-----
 *	@Copyright: Copyright (c) 2013-2026 Catalyzed Motivation Inc. All rights reserved.
 */

import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const srcPath = path.join(__dirname, "src");
const distPath = path.join(__dirname, "dist");

// Detect if we're running in a CI environment
const isCI = !!(
	process.env.CI || // Generic CI flag
	process.env.GITHUB_ACTIONS || // GitHub Actions
	process.env.TRAVIS || // Travis CI
	process.env.CIRCLECI || // CircleCI
	process.env.GITLAB_CI || // GitLab CI
	process.env.BUILDKITE || // Buildkite
	process.env.JENKINS_URL || // Jenkins
	process.env.TF_BUILD // Azure DevOps
);

// Only meaningful in a source checkout that hasn't been built yet: `src/` present
// but `dist/` absent. Once `dist/` exists (via `npm run build`, which the `prepare`
// script runs on install) the package entry resolves cleanly regardless, so stay
// silent. Also skip when installed as a dependency (parent dir is `node_modules`) -
// the published package ships `dist/` only, so this branch never applies there, but
// guard anyway to match the fleet convention.
// Detect a `node_modules` segment anywhere above this file - covers both scoped
// (`node_modules/@cldmv/holdmytask`) and unscoped (`node_modules/pkg`) installs.
// A simple "parent dir === node_modules" check misses scoped packages, where the
// immediate parent is the scope directory (`@cldmv`).
const isInstalledPackage = __dirname.split(path.sep).includes("node_modules");

if (existsSync(srcPath) && !existsSync(distPath) && !isCI && !isInstalledPackage) {
	// The package-scoped condition that routes `@cldmv/holdmytask/main` to `src/`
	// (see the `./main` export in package.json). Namespaced (not the generic
	// `development`) so a consuming app's own `--conditions=development` never
	// accidentally flips this package to a source tree it doesn't ship.
	const hasDevCondition = (process.env.NODE_OPTIONS || "").includes("--conditions=holdmytask-dev");

	if (!hasDevCondition) {
		console.error("❌ Development environment not properly configured!");
		console.error("📁 Source folder detected but the build output (dist/) is missing and");
		console.error("   NODE_OPTIONS is not set to load from src/ for development.");
		console.error("");
		console.error("🔧 To fix this, either build the package once:");
		console.error("     npm run build");
		console.error("");
		console.error("   or develop directly against src/ by setting the condition:");
		console.error("   Windows (cmd):");
		console.error("     set NODE_OPTIONS=--conditions=holdmytask-dev");
		console.error("");
		console.error("   Windows (PowerShell):");
		console.error("     $env:NODE_OPTIONS='--conditions=holdmytask-dev'");
		console.error("");
		console.error("   Unix/Linux/macOS:");
		console.error("     export NODE_OPTIONS=--conditions=holdmytask-dev");
		console.error("");
		console.error("💡 The 'holdmytask-dev' condition loads src/ instead of dist/, and is");
		console.error("   namespaced so it can't collide with a consumer's own dev conditions.");
		console.error("🚀 CI environments automatically skip this check.");
		process.exit(1);
	}
}
