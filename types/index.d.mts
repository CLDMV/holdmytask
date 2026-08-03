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
/**
 * Creates a HoldMyTask instance for task queue management
 * @param {object} [options={}] - Configuration options
 * @returns {Promise<object>} HoldMyTask instance
 */
export default function createHoldMyTask(options?: object): Promise<object>;
/**
 * Create a task queue instance
 * @param {object} [options={}] - Configuration options
 * @returns {Promise<object>} HoldMyTask instance
 */
export declare function createQueue(options?: object): Promise<object>;
/**
 * Create a task manager instance
 * @param {object} [options={}] - Configuration options
 * @returns {Promise<object>} HoldMyTask instance
 */
export declare function createTaskManager(options?: object): Promise<object>;
/**
 * Create a task processor instance
 * @param {object} [options={}] - Configuration options
 * @returns {Promise<object>} HoldMyTask instance
 */
export declare function createTaskProcessor(options?: object): Promise<object>;
export { createHoldMyTask as HoldMyTask };
export { createQueue as queue };
export { createQueue as Queue };
export { createTaskManager as TaskManager };
export { createQueue as TaskQueue };
export { createQueue as QueueManager };
export { createTaskProcessor as TaskProcessor };
//# sourceMappingURL=index.d.mts.map