/**
 *	@Project: @cldmv/holdmytask
 *	@Filename: /build.mjs
 *	@Date: 2025-11-08 22:13:40 -08:00 (1762668820)
 *	@Author: Nate Hyson <CLDMV>
 *	@Email: <Shinrai@users.noreply.github.com>
 *	-----
 *	@Last modified by: Nate Hyson <CLDMV> (Shinrai@users.noreply.github.com)
 *	@Last modified time: 2025-11-09 16:22:43 -08:00 (1762734163)
 *	-----
 *	@Copyright: Copyright (c) 2013-2025 Catalyzed Motivation Inc. All rights reserved.
 */

/**
 * Build script for holdmytask
 *
 * This script builds the distribution files for the holdmytask library.
 * It creates a dist folder with the built/optimized versions of the library.
 */

import { mkdir, copyFile } from "fs/promises";
import { existsSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = __dirname;
const distDir = join(rootDir, "dist");

// Ensure dist directory exists
await mkdir(distDir, { recursive: true });

// Copy source files to dist (for now, just copy - could add bundling later)
const sourceFiles = ["src/hold-my-task.mjs", "src/utils.mjs"];

for (const file of sourceFiles) {
	const srcPath = join(rootDir, file);
	const distPath = join(distDir, file.replace("src/", ""));

	if (existsSync(srcPath)) {
		await mkdir(dirname(distPath), { recursive: true });
		await copyFile(srcPath, distPath);
		console.log(`Copied ${file} to dist/`);
	}
}

console.log("Build completed successfully!");
