/**
 * A sophisticated task queue that manages task execution with priorities, delays, and concurrency control.
 * Tasks can be scheduled with timestamps, priorities, and completion delays between tasks of the same priority.
 * Supports both callback and promise-based APIs with comprehensive lifecycle management.
 * @extends EventEmitter
 */
export class HoldMyTask extends EventEmitter<[never]> {
    /**
     * Creates a new HoldMyTask queue instance.
     * @param {Object} [options={}] - Configuration options for the task queue
     * @param {number} [options.concurrency=1] - Maximum number of tasks to run concurrently
     * @param {number} [options.tick=25] - Scheduler tick interval in milliseconds
     * @param {boolean} [options.autoStart=true] - Whether to automatically start the scheduler
     * @param {number} [options.defaultPriority=0] - Default priority for tasks (higher numbers = higher priority)
     * @param {number} [options.maxQueue=Infinity] - Maximum number of tasks that can be queued
     * @param {Object} [options.delays={}] - Map of priority levels to delay times in milliseconds between task completions
     * @example
     * const queue = new HoldMyTask({
     *   concurrency: 2,
     *   tick: 50,
     *   defaultPriority: 1,
     *   delays: { 0: 1000, 1: 500 }
     * });
     */
    constructor(options?: {
        concurrency?: number;
        tick?: number;
        autoStart?: boolean;
        defaultPriority?: number;
        maxQueue?: number;
        delays?: any;
    });
    options: {
        concurrency: number;
        tick: number;
        autoStart: boolean;
        defaultPriority: number;
        maxQueue: number;
        delays: any;
    };
    pendingHeap: MinHeap;
    readyHeap: MinHeap;
    running: Set<any>;
    tasks: Map<any, any>;
    nextId: number;
    enqueueSeq: number;
    isActive: boolean;
    destroyed: boolean;
    lastCompletedPriority: any;
    nextAvailableTime: number;
    /**
     * Adds a task to the queue for execution. Supports both callback and promise-based APIs.
     * @param {Function} task - The task function to execute. Can be sync or async.
     * @param {Function|Object} [optionsOrCallback] - Either a callback function or options object
     * @param {Object} [options={}] - Additional options (if callback was provided as second parameter)
     * @param {number} [options.priority] - Task priority (higher numbers run first)
     * @param {number} [options.timestamp] - When the task should be ready to run (milliseconds since epoch)
     * @param {AbortSignal} [options.signal] - AbortSignal to cancel the task
     * @param {number} [options.timeout] - Task timeout in milliseconds
     * @param {number} [options.delay] - Delay after task completion before next task of same priority
     * @param {boolean} [options.bypassDelay] - If true, skip any active delay period and start immediately
     * @param {*} [options.metadata] - Arbitrary metadata to attach to the task
     * @returns {Promise|Object} Promise (if no callback) or task control object with id, cancel, status methods
     * @throws {Error} If queue is destroyed or full
     * @example
     * // Promise API
     * const result = await queue.enqueue(async () => fetchData());
     *
     * // Callback API
     * queue.enqueue(() => processData(), (err, result) => {
     *   if (err) console.error(err);
     *   else console.log(result);
     * });
     *
     * // With options
     * const task = queue.enqueue(myTask, { priority: 5, timeout: 30000 });
     *
     * // Bypass current delay for urgent task
     * const urgent = queue.enqueue(urgentTask, { priority: 10, bypassDelay: true });
     *
     * // Alternative: use delay: -1 to bypass
     * const urgent2 = queue.enqueue(urgentTask, { priority: 10, delay: -1 });
     */
    enqueue(task: Function, optionsOrCallback?: Function | any, options?: {
        priority?: number;
        timestamp?: number;
        signal?: AbortSignal;
        timeout?: number;
        delay?: number;
        bypassDelay?: boolean;
        metadata?: any;
    }): Promise<any> | any;
    /**
     * Cancels a pending task by ID.
     * @param {string} id - The task ID to cancel
     * @param {string} [reason="Task canceled"] - Reason for cancellation
     * @returns {void}
     * @example
     * const task = queue.enqueue(() => longRunningTask());
     * queue.cancelTask(task.id, "User requested cancellation");
     */
    cancelTask(id: string, reason?: string): void;
    /**
     * Pauses the task queue, stopping execution of new tasks.
     * Currently running tasks will continue to completion.
     * @returns {void}
     * @example
     * queue.pause();
     * // Queue stops processing new tasks
     */
    pause(): void;
    /**
     * Resumes the task queue after being paused.
     * @returns {void}
     * @example
     * queue.resume();
     * // Queue resumes processing tasks
     */
    resume(): void;
    /**
     * Clears all pending and ready tasks from the queue.
     * Currently running tasks will continue to completion.
     * @returns {void}
     * @example
     * queue.clear();
     * // All queued tasks are removed
     */
    clear(): void;
    /**
     * Returns the total number of tasks in the queue (pending, ready, and running).
     * @returns {number} Total number of tasks
     * @example
     * const totalTasks = queue.size(); // 5
     */
    size(): number;
    /**
     * Returns the number of currently running tasks.
     * @returns {number} Number of running tasks
     * @example
     * const runningTasks = queue.inflight(); // 2
     */
    inflight(): number;
    /**
     * Destroys the queue, canceling all tasks and stopping the scheduler.
     * Once destroyed, the queue cannot be reused.
     * @returns {void}
     * @example
     * queue.destroy();
     * // Queue is permanently shut down
     */
    destroy(): void;
    /**
     * Returns the current timestamp in milliseconds.
     * @returns {number} Current timestamp
     * @example
     * const timestamp = queue.now(); // 1699564800000
     */
    now(): number;
    /**
     * Schedules the next scheduler tick based on when tasks become ready.
     * @returns {void}
     * @private
     */
    private scheduleNextTick;
    intervalId: NodeJS.Timeout;
    timeoutId: NodeJS.Timeout;
    /**
     * Main scheduler tick that moves ready tasks and starts execution.
     * @returns {void}
     * @private
     */
    private schedulerTick;
    /**
     * Starts execution of a ready task.
     * @param {Object} item - The task item to execute
     * @returns {Promise<void>}
     * @private
     */
    private startTask;
    /**
     * Clears all active timers (intervals and timeouts).
     * @returns {void}
     * @private
     */
    private clearTimers;
}
import { EventEmitter } from "events";
import { MinHeap } from "./utils.mjs";
//# sourceMappingURL=hold-my-task.d.mts.map