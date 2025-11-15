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
     * @param {Object} [options.delays={}] - DEPRECATED: Use priorities[priority].delay instead. Legacy priority-to-delay mapping (auto-converted to priorities)
     * @param {boolean} [options.smartScheduling=true] - Use dynamic timeouts instead of constant polling for better performance
     * @param {number} [options.tick=25] - Polling interval in milliseconds when smartScheduling is disabled
     * @param {number} [options.healingInterval=5000] - Self-healing check interval in milliseconds (smart scheduling only)
     * @param {Object} [options.priorities={}] - Priority-specific default configurations
     * @param {number} [options.priorities[priority].concurrency] - Maximum concurrent tasks for this priority (defaults to global concurrency limit)
     * @param {number} [options.priorities[priority].postDelay] - Delay after task completion before next task of same priority
     * @param {number} [options.priorities[priority].startDelay] - Delay before task execution (pre-execution delay)
     * @param {Object} [options.coalescing] - Enhanced coalescing configuration (preferred over flat options)
     * @param {Object} [options.coalescing.defaults] - Default coalescing settings for all keys
     * @param {number} [options.coalescing.defaults.windowDuration=200] - Default window duration in milliseconds
     * @param {number} [options.coalescing.defaults.maxDelay=1000] - Default maximum delay in milliseconds
     * @param {number} [options.coalescing.defaults.postDelay] - Default post-completion delay in milliseconds
     * @param {number} [options.coalescing.defaults.startDelay] - Default pre-execution delay in milliseconds
     * @param {number} [options.coalescing.defaults.delay] - DEPRECATED: Use postDelay instead
     * @param {number} [options.coalescing.defaults.start] - DEPRECATED: Use startDelay instead
     * @param {boolean} [options.coalescing.defaults.resolveAllPromises=true] - Default promise resolution behavior
     * @param {boolean} [options.coalescing.defaults.multipleCallbacks=false] - Default callback execution behavior
     * @param {Object} [options.coalescing.keys] - Per-coalescingKey configuration overrides (windowDuration, maxDelay, postDelay, startDelay, etc.)
     * @param {number} [options.coalescingWindowDuration=200] - DEPRECATED: Use coalescing.defaults.windowDuration instead
     * @param {number} [options.coalescingMaxDelay=1000] - DEPRECATED: Use coalescing.defaults.maxDelay instead
     * @param {boolean} [options.coalescingMultipleCallbacks=false] - DEPRECATED: Use coalescing.defaults.multipleCallbacks instead
     * @param {boolean} [options.coalescingResolveAllPromises=true] - DEPRECATED: Use coalescing.defaults.resolveAllPromises instead
     * @example
     * // Enhanced configuration with priority defaults and extended coalescing
     * const queue = new HoldMyTask({
     *   concurrency: 8, // Global maximum: 8 total tasks across all priorities
     *   delays: { 0: 1000, 1: 500 },
     *   priorities: {
     *     1: { concurrency: 1, postDelay: 100, startDelay: 0 },    // Critical: Only 1 at a time, 100ms post-delay
     *     2: { concurrency: 3, postDelay: 200, startDelay: 50 },   // Important: Up to 3 at a time, 200ms post-delay
     *     3: { concurrency: 5, postDelay: 0, startDelay: 100 }     // Background: Up to 5 at a time, 100ms pre-delay
     *   },
     *   coalescing: {
     *     defaults: {
     *       windowDuration: 200,
     *       maxDelay: 1000,
     *       postDelay: 50,
     *       startDelay: 25,
     *       resolveAllPromises: true
     *     },
     *     keys: {
     *       'ui.update': { windowDuration: 100, maxDelay: 500, postDelay: 25, startDelay: 0 },
     *       'api.batch': { windowDuration: 1000, maxDelay: 5000, postDelay: 100, startDelay: 200 },
     *       'device.control': { windowDuration: 50, maxDelay: 200, delay: 10, start: 5 }
     *     }
     *   }
     * });
     *
     * @example
     * // Backward compatible (deprecated but still supported)
     * const legacyQueue = new HoldMyTask({
     *   coalescingWindowDuration: 1500,
     *   coalescingMaxDelay: 3000,
     *   coalescingResolveAllPromises: true
     * });
     */
    /**
     * Transforms delay properties for backwards compatibility.
     * Converts 'start' -> 'startDelay' and 'delay' -> 'postDelay' while preserving new names.
     * @param {Object} config - Configuration object that may contain old or new property names
     * @param {HoldMyTask} [instance] - Optional instance to emit deprecation warnings on
     * @returns {Object} Transformed configuration with new property names
     * @private
     * @internal
     */
    private static _transformDelayProperties;
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
    constructor(options?: {});
    /**
     * Synchronous initialization for backwards compatibility
     * @private
     * @param {Object} options - Configuration options
     */
    private _initializeSync;
    _syncMode: boolean;
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
    options: any;
    pendingHeap: MinHeap;
    readyHeap: MinHeap;
    running: Set<any>;
    runningByPriority: Map<any, any>;
    tasks: Map<any, any>;
    nextId: number;
    enqueueSeq: number;
    isActive: boolean;
    destroyed: boolean;
    lastCompletedPriority: any;
    nextAvailableTime: any;
    schedulerTimeout: NodeJS.Timeout;
    healingInterval: NodeJS.Timeout;
    lastSchedulerRun: number;
    intervalId: NodeJS.Timeout;
    coalescingGroups: Map<any, any>;
    coalescingRepresentatives: Map<any, any>;
    nextGroupId: number;
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
    enqueue(task: Function, optionsOrCallback?: Function | any, options?: {
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
    }): Promise<any> | any;
    /**
     * Handles tasks with coalescingKey through the coalescing system.
     * @private
     * @internal
     * @param {string} id - Task ID
     * @param {Function} task - Task function
     * @param {Function|null} callback - Callback function (null for promise API)
     * @param {Object} options - Task options
     * @param {number} now - Current timestamp
     * @returns {Promise|Object} Promise or task handle
     */
    private _handleCoalescingTask;
    /**
     * Finds a compatible coalescing group for a new task.
     * @private
     * @internal
     * @param {string} coalescingKey - The coalescing key
     * @param {number} now - Current timestamp
     * @param {number} windowEnd - End of new task's coalescing window
     * @param {number} mustRunBy - New task's mustRunBy deadline
     * @returns {Object|null} Compatible coalescing group or null
     */
    private _findCompatibleCoalescingGroup;
    /**
     * Creates a new coalescing group with a representative task in the main queue.
     * @private
     * @internal
     * @param {string} coalescingKey - The coalescing key
     * @param {Object} taskItem - The first task item for this group
     * @param {number} windowEnd - End of coalescing window
     * @param {number} mustRunBy - Latest execution deadline
     * @param {boolean} multipleCallbacks - Whether to call multiple callbacks
     * @param {boolean} resolveAllPromises - Whether to resolve all promises with same result
     * @returns {Object} The created coalescing group
     */
    private _createCoalescingGroup;
    /**
     * Adds a task to an existing coalescing group, updating the representative if needed.
     * @private
     * @internal
     * @param {Object} group - The existing coalescing group
     * @param {Object} taskItem - The new task item to add
     * @param {number} windowEnd - End of coalescing window
     * @param {number} mustRunBy - Latest execution deadline
     * @param {number} now - Current timestamp
     * @returns {void}
     */
    private _addToCoalescingGroup;
    /**
     * Creates the representative task function that manages coalesced task execution.
     * @private
     * @internal
     * @param {string} coalescingKey - The coalescing key
     * @param {string} groupId - The group ID
     * @returns {Function} The representative task function
     */
    private _createCoalescingRepresentativeTask;
    /**
     * Resolves all callbacks/promises in a coalescing group.
     * @private
     * @internal
     * @param {Object} group - The coalescing group
     * @param {Error|null} error - Error if task failed
     * @param {*} result - Result if task succeeded
     * @returns {void}
     */
    private _resolveCoalescingGroup;
    /**
     * Cancels a specific task within a coalescing group.
     * @private
     * @internal
     * @param {string} taskId - ID of task to cancel
     * @param {string} coalescingKey - The coalescing key
     * @param {string} reason - Cancellation reason
     * @returns {void}
     */
    private _cancelCoalescingTask;
    /**
     * Cleans up a coalescing group after completion or cancellation.
     * @private
     * @internal
     * @param {string} coalescingKey - The coalescing key
     * @param {string} groupId - The group ID to clean up
     * @returns {void}
     */
    private _cleanupCoalescingGroup;
    /**
     * Rebuilds the heap structures to reflect updated priorities/timing.
     * @private
     * @internal
     * @returns {void}
     */
    private _rebuildHeaps;
    /**
     * Creates a task handle for both regular and coalescing tasks.
     * @private
     * @internal
     * @param {Object} item - The task item
     * @param {Function|null} callback - Callback function
     * @returns {Promise|Object} Promise or task control object
     */
    private _createTaskHandle;
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
    getCoalescingGroup(coalescingKey: string, groupId?: string): any | any[] | null;
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
    getCoalescingGroupsSummary(): any;
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
    findCoalescingGroupByTaskId(taskId: string | number): any | null;
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
     * @internal
     */
    private _scheduleNextTick;
    timeoutId: NodeJS.Timeout;
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
     * Handles an expired task by removing it and calling appropriate error handling.
     * @param {Object} item - The expired task item
     * @returns {void}
     * @private
     * @internal
     */
    private _expireTask;
    /**
     * Starts execution of a ready task.
     * @param {Object} item - The task item to execute
     * @returns {Promise<void>}
     * @private
     * @internal
     */
    private _startTask;
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
    getCoalescingConfig(coalescingKey: string, taskOptions?: any): any;
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
    getCoalescingConfigurations(): any;
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
    getPriorityConfig(priority: number, taskOptions?: any): any;
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
    getPriorityConfigurations(): any;
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
    schedule(task: Function, optionsOrCallback: Function | any, options?: any): Promise<any> | TaskHandle;
    /**
     * Alias for enqueue() method for common queue system naming.
     * @param {Function} task - The task function to execute
     * @param {Function|Object} optionsOrCallback - Callback function or options object
     * @param {Object} options - Task options (if callback provided as second parameter)
     * @returns {Promise|TaskHandle} Promise if no callback provided, TaskHandle otherwise
     */
    add(task: Function, optionsOrCallback: Function | any, options?: any): Promise<any> | TaskHandle;
    /**
     * Find a task by its ID.
     * @param {string|number} id - The task ID to find
     * @returns {Object|null} Task object if found, null otherwise
     */
    get(id: string | number): any | null;
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
    getTask(id: string | number): any | null;
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
    inspect(): any;
    /**
     * Get information about active timers and scheduler state.
     * @returns {Object} Timer and scheduler information
     */
    inspectTimers(): any;
    /**
     * Get a summary of all queued tasks by status.
     * @returns {Object} Task summary by status
     */
    inspectTasks(): any;
    /**
     * Get detailed information about the scheduler state and timing.
     * @returns {Object} Scheduler state information
     */
    inspectScheduler(): any;
    /**
     * Log comprehensive queue state to console for debugging.
     * @param {boolean} [detailed=false] - Whether to include detailed task information
     */
    debugLog(detailed?: boolean): void;
}
import { EventEmitter } from "events";
import { MinHeap } from "./utils.mjs";
//# sourceMappingURL=hold-my-task.d.mts.map