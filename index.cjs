/**
 *
 *	@Project: @cldmv/holdmytask
 *	@Filename: /index.cjs
 *	@Date: 2025-11-08T14:04:10-08:00 (1762639450)
 *	@Author: Nate Corcoran <CLDMV>
 *	@Email: <Shinrai@users.noreply.github.com>
 *	-----
 *	@Last modified by: Nate Corcoran <CLDMV> (Shinrai@users.noreply.github.com)
 *	@Last modified time: 2026-10-02T12:20:28-07:00 (1790968828)
 *	-----
 *	@Copyright: Copyright (c) 2013-2026 Catalyzed Motivation Inc. All rights reserved.
 *
 */

/**
 * CommonJS entry point for holdmytask
 *
 * This file provides CommonJS (require) support for the holdmytask library.
 * It imports and re-exports the main HoldMyTask class from the ESM module.
 *
 * @module holdmytask
 */
"use strict";

// index.cjs is a thin wrapper: it loads index.mjs through Node's synchronous require(esm).
// Node.js versions without require(esm) would fail with a bare ERR_REQUIRE_ESM, so fail
// early with a message that says what to do instead.
if (!process.features?.require_module) {
	const error = new Error(
		`@cldmv/holdmytask: require() needs Node.js ^20.19.0 or >=22.12.0 (this is ${process.version}). On older Node.js, load the package with import() instead.`
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
