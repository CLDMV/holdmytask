/**
 *
 *	@Project: @cldmv/holdmytask
 *	@Filename: /src/index.cjs
 *	@Date: 2025-11-08T14:04:10-08:00 (1762639450)
 *	@Author: Nate Corcoran <CLDMV>
 *	@Email: <Shinrai@users.noreply.github.com>
 *	-----
 *	@Last modified by: Nate Corcoran <CLDMV> (Shinrai@users.noreply.github.com)
 *	@Last modified time: 2026-11-01T16:28:46-08:00 (1793579326)
 *	-----
 *	@Copyright: Copyright (c) 2013-2026 Catalyzed Motivation Inc. All rights reserved.
 *
 */

/**
 * CommonJS entry point for holdmytask
 *
 * A thin, synchronous wrapper around the ESM entry: it loads ./index.mjs through Node's
 * require(esm) and maps it to the historical CommonJS shape (the HoldMyTask class as
 * module.exports, plus the class aliases as properties), instead of bundling a second
 * copy of the library.
 *
 * It sits next to the ESM entry under the same name, so require("./index.mjs") resolves
 * to src/index.mjs from source and to dist/index.mjs once built. tsup's onSuccess copies
 * it verbatim into dist/ (tsup.config.mjs); it never passes through esbuild.
 *
 * @module holdmytask
 */
"use strict";

// index.cjs is a thin wrapper: it loads index.mjs through Node's synchronous require(esm).
// Node.js versions without require(esm) would fail with a bare ERR_REQUIRE_ESM, so fail
// early with a message that says what to do instead.
if (!process.features?.require_module) {
	const error = new Error(
		`@cldmv/holdmytask: require() needs Node.js ^20.19.0 or >=22.13.0 (this is ${process.version}). On older Node.js, load the package with import() instead.`
	);
	error.code = "ERR_REQUIRE_ESM";
	throw error;
}

const { HoldMyTask } = require("./index.mjs");

// Export main class
module.exports = HoldMyTask; // Default export
module.exports.HoldMyTask = HoldMyTask;

// Common queue system aliases
module.exports.queue = HoldMyTask;
module.exports.Queue = HoldMyTask;
module.exports.TaskManager = HoldMyTask;
module.exports.TaskQueue = HoldMyTask;
module.exports.QueueManager = HoldMyTask;
module.exports.TaskProcessor = HoldMyTask;
