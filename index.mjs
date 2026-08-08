/**
 *	@Project: @cldmv/holdmytask
 *	@Filename: /index.mjs
 *	@Date: 2025-11-08 14:04:10 -08:00 (1762639450)
 *	@Author: Nate Hyson <CLDMV>
 *	@Email: <Shinrai@users.noreply.github.com>
 *	-----
 *	@Last modified by: Nate Hyson <CLDMV> (Shinrai@users.noreply.github.com)
 *	@Last modified time: 2025-11-21 14:47:33 -08:00 (1763765253)
 *	-----
 *	@Copyright: Copyright (c) 2013-2025 Catalyzed Motivation Inc. All rights reserved.
 */

// Development environment check. NOTE: the static `import` of the core below is
// hoisted and evaluated before this IIFE body runs, so devcheck does NOT run before
// the core loads - it's a best-effort, fire-and-forget dev-time warning. (Running it
// strictly first would require a dynamic import + top-level await, which breaks the
// index.cjs bridge's synchronous `require` of this module - see PR #11 discussion.)
(async () => {
	try {
		await import("./devcheck.mjs");
	} catch {
		// ignore
	}
})();

import { HoldMyTask } from "@cldmv/holdmytask/main";

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
