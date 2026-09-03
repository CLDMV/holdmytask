/**
 *	@Project: @cldmv/holdmytask
 *	@Filename: /src/hold-my-task.mjs
 *	@Date: 2025-11-08 17:43:19 -08:00 (1762652599)
 *	@Author: Nate Hyson <CLDMV>
 *	@Email: <Shinrai@users.noreply.github.com>
 *	-----
 *	@Last modified by: Nate Hyson <CLDMV> (Shinrai@users.noreply.github.com)
 *	@Last modified time: 2025-11-10 22:14:06 -08:00 (1762841646)
 *	-----
 *	@Copyright: Copyright (c) 2013-2025 Catalyzed Motivation Inc. All rights reserved.
 */
import { EventEmitter } from "events";
import { MinHeap } from "./utils.mjs";
/**
 * A sophisticated task queue that manages task execution with priorities, delays, and concurrency control.
 * Tasks can be scheduled with timestamps, priorities, and completion delays between tasks of the same priority.
 * Supports both callback and promise-based APIs with comprehensive lifecycle management.
 * @extends EventEmitter
 */
export declare class HoldMyTask extends EventEmitter {
    _syncMode: boolean | undefined;
    options: {
        constructor: Function;
        toString(): string;
        toLocaleString(): string;
        valueOf(): Object;
        hasOwnProperty(v: PropertyKey): boolean;
        isPrototypeOf(v: Object): boolean;
        propertyIsEnumerable(v: PropertyKey): boolean;
        concurrency: number;
        tick: number;
        autoStart: boolean;
        defaultPriority: number;
        maxQueue: any;
        priorities: {};
        smartScheduling: boolean;
        healingInterval: number;
        coalescing: {
            defaults: Object;
            keys: {};
        };
        coalescingWindowDuration: any;
        coalescingMaxDelay: any;
        coalescingMultipleCallbacks: any;
        coalescingResolveAllPromises: any;
    } | undefined;
    pendingHeap: MinHeap | undefined;
    readyHeap: MinHeap | undefined;
    running: Set<any> | undefined;
    runningByPriority: Map<any, any> | undefined;
    tasks: Map<any, any> | undefined;
    nextId: number | undefined;
    enqueueSeq: number | undefined;
    isActive: boolean | undefined;
    destroyed: boolean | undefined;
    lastCompletedPriority: any;
    nextAvailableTime: any;
    schedulerTimeout: number | null | undefined;
    healingInterval: number | null | undefined;
    lastSchedulerRun: number | undefined;
    intervalId: number | null | undefined;
    coalescingGroups: Map<any, any> | undefined;
    coalescingRepresentatives: Map<any, any> | undefined;
    nextGroupId: number | undefined;
    timeoutId: number | undefined;
    constructor(options?: {});
    /**
     * Synchronous initialization for backwards compatibility
     * @private
     * @param {Object} options - Configuration options
     */
    private _initializeSync;
    /**
     * Asynchronous initialization for modern usage
     * @private
     * @param {Object} options - Configuration options
     * @returns {Promise<HoldMyTask>} Promise that resolves to this instance
     */
    private _initializeAsync;
    /**
     * Common initialization logic used by both sync and async modes
     * @private
     * @param {Object} options - Configuration options
     */
    private _initializeCommon;
    /**
     * Internal convenience method to create a new HoldMyTask instance with async initialization.
     * This enables event listeners to be attached before validation errors can occur.
     * @param {Object} [options={}] - Configuration options
     * @returns {Promise<HoldMyTask>} Promise that resolves to the initialized instance
     * @private
     * @example
     * // Internal usage - prefer new HoldMyTask({ sync: false }) for public API
     * const queue = await HoldMyTask._create({ maxQueue: 100 });
     */
    private static _create;
    /**
     * Adds a task to the queue for execution. Supports both callback and promise-based APIs.
     * @param {Function} task - The task function to execute. Can be sync or async.
     * @param {Function|Object} [optionsOrCallback] - Either a callback function or options object
     * @param {Object} [options={}] - Additional options (if callback was provided as second parameter)
     * @param {string|number} [options.id] - Custom task ID for identification and later reference (must be unique)
     * @param {number} [options.priority] - Task priority (higher numbers run first)
     * @param {number} [options.timestamp] - When the task should be ready to run (milliseconds since epoch)
     * @param {number} [options.start] - Milliseconds from now when the task should be ready to run (convenience for timestamp calculation)
     * @param {AbortSignal} [options.signal] - AbortSignal to cancel the task
     * @param {number} [options.timeout] - Task timeout in milliseconds (for execution time limit)
     * @param {number} [options.expire] - Task expiration timestamp or milliseconds from now (for queue waiting time limit)
     * @param {number} [options.delay] - DEPRECATED: Use postDelay instead. Delay after task completion before next task of same priority
     * @param {boolean} [options.bypassDelay] - If true, skip any active delay period and start immediately
     * @param {string} [options.coalescingKey] - Key for task coalescing - tasks with same key will be coalesced within windows
     * @param {number} [options.coalescingWindowDuration] - Override coalescing window duration (task-level override of key-level and defaults)
     * @param {number} [options.coalescingMaxDelay] - Override coalescing max delay (task-level override of key-level and defaults)
     * @param {boolean} [options.coalescingMultipleCallbacks] - Override callback behavior (task-level override of key-level and defaults)
     * @param {boolean} [options.coalescingResolveAllPromises] - Override promise resolution behavior (task-level override of key-level and defaults)
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
     *
     * // Coalescing tasks - multiple device status checks become one
     * queue.enqueue(checkDeviceStatus, callback1, { coalescingKey: "device-123", coalescingWindowDuration: 1000 });
     * queue.enqueue(checkDeviceStatus, callback2, { coalescingKey: "device-123" }); // Gets coalesced with first
     */
    enqueue(task: Function, optionsOrCallback?: Function | Object, options?: {
        id?: string | number;
        priority?: number;
        timestamp?: number;
        start?: number;
        signal?: AbortSignal;
        timeout?: number;
        expire?: number;
        delay?: number;
        bypassDelay?: boolean;
        coalescingKey?: string;
        coalescingWindowDuration?: number;
        coalescingMaxDelay?: number;
        coalescingMultipleCallbacks?: boolean;
        coalescingResolveAllPromises?: boolean;
        metadata?: any;
    }): Promise<any> | Object;
    /**
     * Cancels a pending task by ID.
     * @param {string} id - The task ID to cancel
     * @param {string} [reason="Task canceled"] - Reason for cancellation
     * @returns {boolean} True if task was found and cancelled, false otherwise
     * @example
     * const task = queue.enqueue(() => longRunningTask());
     * const cancelled = queue.cancel(task.id, "User requested cancellation");
     */
    cancel(id: string, reason?: string): boolean;
    /**
     * Alias for cancel() method for backward compatibility.
     * @param {string|number} id - The task ID to cancel
     * @param {string} [reason="Task canceled"] - Reason for cancellation
     * @returns {boolean} True if task was found and cancelled, false otherwise
     */
    cancelTask(id: string | number, reason?: string): boolean;
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
     * Gets information about a coalescing group by key and group ID.
     * @param {string} coalescingKey - The coalescing key
     * @param {string} [groupId] - Optional group ID. If omitted, returns all groups for the key
     * @returns {Object|Array|null} Group info object, array of groups, or null if not found
     * @example
     * // Get all groups for a coalescing key
     * const groups = queue.getCoalescingGroup('ui.update');
     *
     * // Get specific group by ID
     * const group = queue.getCoalescingGroup('ui.update', '1');
     * console.log(group.tasks.size); // Number of tasks in group
     *
     * // Access individual task metadata
     * for (const [taskId, task] of group.tasks) {
     *   console.log(`Task ${taskId}:`, task.metadata);
     * }
     */
    getCoalescingGroup(coalescingKey: string, groupId?: string): Object | any[] | null;
    /**
     * Gets metadata for all tasks in a coalescing group.
     * @param {string} coalescingKey - The coalescing key
     * @param {string} [groupId] - Optional group ID. If omitted, returns metadata from all groups for the key
     * @returns {Array} Array of metadata objects with task IDs
     * @example
     * // Get metadata from all groups for a key
     * const allMetadata = queue.getCoalescingGroupMetadata('ui.update');
     *
     * // Get metadata from specific group
     * const groupMetadata = queue.getCoalescingGroupMetadata('ui.update', '1');
     *
     * // Example output:
     * // [
     * //   { taskId: '123', metadata: { userId: 100, action: 'save' } },
     * //   { taskId: '124', metadata: { userId: 200, action: 'delete' } }
     * // ]
     */
    getCoalescingGroupMetadata(coalescingKey: string, groupId?: string): any[];
    /**
     * Gets a summary of all active coalescing groups.
     * @returns {Object} Summary object with coalescing key stats
     * @example
     * const summary = queue.getCoalescingGroupsSummary();
     * console.log(summary);
     * // {
     * //   'ui.update': { groupCount: 2, totalTasks: 5 },
     * //   'api.batch': { groupCount: 1, totalTasks: 3 }
     * // }
     */
    getCoalescingGroupsSummary(): Object;
    /**
     * Finds the coalescing group that contains a specific task ID.
     * @param {string|number} taskId - The task ID to search for
     * @returns {Object|null} Group information including the task's metadata, or null if not found
     * @example
     * const groupInfo = queue.findCoalescingGroupByTaskId('123');
     * if (groupInfo) {
     *   console.log('Task is in group:', groupInfo.groupId);
     *   console.log('Task metadata:', groupInfo.task.metadata);
     *   console.log('Other tasks in group:', groupInfo.groupTasks.length);
     * }
     */
    findCoalescingGroupByTaskId(taskId: string | number): Object | null;
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
     * Main scheduler tick that moves ready tasks and starts execution.
     * @returns {void}
     * @private
     */
    private schedulerTick;
    /**
     * Checks if a task can start based on both global and per-priority concurrency limits.
     * @param {Object} task - The task to check
     * @returns {boolean} True if the task can start, false if concurrency limits prevent it
     * @private
     */
    private _canStartTask;
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
    /**
     * Configure coalescing settings for specific keys dynamically.
     * @param {string} coalescingKey - The coalescing key to configure
     * @param {Object} config - Configuration for this key
     * @param {number} [config.windowDuration] - Window duration in milliseconds for this key
     * @param {number} [config.maxDelay] - Maximum delay in milliseconds for this key
     * @param {number} [config.postDelay] - Post-completion delay in milliseconds for this key
     * @param {number} [config.startDelay] - Pre-execution delay in milliseconds for this key
     * @param {number} [config.delay] - DEPRECATED: Use postDelay instead
     * @param {number} [config.start] - DEPRECATED: Use startDelay instead
     * @param {boolean} [config.multipleCallbacks] - Whether to call multiple callbacks for this key
     * @param {boolean} [config.resolveAllPromises] - Whether to resolve all promises for this key
     * @returns {void}
     *
     * @example
     * // Configure specific keys after queue creation
     * queue.configureCoalescingKey('ui.update', {
     *   windowDuration: 100,
     *   maxDelay: 500,
     *   postDelay: 25,
     *   startDelay: 0
     * });
     *
     * queue.configureCoalescingKey('api.batch', {
     *   windowDuration: 1000,
     *   maxDelay: 5000,
     *   postDelay: 100,
     *   startDelay: 200,
     *   resolveAllPromises: false
     * });
     */
    configureCoalescingKey(coalescingKey: string, config: {
        windowDuration?: number;
        maxDelay?: number;
        postDelay?: number;
        startDelay?: number;
        delay?: number;
        start?: number;
        multipleCallbacks?: boolean;
        resolveAllPromises?: boolean;
    }): void;
    /**
     * Get the effective coalescing configuration for a specific key.
     * @param {string} coalescingKey - The coalescing key to get configuration for
     * @param {Object} [taskOptions={}] - Task-level options that may override key configuration
     * @returns {Object} The effective configuration for this key
     *
     * @example
     * // Get effective configuration for a key
     * const config = queue.getCoalescingConfig('ui.update');
     * console.log(`UI updates coalesce within ${config.windowDuration}ms with ${config.postDelay}ms post-completion delay`);
     *
     * // Check with task-level overrides
     * const effectiveConfig = queue.getCoalescingConfig('ui.update', {
     *   coalescingWindowDuration: 50,
     *   delay: 30  // Still accepts old property names for backwards compatibility
     * });
     */
    getCoalescingConfig(coalescingKey: string, taskOptions?: Object): Object;
    /**
     * Get all configured coalescing keys and their configurations.
     * @returns {Object} Map of coalescingKey to configuration
     *
     * @example
     * // See all configured coalescing keys
     * const allConfigs = queue.getCoalescingConfigurations();
     * Object.entries(allConfigs).forEach(([key, config]) => {
     *   console.log(`${key}: ${config.windowDuration}ms window, ${config.maxDelay}ms max delay, ${config.postDelay}ms post-completion delay, ${config.startDelay}ms pre-execution delay`);
     * });
     */
    getCoalescingConfigurations(): Object;
    /**
     * Configure default settings for specific priorities dynamically.
     * @param {number} priority - The priority level to configure
     * @param {Object} config - Configuration for this priority
     * @param {number} [config.postDelay] - Default post-completion delay in milliseconds for this priority
     * @param {number} [config.startDelay] - Default pre-execution delay in milliseconds for this priority
     * @param {number} [config.delay] - DEPRECATED: Use postDelay instead
     * @param {number} [config.start] - DEPRECATED: Use startDelay instead
     * @returns {void}
     *
     * @example
     * // Configure priority defaults after queue creation
     * queue.configurePriority(1, {
     *   postDelay: 100,  // High priority tasks have 100ms delay after completion
     *   startDelay: 0    // High priority tasks start immediately
     * });
     *
     * queue.configurePriority(3, {
     *   postDelay: 0,    // Low priority tasks have no delay after completion
     *   startDelay: 200  // Low priority tasks wait 200ms before starting
     * });
     */
    configurePriority(priority: number, config: {
        postDelay?: number;
        startDelay?: number;
        delay?: number;
        start?: number;
    }): void;
    /**
     * Get the effective configuration for a specific priority.
     * @param {number} priority - The priority level to get configuration for
     * @param {Object} [taskOptions={}] - Task-level options that may override priority configuration
     * @returns {Object} The effective configuration for this priority
     *
     * @example
     * // Get effective configuration for a priority
     * const config = queue.getPriorityConfig(1);
     * console.log(`Priority 1 tasks: ${config.delay}ms delay, ${config.start}ms start delay`);
     *
     * // Check with task-level overrides
     * const effectiveConfig = queue.getPriorityConfig(1, {
     *   delay: 50,
     *   start: 10
     * });
     */
    getPriorityConfig(priority: number, taskOptions?: Object): Object;
    /**
     * Get all configured priorities and their configurations.
     * @returns {Object} Map of priority to configuration
     *
     * @example
     * // See all configured priorities
     * const allConfigs = queue.getPriorityConfigurations();
     * Object.entries(allConfigs).forEach(([priority, config]) => {
     *   console.log(`Priority ${priority}: ${config.delay}ms delay, ${config.start}ms start delay`);
     * });
     */
    getPriorityConfigurations(): Object;
    /**
     * Alias for destroy() method for common queue system naming.
     * @returns {void}
     */
    shutdown(): void;
    /**
     * Alias for enqueue() method for common queue system naming.
     * @param {Function} task - The task function to execute
     * @param {Function|Object} optionsOrCallback - Callback function or options object
     * @param {Object} options - Task options (if callback provided as second parameter)
     * @returns {Promise|TaskHandle} Promise if no callback provided, TaskHandle otherwise
     */
    schedule(task: Function, optionsOrCallback: Function | Object, options?: Object): Promise<any> | TaskHandle;
    /**
     * Alias for enqueue() method for common queue system naming.
     * @param {Function} task - The task function to execute
     * @param {Function|Object} optionsOrCallback - Callback function or options object
     * @param {Object} options - Task options (if callback provided as second parameter)
     * @returns {Promise|TaskHandle} Promise if no callback provided, TaskHandle otherwise
     */
    add(task: Function, optionsOrCallback: Function | Object, options?: Object): Promise<any> | TaskHandle;
    /**
     * Find a task by its ID.
     * @param {string|number} id - The task ID to find
     * @returns {Object|null} Task object if found, null otherwise
     */
    get(id: string | number): Object | null;
    /**
     * Check if a task with the given ID exists.
     * @param {string|number} id - The task ID to check
     * @returns {boolean} True if task exists, false otherwise
     */
    has(id: string | number): boolean;
    /**
     * Alias for get() method for backward compatibility.
     * @param {string|number} id - The task ID to find
     * @returns {Object|null} Task object if found, null otherwise
     */
    getTask(id: string | number): Object | null;
    /**
     * Alias for has() method for backward compatibility.
     * @param {string|number} id - The task ID to check
     * @returns {boolean} True if task exists, false otherwise
     */
    hasTask(id: string | number): boolean;
    /**
     * Get detailed information about the current queue state for debugging.
     * @returns {Object} Comprehensive queue state information
     */
    inspect(): Object;
    /**
     * Get information about active timers and scheduler state.
     * @returns {Object} Timer and scheduler information
     */
    inspectTimers(): Object;
    /**
     * Get a summary of all queued tasks by status.
     * @returns {Object} Task summary by status
     */
    inspectTasks(): Object;
    /**
     * Get detailed information about the scheduler state and timing.
     * @returns {Object} Scheduler state information
     */
    inspectScheduler(): Object;
    /**
     * Log comprehensive queue state to console for debugging.
     * @param {boolean} [detailed=false] - Whether to include detailed task information
     */
    debugLog(detailed?: boolean): void;
}
//# sourceMappingURL=hold-my-task.d.mts.map