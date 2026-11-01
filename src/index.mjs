/**
 *
 *	@Project: @cldmv/holdmytask
 *	@Filename: /src/index.mjs
 *	@Date: 2025-11-08T14:04:10-08:00 (1762639450)
 *	@Author: Nate Corcoran <CLDMV>
 *	@Email: <Shinrai@users.noreply.github.com>
 *	-----
 *	@Last modified by: Nate Corcoran <CLDMV> (Shinrai@users.noreply.github.com)
 *	@Last modified time: 2026-11-01T09:54:10-08:00 (1793555650)
 *	-----
 *	@Copyright: Copyright (c) 2013-2026 Catalyzed Motivation Inc. All rights reserved.
 *
 */

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
