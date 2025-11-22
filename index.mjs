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

// Development environment check (must happen before holdmytask imports)
(async () => {
	try {
		await import("./devcheck.mjs");
	} catch {
		// ignore
	}
})();

/**
 * Creates a HoldMyTask instance for task queue management
 * @param {object} [options={}] - Configuration options
 * @returns {Promise<object>} HoldMyTask instance
 */
export default async function createHoldMyTask(options = {}) {
	// Dynamic import after environment check
	const mod = await import("@cldmv/holdmytask/main");
	const HoldMyTask = mod.HoldMyTask;
	return new HoldMyTask(options);
}

/**
 * Create a task queue instance
 * @param {object} [options={}] - Configuration options
 * @returns {Promise<object>} HoldMyTask instance
 */
export async function createQueue(options = {}) {
	const mod = await import("@cldmv/holdmytask/main");
	const HoldMyTask = mod.HoldMyTask;
	return new HoldMyTask(options);
}

/**
 * Create a task manager instance
 * @param {object} [options={}] - Configuration options
 * @returns {Promise<object>} HoldMyTask instance
 */
export async function createTaskManager(options = {}) {
	const mod = await import("@cldmv/holdmytask/main");
	const HoldMyTask = mod.HoldMyTask;
	return new HoldMyTask(options);
}

/**
 * Create a task processor instance
 * @param {object} [options={}] - Configuration options
 * @returns {Promise<object>} HoldMyTask instance
 */
export async function createTaskProcessor(options = {}) {
	const mod = await import("@cldmv/holdmytask/main");
	const HoldMyTask = mod.HoldMyTask;
	return new HoldMyTask(options);
}

// Named export aliases
export { createHoldMyTask as HoldMyTask };
export { createQueue as queue };
export { createQueue as Queue };
export { createTaskManager as TaskManager };
export { createQueue as TaskQueue };
export { createQueue as QueueManager };
export { createTaskProcessor as TaskProcessor };
