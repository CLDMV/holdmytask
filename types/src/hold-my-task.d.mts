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
     * @param {boolean} [options.smartScheduling=true] - Use dynamic timeouts instead of constant polling for better performance
     * @param {number} [options.tick=25] - Polling interval in milliseconds when smartScheduling is disabled
     * @param {number} [options.healingInterval=5000] - Self-healing check interval in milliseconds (smart scheduling only)
     * @example
     * const queue = new HoldMyTask({
     *   concurrency: 2,
     *   tick: 50,
     *   defaultPriority: 1,
     *   delays: { 0: 1000, 1: 500 }
     * });
     *
     * @example
     * // Use traditional polling instead of smart scheduling
     * const legacyQueue = new HoldMyTask({
     *   smartScheduling: false,
     *   tick: 50
     * });
     */
    constructor(options?: {
        concurrency?: number;
        tick?: number;
        autoStart?: boolean;
        defaultPriority?: number;
        maxQueue?: number;
        delays?: any;
        smartScheduling?: boolean;
        tick?: number;
        healingInterval?: number;
    });
    options: {
        concurrency: number;
        tick: number;
        autoStart: boolean;
        defaultPriority: number;
        maxQueue: number;
        delays: any;
        smartScheduling: boolean;
        healingInterval: number;
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
    schedulerTimeout: NodeJS.Timeout;
    healingInterval: NodeJS.Timeout;
    lastSchedulerRun: number;
    intervalId: NodeJS.Timeout;
    /**
     * Adds a task to the queue for execution. Supports both callback and promise-based APIs.
     * @param {Function} task - The task function to execute. Can be sync or async.
     * @param {Function|Object} [optionsOrCallback] - Either a callback function or options object
     * @param {Object} [options={}] - Additional options (if callback was provided as second parameter)
     * @param {number} [options.priority] - Task priority (higher numbers run first)
     * @param {number} [options.timestamp] - When the task should be ready to run (milliseconds since epoch)
     * @param {AbortSignal} [options.signal] - AbortSignal to cancel the task
     * @param {number} [options.timeout] - Task timeout in milliseconds (for execution time limit)
     * @param {number} [options.expire] - Task expiration timestamp or milliseconds from now (for queue waiting time limit)
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
     * const task = queue.enqueue(myTask, { priority: 5, timeout: 30000, expire: 10000 });
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
        expire?: number;
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
     * Returns the number of tasks in the queue.
     * @returns {number} Number of tasks in the queue
     * @example
     * const totalTasks = queue.size(); // 5
     */
    size(): number;
    /**
     * Returns the number of tasks in the queue (alias for size()).
     * @returns {number} Number of tasks in the queue
     * @example
     * const totalTasks = queue.length(); // 5
     */
    length(): number;
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
    timeoutId: NodeJS.Timeout;
    /**
     * Main scheduler tick that moves ready tasks and starts execution.
     * @returns {void}
     * @private
     */
    private schedulerTick;
    /**
     * Handles an expired task by removing it and calling appropriate error handling.
     * @param {Object} item - The expired task item
     * @returns {void}
     * @private
     */
    private expireTask;
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
    /**
     * Calculates when the next scheduler run should happen and sets appropriate timeout.
     * @private
     * @returns {void}
     *
     * @description
     * Smart scheduling that calculates the optimal time for the next scheduler run based on:
     * - When the next pending task becomes ready
     * - When delay periods end
     * - Whether there are tasks that can run immediately
     *
     * Uses setTimeout for precise timing instead of constant polling intervals.
     */
    private scheduleSmartTimeout;
    /**
     * Runs the main scheduler logic and reschedules if needed.
     * @private
     * @returns {void}
     *
     * @description
     * Executes the scheduler tick logic and then determines if more scheduling is needed.
     * Tracks when scheduler last ran for healing mechanism.
     */
    private runScheduler;
    /**
     * Starts the self-healing interval that ensures scheduler continues working.
     * @private
     * @returns {void}
     *
     * @description
     * Healing mechanism that periodically checks if the scheduler should be running
     * but isn't due to timeout failures or other issues. Runs every healingInterval milliseconds.
     */
    private startHealingInterval;
    /**
     * Clears all scheduler-related timers.
     * @private
     * @returns {void}
     *
     * @description
     * Cleans up both the main scheduler timeout and the healing interval timer.
     */
    private clearSchedulerTimers;
}
import { EventEmitter } from "events";
import { MinHeap } from "./utils.mjs";
//# sourceMappingURL=hold-my-task.d.mts.map