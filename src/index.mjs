/**
 *
 *	@Project: @cldmv/holdmytask
 *	@Filename: /src/index.mjs
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

// Development environment check. devcheck.mjs exists only in a source checkout and exits the
// process when the checkout runs without --conditions=holdmytask-dev. It is loaded
// synchronously, through require(esm), so it finishes before this module's exports can be
// called from ESM or CJS, sync or async: nothing runs against the wrong tree first. There is
// no top-level await, which index.cjs's require(esm) would reject (ERR_REQUIRE_ASYNC_MODULE).
//
// node:module is looked up at runtime with process.getBuiltinModule (Node >=20.16 / 22.3)
// instead of a static import, so bundlers never see a Node built-in: a browser build keeps
// working, and without process (a browser) the check is skipped. devcheck.mjs is never
// published, so MODULE_NOT_FOUND is expected outside a checkout; any other error is a real
// failure. The build keeps the specifier external, so dist/index.mjs loads the same root
// file.
/* v8 ignore start -- the false branch is a non-Node runtime and the catch runs in the published
   package (no devcheck.mjs) or when devcheck.mjs fails to load; the suite always runs on Node
   from a checkout where devcheck.mjs exists and loads */
const nodeModule = typeof process === "undefined" ? undefined : process.getBuiltinModule?.("node:module");
if (nodeModule) {
	try {
		nodeModule.createRequire(import.meta.url)("../devcheck.mjs");
	} catch (error) {
		if (error?.code !== "MODULE_NOT_FOUND") throw error;
	}
}
/* v8 ignore stop */

import { HoldMyTask } from "./hold-my-task.mjs";

/**
 * Creates a HoldMyTask instance for task queue management
 * @param {object} [options={}] - Configuration options
 * @returns {Promise<HoldMyTask>} HoldMyTask instance
 */
export async function createHoldMyTask(options = {}) {
	return new HoldMyTask(options);
}

/**
 * Create a task queue instance
 * @param {object} [options={}] - Configuration options
 * @returns {Promise<HoldMyTask>} HoldMyTask instance
 */
export async function createQueue(options = {}) {
	return new HoldMyTask(options);
}

/**
 * Create a task manager instance
 * @param {object} [options={}] - Configuration options
 * @returns {Promise<HoldMyTask>} HoldMyTask instance
 */
export async function createTaskManager(options = {}) {
	return new HoldMyTask(options);
}

/**
 * Create a task processor instance
 * @param {object} [options={}] - Configuration options
 * @returns {Promise<HoldMyTask>} HoldMyTask instance
 */
export async function createTaskProcessor(options = {}) {
	return new HoldMyTask(options);
}

// HoldMyTask and its constructor aliases are the real class (see issue #3) - `new
// HoldMyTask()`, `new QueueManager()`, etc. all construct the same underlying type.
export { HoldMyTask };
export default HoldMyTask;
export { HoldMyTask as queue };
export { HoldMyTask as Queue };
export { HoldMyTask as TaskManager };
export { HoldMyTask as TaskQueue };
export { HoldMyTask as QueueManager };
export { HoldMyTask as TaskProcessor };
