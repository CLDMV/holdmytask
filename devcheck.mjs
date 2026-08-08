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

// Only runs in a source checkout. `src/` is present here but is NOT shipped in the
// published package, and neither is this file - in distribution index.mjs's
// `import("./devcheck.mjs")` simply fails and is ignored, so this never fires for
// consumers. When `src/` IS present the developer should be loading from it via the
// `holdmytask-dev` condition; if that isn't set they're silently running the built
// `dist/` copy instead, so warn (even after a build - that is the point).
if (existsSync(srcPath) && !isCI) {
	const nodeEnv = process.env.NODE_ENV?.toLowerCase();
	// Namespaced (not the generic `development`) so a consuming app's own
	// `--conditions=development` can't accidentally flip this package to a source
	// tree it doesn't ship. See the `./main` export in package.json.
	const hasHoldMyTaskDev = process.env.NODE_OPTIONS?.includes("--conditions=holdmytask-dev");

	if (!nodeEnv || (!["", "development"].includes(nodeEnv) && !hasHoldMyTaskDev)) {
		console.error("❌ Development environment not properly configured!");
		console.error("📁 Source folder detected but NODE_ENV/NODE_OPTIONS not set for holdmytask development.");
		console.error("");
		console.error("🔧 To fix this, run one of these commands:");
		console.error("   Windows (cmd):");
		console.error("     set NODE_ENV=development");
		console.error("     set NODE_OPTIONS=--conditions=holdmytask-dev");
		console.error("");
		console.error("   Windows (PowerShell):");
		console.error("     $env:NODE_ENV='development'");
		console.error("     $env:NODE_OPTIONS='--conditions=holdmytask-dev'");
		console.error("");
		console.error("   Unix/Linux/macOS:");
		console.error("     export NODE_ENV=development");
		console.error("     export NODE_OPTIONS=--conditions=holdmytask-dev");
		console.error("");
		console.error("💡 This ensures holdmytask loads from src/ instead of dist/ for development.");
		console.error("🔧 Using 'holdmytask-dev' prevents conflicts with consumer development settings.");
		console.error("🚀 CI environments automatically skip this check.");
		process.exit(1);
	}
}
