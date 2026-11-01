/**
 * Creates a HoldMyTask instance for task queue management
 * @param {object} [options={}] - Configuration options
 * @returns {Promise<HoldMyTask>} HoldMyTask instance
 */
export function createHoldMyTask(options?: object): Promise<HoldMyTask>;
/**
 * Create a task queue instance
 * @param {object} [options={}] - Configuration options
 * @returns {Promise<HoldMyTask>} HoldMyTask instance
 */
export function createQueue(options?: object): Promise<HoldMyTask>;
/**
 * Create a task manager instance
 * @param {object} [options={}] - Configuration options
 * @returns {Promise<HoldMyTask>} HoldMyTask instance
 */
export function createTaskManager(options?: object): Promise<HoldMyTask>;
/**
 * Create a task processor instance
 * @param {object} [options={}] - Configuration options
 * @returns {Promise<HoldMyTask>} HoldMyTask instance
 */
export function createTaskProcessor(options?: object): Promise<HoldMyTask>;
export default HoldMyTask;
import { HoldMyTask } from "./hold-my-task.mjs";
export { HoldMyTask, HoldMyTask as queue, HoldMyTask as Queue, HoldMyTask as TaskManager, HoldMyTask as TaskQueue, HoldMyTask as QueueManager, HoldMyTask as TaskProcessor };
//# sourceMappingURL=index.d.mts.map