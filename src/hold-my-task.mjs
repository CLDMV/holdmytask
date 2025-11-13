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
export class HoldMyTask extends EventEmitter {
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
	 *   concurrency: 2,
	 *   delays: { 0: 1000, 1: 500 },
	 *   priorities: {
	 *     1: { postDelay: 100, startDelay: 0 },    // High priority: 100ms post-completion delay, immediate start
	 *     2: { postDelay: 200, startDelay: 50 },   // Medium priority: 200ms post-completion delay, 50ms pre-execution delay
	 *     3: { postDelay: 0, startDelay: 100 }     // Low priority: no post-completion delay, 100ms pre-execution delay
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
	static _transformDelayProperties(config, instance = null) {
		if (!config || typeof config !== "object") {
			return config;
		}

		const transformed = { ...config };

		// Transform old names to new names (backwards compatibility)
		// New names take precedence if both are provided
		if ("start" in config && !("startDelay" in config)) {
			transformed.startDelay = config.start;
			if (instance) {
				setImmediate(() =>
					instance.emit("warning", {
						type: "deprecation",
						message: "Property 'start' is deprecated. Use 'startDelay' instead.",
						deprecated: "start",
						replacement: "startDelay"
					})
				);
			}
		}
		delete transformed.start; // Always remove old property

		if ("delay" in config && !("postDelay" in config)) {
			transformed.postDelay = config.delay;
			if (instance) {
				setImmediate(() =>
					instance.emit("warning", {
						type: "deprecation",
						message: "Property 'delay' is deprecated. Use 'postDelay' instead.",
						deprecated: "delay",
						replacement: "postDelay"
					})
				);
			}
		}
		delete transformed.delay; // Always remove old property

		return transformed;
	}

	constructor(options = {}) {
		super();

		// Sync mode is default for backwards compatibility
		const syncMode = options.sync !== false;

		if (syncMode) {
			// Synchronous initialization - backwards compatible
			this._initializeSync(options);
		} else {
			// Asynchronous initialization - modern usage
			return this._initializeAsync(options);
		}
	}

	/**
	 * Synchronous initialization for backwards compatibility
	 * @private
	 * @param {Object} options - Configuration options
	 */
	_initializeSync(options) {
		this._syncMode = true;
		this._initializeCommon(options);
	}

	/**
	 * Asynchronous initialization for modern usage
	 * @private
	 * @param {Object} options - Configuration options
	 * @returns {Promise<HoldMyTask>} Promise that resolves to this instance
	 */
	async _initializeAsync(options) {
		this._syncMode = false;

		// Return promise for async initialization
		return new Promise((resolve) => {
			setImmediate(() => {
				this._initializeCommon(options);
				resolve(this);
			});
		});
	}

	/**
	 * Common initialization logic used by both sync and async modes
	 * @private
	 * @param {Object} options - Configuration options
	 */
	_initializeCommon(options) {
		// Remove internal options before processing
		const cleanOptions = { ...options };
		delete cleanOptions.sync;
		delete cleanOptions.async;

		// Backward compatibility: support old flat coalescing options
		const legacyCoalescingDefaults = {
			windowDuration: cleanOptions.coalescingWindowDuration ?? 200,
			maxDelay: cleanOptions.coalescingMaxDelay ?? 1000,
			multipleCallbacks: cleanOptions.coalescingMultipleCallbacks ?? false,
			resolveAllPromises: cleanOptions.coalescingResolveAllPromises ?? true
		};

		// Emit deprecation warnings for legacy coalescing options
		const deprecatedCoalescingOptions = [
			{ old: "coalescingWindowDuration", new: "coalescing.defaults.windowDuration" },
			{ old: "coalescingMaxDelay", new: "coalescing.defaults.maxDelay" },
			{ old: "coalescingMultipleCallbacks", new: "coalescing.defaults.multipleCallbacks" },
			{ old: "coalescingResolveAllPromises", new: "coalescing.defaults.resolveAllPromises" }
		];

		deprecatedCoalescingOptions.forEach(({ old, new: replacement }) => {
			if (cleanOptions[old] !== undefined) {
				setImmediate(() =>
					this.emit("warning", {
						type: "deprecation",
						message: `Option '${old}' is deprecated. Use '${replacement}' instead.`,
						deprecated: old,
						replacement: replacement
					})
				);
			}
		});

		// Enhanced coalescing configuration
		const coalescingConfig = cleanOptions.coalescing || {};
		const coalescingDefaults = HoldMyTask._transformDelayProperties(
			{
				...legacyCoalescingDefaults,
				...coalescingConfig.defaults
			},
			this
		);

		// Transform coalescing keys configurations
		const transformedCoalescingKeys = {};
		if (coalescingConfig.keys && typeof coalescingConfig.keys === "object") {
			for (const [key, config] of Object.entries(coalescingConfig.keys)) {
				if (config != null) {
					transformedCoalescingKeys[key] = HoldMyTask._transformDelayProperties(config, this);
				}
			}
		}

		// Transform legacy delays to new priorities format for backward compatibility
		const transformedPriorities = {};

		// First, transform any existing priority configurations to use new property names
		if (cleanOptions.priorities && typeof cleanOptions.priorities === "object") {
			for (const [priority, config] of Object.entries(cleanOptions.priorities)) {
				const priorityNum = parseInt(priority);
				if (!isNaN(priorityNum) && config != null) {
					transformedPriorities[priorityNum] = HoldMyTask._transformDelayProperties(config, this);
				}
			}
		}

		// Then, handle legacy delays option (very old backwards compatibility)
		if (cleanOptions.delays && typeof cleanOptions.delays === "object") {
			// Emit deprecation warning for legacy delays option
			setImmediate(() =>
				this.emit("warning", {
					type: "deprecation",
					message:
						"Option 'delays' is deprecated. Use 'priorities' instead with { [priority]: { postDelay: value, startDelay: 0 } } format.",
					deprecated: "delays",
					replacement: "priorities"
				})
			);

			for (const [priority, delay] of Object.entries(cleanOptions.delays)) {
				const priorityNum = parseInt(priority);
				if (!isNaN(priorityNum) && delay != null) {
					transformedPriorities[priorityNum] = {
						postDelay: delay, // Use new property name
						startDelay: 0, // Use new property name
						...(transformedPriorities[priorityNum] || {}) // Don't override explicit priority config
					};
				}
			}
		}

		// Extract properties that have been transformed or handled specially
		const remainingOptions = { ...cleanOptions };
		delete remainingOptions.priorities;
		delete remainingOptions.delays;
		delete remainingOptions.coalescing;

		// Handle special maxQueue values (-1 means unlimited)
		let maxQueue = remainingOptions.maxQueue;
		if (maxQueue === -1) {
			maxQueue = Infinity;
		}
		delete remainingOptions.maxQueue;

		this.options = {
			concurrency: 1,
			tick: 25,
			autoStart: true,
			defaultPriority: 0,
			maxQueue: maxQueue !== undefined ? maxQueue : Infinity,
			priorities: transformedPriorities, // Unified priority configuration system
			smartScheduling: true, // Use smart timeouts instead of polling by default
			healingInterval: 5000, // Self-healing check interval (smart scheduling only)

			// Enhanced coalescing configuration
			coalescing: {
				defaults: coalescingDefaults,
				keys: transformedCoalescingKeys
			},

			// Legacy coalescing options (kept for backward compatibility but deprecated)
			coalescingWindowDuration: legacyCoalescingDefaults.windowDuration,
			coalescingMaxDelay: legacyCoalescingDefaults.maxDelay,
			coalescingMultipleCallbacks: legacyCoalescingDefaults.multipleCallbacks,
			coalescingResolveAllPromises: legacyCoalescingDefaults.resolveAllPromises,

			...remainingOptions
		};

		// Initialize heaps
		this.pendingHeap = new MinHeap((a, b) => a.readyAt - b.readyAt);
		this.readyHeap = new MinHeap((a, b) => {
			if (a.priority !== b.priority) return b.priority - a.priority; // Higher priority first
			if (a.readyAt !== b.readyAt) return a.readyAt - b.readyAt; // Earlier ready first
			return a.enqueueSeq - b.enqueueSeq; // Earlier enqueue first
		});

		this.running = new Set();
		this.tasks = new Map();
		this.nextId = 1;
		this.enqueueSeq = 1;
		this.isActive = false;
		this.destroyed = false;
		this.lastCompletedPriority = null;
		this.nextAvailableTime = 0; // For delays after task completion

		// Smart scheduling state (used when smartScheduling is enabled)
		this.schedulerTimeout = null;
		this.healingInterval = null;
		this.lastSchedulerRun = 0;

		// Traditional polling state (used when smartScheduling is disabled)
		this.intervalId = null;

		// Coalescing system - separate from main queue
		this.coalescingGroups = new Map(); // coalescingKey -> Array<CoalescingGroup>
		this.coalescingRepresentatives = new Map(); // representativeTaskId -> { coalescingKey, groupId }
		this.nextGroupId = 1;

		if (this.options.autoStart) {
			this.resume();
		}
	}

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
	static async _create(options = {}) {
		// Create instance with async mode
		return new HoldMyTask({ ...options, sync: false });
	}

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
	enqueue(task, optionsOrCallback, options = {}) {
		if (this.destroyed) {
			const error = new Error("Queue is destroyed");
			setImmediate(() => this.emit("error", { error, task, options: optionsOrCallback }));
			return Promise.reject(error);
		}

		if (this.tasks.size >= this.options.maxQueue) {
			const error = new Error("Queue is full");
			setImmediate(() => this.emit("error", { error, task, options: optionsOrCallback }));
			return Promise.reject(error);
		}

		// Handle dual API: callback can be second or third parameter
		let callback = null;
		let finalOptions = options;

		if (typeof optionsOrCallback === "function") {
			callback = optionsOrCallback;
		} else if (optionsOrCallback && typeof optionsOrCallback === "object") {
			finalOptions = { ...optionsOrCallback, ...options };
		}

		// Generate ID - use custom ID if provided, otherwise auto-generate
		const id = finalOptions.id ? String(finalOptions.id) : String(this.nextId++);

		// Check if custom ID already exists
		if (finalOptions.id && this.tasks.has(id)) {
			const error = new Error(`Task with ID '${id}' already exists`);
			setImmediate(() => this.emit("error", { error, task, options: finalOptions }));
			return Promise.reject(error);
		}
		const now = this.now();

		// Handle coalescing tasks separately
		if (finalOptions.coalescingKey) {
			return this._handleCoalescingTask(id, task, callback, finalOptions, now);
		}

		// Regular task handling - apply priority defaults for start delay
		const priority = finalOptions.priority ?? this.options.defaultPriority;
		const priorityConfig = this.getPriorityConfig(priority, finalOptions);
		const effectiveStart = finalOptions.start ?? priorityConfig.startDelay ?? 0;
		const readyAt = finalOptions.timestamp ?? (effectiveStart ? now + effectiveStart : now);

		// Calculate expiration timestamp
		let expireAt = null;
		if (finalOptions.expire !== undefined) {
			// If expire === -1, never expire (useful with coalescing)
			if (finalOptions.expire === -1) {
				expireAt = null;
			} else if (finalOptions.expire > now) {
				expireAt = finalOptions.expire;
			} else {
				expireAt = now + finalOptions.expire;
			}
		}

		const item = {
			id,
			task,
			callback,
			priority,
			readyAt,
			expireAt,
			enqueueSeq: this.enqueueSeq++,
			status: "pending",
			signal: finalOptions.signal,
			timeout: finalOptions.timeout,
			delay: finalOptions.delay, // completion delay
			bypassDelay: finalOptions.bypassDelay || finalOptions.delay === -1, // bypass current delay period
			metadata: finalOptions.metadata
		};

		this.tasks.set(id, item);
		this.pendingHeap.push(item);

		// Check if signal is already aborted
		if (finalOptions.signal?.aborted) {
			this.cancel(id, "Task was aborted");
		} else if (finalOptions.signal) {
			// For both callback and promise API, the queue handles signal abortion
			finalOptions.signal.addEventListener("abort", () => {
				this.cancel(id, "Task was aborted");
			});
		}

		if (this.isActive) {
			if (this.options.smartScheduling) {
				this.scheduleSmartTimeout();
			} else {
				this._scheduleNextTick();
			}
		}
		const tasks = this.tasks; // Capture reference
		const taskHandle = {
			id,
			cancel: (reason) => this.cancel(id, reason),
			status: () => tasks.get(id)?.status ?? "canceled",
			get startedAt() {
				return tasks.get(id)?.startedAt;
			},
			get finishedAt() {
				return tasks.get(id)?.finishedAt;
			},
			get result() {
				return tasks.get(id)?.result;
			},
			get error() {
				return tasks.get(id)?.error;
			}
		};

		// Return Promise if no callback provided
		if (!callback) {
			const promise = new Promise((resolve, reject) => {
				item.resolve = resolve;
				item.reject = reject;
			});

			// Store promise reference on item so we can update properties when task completes
			item.promise = promise;

			// Attach task handle properties to the promise with cached fallback getters
			Object.defineProperty(promise, "id", { value: id, enumerable: true });
			Object.defineProperty(promise, "cancel", { value: (reason) => this.cancel(id, reason), enumerable: true });
			Object.defineProperty(promise, "status", {
				value: () => {
					const currentItem = this.tasks.get(id);
					return currentItem ? currentItem.status : (promise._status ?? "canceled");
				},
				enumerable: true
			});
			Object.defineProperty(promise, "startedAt", {
				get: () => {
					const currentItem = this.tasks.get(id);
					return currentItem ? currentItem.startedAt : promise._startedAt;
				},
				enumerable: true
			});
			Object.defineProperty(promise, "finishedAt", {
				get: () => {
					const currentItem = this.tasks.get(id);
					return currentItem ? currentItem.finishedAt : promise._finishedAt;
				},
				enumerable: true
			});
			Object.defineProperty(promise, "result", {
				get: () => {
					const currentItem = this.tasks.get(id);
					return currentItem ? currentItem.result : promise._result;
				},
				enumerable: true
			});
			Object.defineProperty(promise, "error", {
				get: () => {
					const currentItem = this.tasks.get(id);
					return currentItem ? currentItem.error : promise._error;
				},
				enumerable: true
			});

			return promise;
		}

		return taskHandle;
	}

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
	_handleCoalescingTask(id, task, callback, options, now) {
		const { coalescingKey } = options;

		// Get effective coalescing configuration including new delay and start options
		const coalescingConfig = this.getCoalescingConfig(coalescingKey, options);
		const priority = options.priority ?? this.options.defaultPriority;
		const priorityConfig = this.getPriorityConfig(priority, options);

		// Apply configuration priority: task options > coalescing key config > priority defaults > coalescing defaults
		const effectiveStart = options.start ?? coalescingConfig.startDelay ?? priorityConfig.startDelay ?? 0;

		const readyAt = options.timestamp ?? (effectiveStart ? now + effectiveStart : now);
		const windowEnd = now + coalescingConfig.windowDuration;
		const mustRunBy = now + coalescingConfig.maxDelay;

		// Apply effective delay configuration
		const effectiveDelay = options.delay ?? coalescingConfig.postDelay ?? priorityConfig.postDelay;

		// Create task item (not added to main queue directly)
		const taskItem = {
			id,
			task,
			callback,
			priority,
			readyAt,
			status: "coalescing",
			signal: options.signal,
			timeout: options.timeout,
			delay: effectiveDelay,
			bypassDelay: options.bypassDelay || options.delay === -1,
			metadata: options.metadata,
			coalescingKey,
			enqueueSeq: this.enqueueSeq++
		};

		// Handle signal abortion for coalescing tasks
		if (options.signal?.aborted) {
			taskItem.status = "canceled";
			if (callback) {
				try {
					callback(new Error("Task was aborted"), null);
				} catch (callbackError) {
					this.emit("error", { ...taskItem, error: callbackError, callbackError: true });
				}
			}
			return this._createTaskHandle(taskItem, callback);
		}

		// Add abort listener
		options.signal?.addEventListener("abort", () => {
			this._cancelCoalescingTask(id, coalescingKey, "Task was aborted");
		});

		// Find compatible coalescing group or create new one
		const compatibleGroup = this._findCompatibleCoalescingGroup(coalescingKey, now);

		if (compatibleGroup) {
			// Add to existing group
			this._addToCoalescingGroup(compatibleGroup, taskItem, windowEnd, mustRunBy);
		} else {
			// Create new coalescing group using coalescingConfig
			this._createCoalescingGroup(
				coalescingKey,
				taskItem,
				windowEnd,
				mustRunBy,
				coalescingConfig.multipleCallbacks,
				coalescingConfig.resolveAllPromises
			);
		}

		return this._createTaskHandle(taskItem, callback);
	}

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
	_findCompatibleCoalescingGroup(coalescingKey, now) {
		const groups = this.coalescingGroups.get(coalescingKey);
		if (!groups) return null;

		// Find a group that is within both coalescing window and mustRunBy deadline
		for (const group of groups) {
			if (now <= group.windowEnd && now <= group.mustRunBy) {
				return group;
			}
		}

		return null;
	}

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
	_createCoalescingGroup(coalescingKey, taskItem, windowEnd, mustRunBy, multipleCallbacks, resolveAllPromises) {
		const representativeId = String(this.nextId++);
		const groupId = String(this.nextGroupId++);

		// Create representative task that will actually run
		const representative = {
			id: representativeId,
			task: this._createCoalescingRepresentativeTask(coalescingKey, groupId),
			callback: null, // Representative handles its own completion
			priority: taskItem.priority,
			readyAt: taskItem.readyAt,
			expireAt: null, // Use mustRunBy logic instead
			enqueueSeq: this.enqueueSeq++,
			status: "pending",
			signal: null, // Individual tasks handle their own signals
			timeout: taskItem.timeout,
			delay: taskItem.delay || 0,
			bypassDelay: taskItem.bypassDelay || false,
			metadata: { coalescingKey, groupId, representative: true },
			isCoalescingRepresentative: true
		};

		// Create coalescing group
		const group = {
			coalescingKey,
			groupId,
			tasks: new Map([[taskItem.id, taskItem]]),
			representativeId,
			windowEnd,
			mustRunBy,
			multipleCallbacks,
			resolveAllPromises,
			latestTask: taskItem,
			originalTask: taskItem.task // Store the actual task function
		};

		// Store group and representative mapping
		if (!this.coalescingGroups.has(coalescingKey)) {
			this.coalescingGroups.set(coalescingKey, []);
		}
		this.coalescingGroups.get(coalescingKey).push(group);
		this.coalescingRepresentatives.set(representativeId, { coalescingKey, groupId });

		// Add representative to main queue
		this.tasks.set(representativeId, representative);
		this.pendingHeap.push(representative);

		if (this.isActive) {
			if (this.options.smartScheduling) {
				this.scheduleSmartTimeout();
			} else {
				this._scheduleNextTick();
			}
		}
		return group;
	}

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
	_addToCoalescingGroup(group, taskItem, windowEnd, mustRunBy) {
		// Add task to group
		group.tasks.set(taskItem.id, taskItem);

		// Update group timing - keep original window but preserve earliest mustRunBy
		// NOTE: Don't extend windowEnd - coalescing window should be fixed from first task
		group.mustRunBy = Math.min(group.mustRunBy, mustRunBy);

		// Update latest task (this will be the task function that actually runs)
		group.latestTask = taskItem;
		group.originalTask = taskItem.task;

		// Update representative task in queue if needed
		const representative = this.tasks.get(group.representativeId);
		if (representative) {
			// Update timing - use latest task's timing
			representative.readyAt = taskItem.readyAt;
			representative.priority = taskItem.priority;
			representative.timeout = taskItem.timeout;
			representative.delay = taskItem.delay || representative.delay;
			representative.bypassDelay = taskItem.bypassDelay || representative.bypassDelay;

			// Rebuild heaps to reflect updated representative
			this._rebuildHeaps();

			if (this.isActive) {
				if (this.options.smartScheduling) {
					this.scheduleSmartTimeout();
				} else {
					this._scheduleNextTick();
				}
			}
		}
	}

	/**
	 * Creates the representative task function that manages coalesced task execution.
	 * @private
	 * @internal
	 * @param {string} coalescingKey - The coalescing key
	 * @param {string} groupId - The group ID
	 * @returns {Function} The representative task function
	 */
	_createCoalescingRepresentativeTask(coalescingKey, groupId) {
		return async (signal) => {
			const groups = this.coalescingGroups.get(coalescingKey);
			const group = groups?.find((g) => g.groupId === groupId);

			if (!group) {
				throw new Error(`Coalescing group ${coalescingKey}:${groupId} not found`);
			}

			try {
				// Execute the actual task (using latest task's function)
				const result = await group.originalTask(signal);

				// Handle callbacks/promises
				this._resolveCoalescingGroup(group, null, result);

				return result;
			} catch (error) {
				// Handle errors for all tasks in group
				this._resolveCoalescingGroup(group, error, null);
				throw error;
			} finally {
				// Clean up coalescing group
				this._cleanupCoalescingGroup(coalescingKey, groupId);
			}
		};
	}

	/**
	 * Resolves all callbacks/promises in a coalescing group.
	 * @private
	 * @internal
	 * @param {Object} group - The coalescing group
	 * @param {Error|null} error - Error if task failed
	 * @param {*} result - Result if task succeeded
	 * @returns {void}
	 */
	_resolveCoalescingGroup(group, error, result) {
		if (group.multipleCallbacks) {
			// Multiple callback mode - resolve all non-canceled tasks
			for (const taskItem of group.tasks.values()) {
				if (taskItem.status === "canceled") continue;

				taskItem.status = error ? "error" : "completed";
				taskItem.finishedAt = this.now();

				if (error) {
					taskItem.error = error;
				} else {
					taskItem.result = result;
				}

				if (taskItem.callback) {
					try {
						if (error) {
							taskItem.callback(error, null);
						} else {
							taskItem.callback(null, result);
						}
					} catch (callbackError) {
						this.emit("error", { ...taskItem, error: callbackError, callbackError: true });
					}
				} else if (taskItem.resolve) {
					if (error) {
						taskItem.reject(error);
					} else {
						taskItem.resolve(result);
					}
				}
			}

			// Clean up canceled tasks that didn't get resolved
			for (const taskItem of group.tasks.values()) {
				if (taskItem.status === "canceled" && taskItem.reject) {
					taskItem.reject(new Error("Task was canceled"));
				}
			}
		} else {
			// Single callback mode - resolve latest only or all based on resolveAllPromises option
			for (const taskItem of group.tasks.values()) {
				if (taskItem.status === "canceled") continue;

				if (taskItem === group.latestTask) {
					// Always resolve the latest task
					taskItem.status = error ? "error" : "completed";
					taskItem.finishedAt = this.now();

					if (error) {
						taskItem.error = error;
					} else {
						taskItem.result = result;
					}

					if (taskItem.callback) {
						try {
							if (error) {
								taskItem.callback(error, null);
							} else {
								taskItem.callback(null, result);
							}
						} catch (callbackError) {
							this.emit("error", { ...taskItem, error: callbackError, callbackError: true });
						}
					} else if (taskItem.resolve) {
						if (error) {
							taskItem.reject(error);
						} else {
							taskItem.resolve(result);
						}
					}
				} else {
					// Handle other tasks based on resolveAllPromises setting
					if (group.resolveAllPromises) {
						// Resolve with same result as latest task
						taskItem.status = error ? "error" : "coalesced";
						taskItem.finishedAt = this.now();

						if (error) {
							taskItem.error = error;
						} else {
							taskItem.result = result;
						}

						if (taskItem.callback) {
							try {
								if (error) {
									taskItem.callback(error, null);
								} else {
									taskItem.callback(null, result);
								}
							} catch (callbackError) {
								this.emit("error", { ...taskItem, error: callbackError, callbackError: true });
							}
						} else if (taskItem.resolve) {
							if (error) {
								taskItem.reject(error);
							} else {
								taskItem.resolve(result);
							}
						}
					} else {
						// Reject other tasks (original behavior)
						taskItem.status = "coalesced";
						taskItem.finishedAt = this.now();

						if (taskItem.callback) {
							try {
								taskItem.callback(new Error("Task was coalesced with a newer task"), null);
							} catch (callbackError) {
								this.emit("error", { ...taskItem, error: callbackError, callbackError: true });
							}
						} else if (taskItem.reject) {
							taskItem.reject(new Error("Task was coalesced with a newer task"));
						}
					}
				}
			}

			// Clean up canceled tasks
			for (const taskItem of group.tasks.values()) {
				if (taskItem.status === "canceled" && taskItem.reject) {
					taskItem.reject(new Error("Task was canceled"));
				}
			}
		}
	}

	/**
	 * Cancels a specific task within a coalescing group.
	 * @private
	 * @internal
	 * @param {string} taskId - ID of task to cancel
	 * @param {string} coalescingKey - The coalescing key
	 * @param {string} reason - Cancellation reason
	 * @returns {void}
	 */
	_cancelCoalescingTask(taskId, coalescingKey, reason) {
		const groups = this.coalescingGroups.get(coalescingKey) || [];

		for (const group of groups) {
			const taskItem = group.tasks.get(taskId);
			if (!taskItem) continue;

			taskItem.status = "canceled";
			taskItem.finishedAt = this.now();

			// Handle callback/promise
			if (taskItem.callback) {
				try {
					taskItem.callback(new Error(reason), null);
				} catch (callbackError) {
					this.emit("error", { ...taskItem, error: callbackError, callbackError: true });
				}
			} else if (taskItem.reject) {
				taskItem.reject(new Error(reason));
			}

			// Remove from group
			group.tasks.delete(taskId);

			// If group is empty, clean up representative task
			if (group.tasks.size === 0) {
				const representative = this.tasks.get(group.representativeId);
				if (representative) {
					this.cancel(group.representativeId, "All coalesced tasks canceled");
				}
				this._cleanupCoalescingGroup(coalescingKey, group.groupId);
			} else {
				// Update latest task if needed
				const remainingTasks = Array.from(group.tasks.values());
				group.latestTask = remainingTasks[remainingTasks.length - 1];
				group.originalTask = group.latestTask.task;
			}

			return; // Found and handled the task
		}
	}

	/**
	 * Cleans up a coalescing group after completion or cancellation.
	 * @private
	 * @internal
	 * @param {string} coalescingKey - The coalescing key
	 * @param {string} groupId - The group ID to clean up
	 * @returns {void}
	 */
	_cleanupCoalescingGroup(coalescingKey, groupId) {
		const groups = this.coalescingGroups.get(coalescingKey);
		if (!groups) return;

		const groupIndex = groups.findIndex((g) => g.groupId === groupId);
		if (groupIndex >= 0) {
			const group = groups[groupIndex];
			groups.splice(groupIndex, 1);

			// Remove representative mapping
			this.coalescingRepresentatives.delete(group.representativeId);

			// If no more groups for this key, remove the key entirely
			if (groups.length === 0) {
				this.coalescingGroups.delete(coalescingKey);
			}
		}
	}

	/**
	 * Rebuilds the heap structures to reflect updated priorities/timing.
	 * @private
	 * @internal
	 * @returns {void}
	 */
	_rebuildHeaps() {
		// Rebuild pending heap
		const pendingTasks = [...this.pendingHeap.heap];
		this.pendingHeap = new MinHeap((a, b) => a.readyAt - b.readyAt);
		for (const task of pendingTasks) {
			this.pendingHeap.push(task);
		}

		// Rebuild ready heap
		const readyTasks = [...this.readyHeap.heap];
		this.readyHeap = new MinHeap((a, b) => {
			if (a.priority !== b.priority) return b.priority - a.priority;
			if (a.readyAt !== b.readyAt) return a.readyAt - b.readyAt;
			return a.enqueueSeq - b.enqueueSeq;
		});
		for (const task of readyTasks) {
			this.readyHeap.push(task);
		}
	}

	/**
	 * Creates a task handle for both regular and coalescing tasks.
	 * @private
	 * @internal
	 * @param {Object} item - The task item
	 * @param {Function|null} callback - Callback function
	 * @returns {Promise|Object} Promise or task control object
	 */
	_createTaskHandle(item, callback) {
		const taskHandle = {
			id: item.id,
			cancel: (reason) => {
				if (item.coalescingKey) {
					this._cancelCoalescingTask(item.id, item.coalescingKey, reason || "Task canceled");
				} else {
					this.cancel(item.id, reason || "Task canceled");
				}
			},
			status: () => item.status,
			get startedAt() {
				return item.startedAt;
			},
			get finishedAt() {
				return item.finishedAt;
			},
			get result() {
				return item.result;
			},
			get error() {
				return item.error;
			}
		};

		// Return Promise if no callback provided
		if (!callback) {
			const promise = new Promise((resolve, reject) => {
				item.resolve = resolve;
				item.reject = reject;
			});

			// Store promise reference on item so we can update properties when task completes
			item.promise = promise;

			// Attach task handle properties to the promise
			Object.defineProperty(promise, "id", { value: item.id, enumerable: true });
			Object.defineProperty(promise, "cancel", { value: taskHandle.cancel, enumerable: true });
			Object.defineProperty(promise, "status", { value: taskHandle.status, enumerable: true });
			Object.defineProperty(promise, "startedAt", {
				get: () => (promise._startedAt !== undefined ? promise._startedAt : item.startedAt),
				enumerable: true
			});
			Object.defineProperty(promise, "finishedAt", {
				get: () => (promise._finishedAt !== undefined ? promise._finishedAt : item.finishedAt),
				enumerable: true
			});
			Object.defineProperty(promise, "result", {
				get: () => (promise._result !== undefined ? promise._result : item.result),
				enumerable: true
			});
			Object.defineProperty(promise, "error", {
				get: () => (promise._error !== undefined ? promise._error : item.error),
				enumerable: true
			});

			return promise;
		}

		return taskHandle;
	}

	/**
	 * Cancels a pending task by ID.
	 * @param {string} id - The task ID to cancel
	 * @param {string} [reason="Task canceled"] - Reason for cancellation
	 * @returns {boolean} True if task was found and cancelled, false otherwise
	 * @example
	 * const task = queue.enqueue(() => longRunningTask());
	 * const cancelled = queue.cancel(task.id, "User requested cancellation");
	 */
	cancel(id, reason) {
		const item = this.tasks.get(id);
		if (!item || item.status !== "pending") return false;

		item.status = "canceled";
		item.finishedAt = this.now();
		this.tasks.delete(id);
		this.emit("cancel", item, reason);

		// Reject promise if no callback
		if (!item.callback && item.reject) {
			item.reject(new Error(reason || "Task canceled"));
		}

		return true;
	}

	/**
	 * Alias for cancel() method for backward compatibility.
	 * @param {string|number} id - The task ID to cancel
	 * @param {string} [reason="Task canceled"] - Reason for cancellation
	 * @returns {boolean} True if task was found and cancelled, false otherwise
	 */
	cancelTask(id, reason) {
		return this.cancel(id, reason);
	}

	/**
	 * Pauses the task queue, stopping execution of new tasks.
	 * Currently running tasks will continue to completion.
	 * @returns {void}
	 * @example
	 * queue.pause();
	 * // Queue stops processing new tasks
	 */
	pause() {
		this.isActive = false;
		if (this.options.smartScheduling) {
			this.clearSchedulerTimers();
		} else {
			this.clearTimers();
		}
	}

	/**
	 * Resumes the task queue after being paused.
	 * @returns {void}
	 * @example
	 * queue.resume();
	 * // Queue resumes processing tasks
	 */
	resume() {
		if (this.destroyed) return;
		this.isActive = true;

		if (this.options.smartScheduling) {
			// Start healing interval for smart scheduling
			this.startHealingInterval();

			// If there are pending tasks, run scheduler immediately
			if (this.pendingHeap.size() > 0 || this.readyHeap.size() > 0) {
				this.runScheduler();
			} else {
				this.scheduleSmartTimeout();
			}
		} else {
			// Traditional polling mode
			// If there are pending tasks, run scheduler immediately
			if (this.pendingHeap.size() > 0 || this.readyHeap.size() > 0) {
				this.schedulerTick();
			}
			this._scheduleNextTick();
		}
	}

	/**
	 * Clears all pending and ready tasks from the queue.
	 * Currently running tasks will continue to completion.
	 * @returns {void}
	 * @example
	 * queue.clear();
	 * // All queued tasks are removed
	 */
	clear() {
		// Cancel all pending tasks
		const pendingTasks = [];
		while (this.pendingHeap.size() > 0) {
			const item = this.pendingHeap.pop();
			if (item && item.status === "pending") {
				pendingTasks.push(item);
			}
		}
		for (const item of pendingTasks) {
			item.status = "canceled";
			this.emit("cancel", item);
		}

		// Clear coalescing groups
		for (const [_, groups] of this.coalescingGroups) {
			for (const group of groups) {
				for (const taskItem of group.tasks.values()) {
					taskItem.status = "canceled";
					if (taskItem.callback) {
						try {
							taskItem.callback(new Error("Queue cleared"), null);
						} catch (callbackError) {
							this.emit("error", { ...taskItem, error: callbackError, callbackError: true });
						}
					} else if (taskItem.reject) {
						taskItem.reject(new Error("Queue cleared"));
					}
				}
			}
		}

		this.pendingHeap = new MinHeap((a, b) => a.readyAt - b.readyAt);
		this.readyHeap = new MinHeap((a, b) => {
			if (a.priority !== b.priority) return b.priority - a.priority;
			if (a.readyAt !== b.readyAt) return a.readyAt - b.readyAt;
			return a.enqueueSeq - b.enqueueSeq;
		});
		this.tasks.clear();
		this.coalescingGroups.clear();
		this.coalescingRepresentatives.clear();

		// Reschedule since we may have no work
		if (this.isActive) {
			if (this.options.smartScheduling) {
				this.scheduleSmartTimeout();
			} else {
				// For traditional polling, no need to reschedule as interval will continue
			}
		}
	}

	/**
	 * Returns the number of tasks in the queue.
	 * @returns {number} Number of tasks in the queue
	 * @example
	 * const totalTasks = queue.size(); // 5
	 */
	size() {
		return this.tasks.size;
	}

	/**
	 * Returns the number of tasks in the queue (alias for size()).
	 * @returns {number} Number of tasks in the queue
	 * @example
	 * const totalTasks = queue.length(); // 5
	 */
	length() {
		return this.tasks.size;
	}

	/**
	 * Returns the number of currently running tasks.
	 * @returns {number} Number of running tasks
	 * @example
	 * const runningTasks = queue.inflight(); // 2
	 */
	inflight() {
		return this.running.size;
	}

	/**
	 * Destroys the queue, canceling all tasks and stopping the scheduler.
	 * Once destroyed, the queue cannot be reused.
	 * @returns {void}
	 * @example
	 * queue.destroy();
	 * // Queue is permanently shut down
	 */
	destroy() {
		this.destroyed = true;
		this.pause();
		this.clear();
		this.emit("drain");
	}

	/**
	 * Returns the current timestamp in milliseconds.
	 * @returns {number} Current timestamp
	 * @example
	 * const timestamp = queue.now(); // 1699564800000
	 */
	now() {
		return this.options.now?.() ?? Date.now();
	}

	/**
	 * Schedules the next scheduler tick based on when tasks become ready.
	 * @returns {void}
	 * @private
	 * @internal
	 */
	_scheduleNextTick() {
		if (!this.isActive || this.destroyed) return;

		this.clearTimers();

		const now = this.now();
		let nextTime = Infinity;

		// Check pending heap for next ready time
		const nextPending = this.pendingHeap.peek();
		if (nextPending) {
			nextTime = nextPending.readyAt;
		}

		// Check if we have a delay until next tasks can start
		if (this.nextAvailableTime > now) {
			nextTime = Math.min(nextTime, this.nextAvailableTime);
		}

		// If next event is imminent or past, run immediately
		if (nextTime <= now + this.options.tick) {
			this.intervalId = setInterval(() => this.schedulerTick(), this.options.tick);
		} else {
			// Use timeout for distant events
			const delay = Math.min(nextTime - now, 2147483647); // Max 32-bit int
			this.timeoutId = setTimeout(() => this.schedulerTick(), delay);
		}
	}

	/**
	 * Main scheduler tick that moves ready tasks and starts execution.
	 * @returns {void}
	 * @private
	 */
	schedulerTick() {
		const now = this.now();

		// Move ready tasks from pending to ready heap, checking for expiration
		let nextPending = this.pendingHeap.peek();
		while (nextPending && nextPending.readyAt <= now) {
			const task = this.pendingHeap.pop();
			if (task && task.status === "pending") {
				// Check if task has expired before making it ready
				if (task.expireAt && now >= task.expireAt) {
					this._expireTask(task);
				} else {
					task.status = "ready";
					this.readyHeap.push(task);
				}
			}
			nextPending = this.pendingHeap.peek();
		}

		// Start tasks up to concurrency limit
		let hasWaitingTasks = false;
		const currentTime = this.now();
		const delay = this.lastCompletedPriority !== null ? (this.options.priorities[this.lastCompletedPriority]?.postDelay ?? 0) : 0;
		const delayActive = delay > 0 && currentTime < this.nextAvailableTime;

		while (this.running.size < this.options.concurrency && this.readyHeap.size() > 0) {
			const task = this.readyHeap.peek();
			if (!task) break;

			// Check if task has expired before starting it
			if (task.expireAt && currentTime >= task.expireAt) {
				this.readyHeap.pop(); // Remove expired task from heap
				this._expireTask(task);
				continue; // Check next task
			}

			const canStart = task.bypassDelay || !delayActive;

			if (canStart) {
				this.readyHeap.pop(); // Remove it from heap
				this._startTask(task);
			} else {
				// Can't start due to delay - check if there are any bypass tasks in the heap
				const heapArray = this.readyHeap.heap.slice(); // Copy heap array
				let foundBypassTask = false;

				for (let i = 0; i < heapArray.length; i++) {
					const bypassTask = heapArray[i];

					// Check if bypass task has expired
					if (bypassTask.expireAt && currentTime >= bypassTask.expireAt) {
						// Remove expired task and continue searching
						const remainingTasks = heapArray.filter((t) => t.id !== bypassTask.id);
						this.readyHeap.heap = [];
						for (const t of remainingTasks) {
							this.readyHeap.push(t);
						}
						this._expireTask(bypassTask);
						// Update heapArray for next iteration
						heapArray.splice(i, 1);
						i--; // Adjust index since we removed an item
						continue;
					}

					if (bypassTask.bypassDelay) {
						foundBypassTask = true;
						// Remove the bypass task from heap and start it
						// We need to rebuild the heap without this task
						const remainingTasks = heapArray.filter((t) => t.id !== bypassTask.id);
						this.readyHeap.heap = [];
						for (const t of remainingTasks) {
							this.readyHeap.push(t);
						}
						this._startTask(bypassTask);
						break;
					}
				}

				if (!foundBypassTask) {
					// No bypass tasks available, mark that we have waiting tasks
					hasWaitingTasks = true;
					break;
				}
			}
		}

		// Schedule next tick if there are pending tasks or tasks that might become available
		// Note: For smart scheduling, this is handled by runScheduler calling scheduleSmartTimeout
		if (!this.options.smartScheduling && (this.pendingHeap.size() > 0 || this.readyHeap.size() > 0 || hasWaitingTasks)) {
			this._scheduleNextTick();
		}
	}

	/**
	 * Handles an expired task by removing it and calling appropriate error handling.
	 * @param {Object} item - The expired task item
	 * @returns {void}
	 * @private
	 * @internal
	 */
	_expireTask(item) {
		if (item.status === "expired" || item.status === "canceled" || item.status === "completed") {
			return; // Already handled
		}

		item.status = "expired";
		this.tasks.delete(item.id);
		this.running.delete(item);

		const error = new Error(`Task expired after waiting ${this.now() - (item.readyAt || this.now())}ms in queue`);
		error.type = "expire";
		error.taskId = item.id;

		if (item.callback) {
			// Callback API - emit error event
			try {
				item.callback(error, null);
			} catch (err) {
				this.emit("error", { error: err, task: item });
			}
			// Emit error event for callback API
			this.emit("error", { error, task: item });
		} else if (item.reject) {
			// Promise API - just reject, don't emit error event (handled by promise)
			item.reject(error);
		}
	}

	/**
	 * Starts execution of a ready task.
	 * @param {Object} item - The task item to execute
	 * @returns {Promise<void>}
	 * @private
	 * @internal
	 */
	async _startTask(item) {
		if (item.status !== "ready") return;

		// For promise API, check if signal is already aborted
		if (!item.callback && item.signal?.aborted) {
			item.reject(new Error("Task was aborted"));
			return;
		}

		item.status = "running";
		item.startedAt = this.now();
		this.running.add(item);
		this.emit("start", item);

		// Create abort controller for timeout
		const abortController = new AbortController();
		let timeoutId;

		try {
			// Set up timeout if specified
			let timeoutId;
			let timeoutPromise;

			if (item.timeout) {
				timeoutPromise = new Promise((_, reject) => {
					timeoutId = setTimeout(() => {
						abortController.abort();
						reject(new Error(`Task timed out after ${item.timeout}ms`));
					}, item.timeout);
				});
			}

			// Run the task
			const taskPromise = item.task(abortController.signal);
			const result = item.timeout ? await Promise.race([taskPromise, timeoutPromise]) : await taskPromise;
			item.result = result;
			item.status = "completed";
			item.finishedAt = this.now();

			// Clear timeout if it was set
			if (timeoutId) {
				clearTimeout(timeoutId);
			}

			this.emit("success", item);

			// Store final values on promise handle before resolving (for promise API)
			if (item.promise) {
				// Store final values so getters can access them after task deletion
				item.promise._result = item.result;
				item.promise._error = item.error;
				item.promise._startedAt = item.startedAt;
				item.promise._finishedAt = item.finishedAt;
				item.promise._status = item.status;
			}

			// Call completion callback or resolve promise
			if (item.callback) {
				try {
					item.callback(null, result);
				} catch (callbackError) {
					// Callback threw an error, but task succeeded
					this.emit("error", { ...item, error: callbackError, callbackError: true });
				}
			} else if (item.resolve) {
				item.resolve(result);
			}
		} catch (error) {
			item.error = error;
			item.status = error.message.includes("timed out")
				? "timeout"
				: abortController.signal.aborted || error.name === "AbortError"
					? "canceled"
					: "error";
			item.finishedAt = this.now();

			// Emit error event only for callback API (promise API conveys error via rejection)
			if (item.callback) {
				this.emit("error", item);
			}

			// Store final values on promise handle before rejecting (for promise API)
			if (item.promise) {
				// Store final values so getters can access them after task deletion
				item.promise._result = item.result;
				item.promise._error = item.error;
				item.promise._startedAt = item.startedAt;
				item.promise._finishedAt = item.finishedAt;
				item.promise._status = item.status;
			}

			// Call completion callback or reject promise
			if (item.callback) {
				try {
					const errorPayload =
						item.status === "timeout"
							? { type: "timeout", message: error.message }
							: abortController.signal.aborted || error.name === "AbortError"
								? { type: "canceled", message: "Task was aborted" }
								: { type: "error", error };
					item.callback(errorPayload, null);
				} catch (callbackError) {
					// Callback threw an error
					this.emit("error", { ...item, error: callbackError, callbackError: true });
				}
			} else if (item.reject) {
				item.reject(error);
			}
		} finally {
			// Clear timeout
			if (timeoutId) {
				clearTimeout(timeoutId);
			}

			this.running.delete(item);

			// Clean up all finished tasks (completed, failed, canceled)
			this.tasks.delete(item.id);

			// Update delay tracking after task completion
			const completedPriority = item.priority;
			const taskDelay = item.delay;
			const priorityDelay = this.options.priorities[completedPriority]?.postDelay ?? 0;
			const delay = taskDelay !== undefined ? taskDelay : priorityDelay;
			if (delay > 0) {
				this.lastCompletedPriority = completedPriority;
				this.nextAvailableTime = this.now() + delay;
			} else {
				this.lastCompletedPriority = null;
				this.nextAvailableTime = 0;
			}

			// Check for drain after a microtask tick to ensure event handlers complete
			setImmediate(() => {
				if (this.running.size === 0 && this.pendingHeap.size() === 0 && this.readyHeap.size() === 0) {
					this.emit("drain");
				} else if (this.isActive) {
					// More tasks to run, reschedule immediately
					if (this.options.smartScheduling) {
						this.scheduleSmartTimeout();
					} else {
						this.schedulerTick();
					}
				}
			});
		}
	}

	/**
	 * Clears all active timers (intervals and timeouts).
	 * @returns {void}
	 * @private
	 */
	clearTimers() {
		if (this.intervalId) {
			clearInterval(this.intervalId);
			this.intervalId = undefined;
		}
		if (this.timeoutId) {
			clearTimeout(this.timeoutId);
			this.timeoutId = undefined;
		}
	}

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
	scheduleSmartTimeout() {
		if (!this.isActive || this.destroyed) return;

		this.clearSchedulerTimers();

		const now = this.now();
		let nextRunTime = Infinity;
		let shouldRunNow = false;

		// Check if we have ready tasks that can run immediately
		if (this.readyHeap.size() > 0 && this.running.size < this.options.concurrency) {
			const delay = this.lastCompletedPriority !== null ? (this.options.priorities[this.lastCompletedPriority]?.postDelay ?? 0) : 0;
			const delayActive = delay > 0 && now < this.nextAvailableTime;

			if (!delayActive) {
				shouldRunNow = true;
			} else {
				// Check for bypass tasks
				const heapArray = this.readyHeap.heap.slice();
				for (const task of heapArray) {
					if (task.bypassDelay && (!task.expireAt || now < task.expireAt)) {
						shouldRunNow = true;
						break;
					}
				}

				if (!shouldRunNow) {
					nextRunTime = Math.min(nextRunTime, this.nextAvailableTime);
				}
			}
		}

		// Check when next pending task becomes ready
		const nextPending = this.pendingHeap.peek();
		if (nextPending) {
			nextRunTime = Math.min(nextRunTime, nextPending.readyAt);
		}

		// If we should run now or very soon, do it immediately
		if (shouldRunNow || nextRunTime <= now + 1) {
			// Use setImmediate to allow abort signals to be processed
			setImmediate(() => this.runScheduler());
			return;
		}

		// If we have a future time to schedule for
		if (nextRunTime < Infinity) {
			const delay = Math.min(nextRunTime - now, 2147483647); // Max 32-bit int for setTimeout
			this.schedulerTimeout = setTimeout(() => {
				this.runScheduler();
			}, delay);
		}
	}

	/**
	 * Runs the main scheduler logic and reschedules if needed.
	 * @private
	 * @returns {void}
	 *
	 * @description
	 * Executes the scheduler tick logic and then determines if more scheduling is needed.
	 * Tracks when scheduler last ran for healing mechanism.
	 */
	runScheduler() {
		if (!this.isActive || this.destroyed) return;

		this.lastSchedulerRun = this.now();
		this.schedulerTick();

		// Schedule next run if there's still work to do
		this.scheduleSmartTimeout();
	}

	/**
	 * Starts the self-healing interval that ensures scheduler continues working.
	 * @private
	 * @returns {void}
	 *
	 * @description
	 * Healing mechanism that periodically checks if the scheduler should be running
	 * but isn't due to timeout failures or other issues. Runs every healingInterval milliseconds.
	 */
	startHealingInterval() {
		if (this.healingInterval) {
			clearInterval(this.healingInterval);
		}

		this.healingInterval = setInterval(() => {
			if (!this.isActive || this.destroyed) return;

			const now = this.now();
			const hasWork = this.pendingHeap.size() > 0 || this.readyHeap.size() > 0;
			const timeSinceLastRun = now - this.lastSchedulerRun;
			const shouldHaveRun = hasWork && timeSinceLastRun > this.options.healingInterval;

			// If we should have run but haven't, and we don't have an active timeout, heal
			if (shouldHaveRun && !this.schedulerTimeout) {
				console.warn(`HoldMyTask: Healing scheduler - ${timeSinceLastRun}ms since last run`);
				this.runScheduler();
			}
		}, this.options.healingInterval);
	}

	/**
	 * Clears all scheduler-related timers.
	 * @private
	 * @returns {void}
	 *
	 * @description
	 * Cleans up both the main scheduler timeout and the healing interval timer.
	 */
	clearSchedulerTimers() {
		if (this.schedulerTimeout) {
			clearTimeout(this.schedulerTimeout);
			this.schedulerTimeout = null;
		}
		if (this.healingInterval) {
			clearInterval(this.healingInterval);
			this.healingInterval = null;
		}
	}

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
	configureCoalescingKey(coalescingKey, config) {
		if (typeof coalescingKey !== "string") {
			const error = new Error("coalescingKey must be a string");
			setImmediate(() => this.emit("error", { error, method: "configureCoalescingKey", coalescingKey, config }));
			return;
		}
		if (typeof config !== "object" || config === null) {
			const error = new Error("config must be an object");
			setImmediate(() => this.emit("error", { error, method: "configureCoalescingKey", coalescingKey, config }));
			return;
		}

		// Validate configuration options (accept both old and new property names)
		const validKeys = [
			"windowDuration",
			"maxDelay",
			"delay",
			"start",
			"postDelay",
			"startDelay",
			"multipleCallbacks",
			"resolveAllPromises"
		];
		const invalidKeys = Object.keys(config).filter((key) => !validKeys.includes(key));
		if (invalidKeys.length > 0) {
			const error = new Error(`Invalid config keys: ${invalidKeys.join(", ")}. Valid keys: ${validKeys.join(", ")}`);
			setImmediate(() => this.emit("error", { error, method: "configureCoalescingKey", coalescingKey, config, invalidKeys }));
			return;
		}

		// Transform old property names to new ones for backwards compatibility
		const transformedConfig = HoldMyTask._transformDelayProperties(config, this);

		// Merge with existing configuration for this key
		this.options.coalescing.keys[coalescingKey] = {
			...this.options.coalescing.keys[coalescingKey],
			...transformedConfig
		};
	}

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
	getCoalescingConfig(coalescingKey, taskOptions = {}) {
		const keyConfig = (this.options.coalescing.keys && this.options.coalescing.keys[coalescingKey]) || {};
		const defaults = this.options.coalescing.defaults;
		const priorityConfig = this.getPriorityConfig(taskOptions.priority ?? this.options.defaultPriority);

		const postDelay = taskOptions.delay ?? keyConfig.postDelay ?? priorityConfig.postDelay ?? defaults.postDelay;
		const startDelay = taskOptions.start ?? keyConfig.startDelay ?? priorityConfig.startDelay ?? defaults.startDelay;

		return {
			windowDuration: taskOptions.coalescingWindowDuration ?? keyConfig.windowDuration ?? defaults.windowDuration,
			maxDelay: taskOptions.coalescingMaxDelay ?? keyConfig.maxDelay ?? defaults.maxDelay,
			// New clear property names
			postDelay,
			startDelay,
			// Old property names for backwards compatibility
			delay: postDelay,
			start: startDelay,
			multipleCallbacks: taskOptions.coalescingMultipleCallbacks ?? keyConfig.multipleCallbacks ?? defaults.multipleCallbacks,
			resolveAllPromises: taskOptions.coalescingResolveAllPromises ?? keyConfig.resolveAllPromises ?? defaults.resolveAllPromises
		};
	}

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
	getCoalescingConfigurations() {
		const result = {};
		for (const key of Object.keys(this.options.coalescing.keys)) {
			result[key] = this.getCoalescingConfig(key);
		}
		return result;
	}

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
	configurePriority(priority, config) {
		if (typeof priority !== "number") {
			const error = new Error("priority must be a number");
			setImmediate(() => this.emit("error", { error, method: "configurePriority", priority, config }));
			return;
		}
		if (typeof config !== "object" || config === null) {
			const error = new Error("config must be an object");
			setImmediate(() => this.emit("error", { error, method: "configurePriority", priority, config }));
			return;
		}

		// Validate configuration options (accept both old and new property names)
		const validKeys = ["delay", "start", "postDelay", "startDelay"];
		const invalidKeys = Object.keys(config).filter((key) => !validKeys.includes(key));
		if (invalidKeys.length > 0) {
			const error = new Error(`Invalid config keys: ${invalidKeys.join(", ")}. Valid keys: ${validKeys.join(", ")}`);
			setImmediate(() => this.emit("error", { error, method: "configurePriority", priority, config, invalidKeys }));
			return;
		}

		// Transform old property names to new ones for backwards compatibility
		const transformedConfig = HoldMyTask._transformDelayProperties(config, this);

		// Merge with existing configuration for this priority
		this.options.priorities[priority] = {
			...this.options.priorities[priority],
			...transformedConfig
		};
	}

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
	getPriorityConfig(priority, taskOptions = {}) {
		const priorityConfig = this.options.priorities[priority] || {};

		const postDelay = taskOptions.delay ?? priorityConfig.postDelay;
		const startDelay = taskOptions.start ?? priorityConfig.startDelay;

		return {
			// New clear property names
			postDelay,
			startDelay,
			// Old property names for backwards compatibility
			delay: postDelay,
			start: startDelay
		};
	}

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
	getPriorityConfigurations() {
		const result = {};
		for (const priority of Object.keys(this.options.priorities)) {
			result[priority] = this.getPriorityConfig(parseInt(priority));
		}
		return result;
	}

	/**
	 * Alias for destroy() method for common queue system naming.
	 * @returns {void}
	 */
	shutdown() {
		return this.destroy();
	}

	/**
	 * Alias for enqueue() method for common queue system naming.
	 * @param {Function} task - The task function to execute
	 * @param {Function|Object} optionsOrCallback - Callback function or options object
	 * @param {Object} options - Task options (if callback provided as second parameter)
	 * @returns {Promise|TaskHandle} Promise if no callback provided, TaskHandle otherwise
	 */
	schedule(task, optionsOrCallback, options = {}) {
		return this.enqueue(task, optionsOrCallback, options);
	}

	/**
	 * Alias for enqueue() method for common queue system naming.
	 * @param {Function} task - The task function to execute
	 * @param {Function|Object} optionsOrCallback - Callback function or options object
	 * @param {Object} options - Task options (if callback provided as second parameter)
	 * @returns {Promise|TaskHandle} Promise if no callback provided, TaskHandle otherwise
	 */
	add(task, optionsOrCallback, options = {}) {
		return this.enqueue(task, optionsOrCallback, options);
	}

	/**
	 * Find a task by its ID.
	 * @param {string|number} id - The task ID to find
	 * @returns {Object|null} Task object if found, null otherwise
	 */
	get(id) {
		return this.tasks.get(String(id)) || null;
	}

	/**
	 * Check if a task with the given ID exists.
	 * @param {string|number} id - The task ID to check
	 * @returns {boolean} True if task exists, false otherwise
	 */
	has(id) {
		return this.tasks.has(String(id));
	}

	/**
	 * Alias for get() method for backward compatibility.
	 * @param {string|number} id - The task ID to find
	 * @returns {Object|null} Task object if found, null otherwise
	 */
	getTask(id) {
		return this.get(id);
	}

	/**
	 * Alias for has() method for backward compatibility.
	 * @param {string|number} id - The task ID to check
	 * @returns {boolean} True if task exists, false otherwise
	 */
	hasTask(id) {
		return this.has(id);
	}
}
