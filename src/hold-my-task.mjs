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
	 * @param {Object} [options.delays={}] - Map of priority levels to delay times in milliseconds between task completions
	 * @param {boolean} [options.smartScheduling=true] - Use dynamic timeouts instead of constant polling for better performance
	 * @param {number} [options.tick=25] - Polling interval in milliseconds when smartScheduling is disabled
	 * @param {number} [options.healingInterval=5000] - Self-healing check interval in milliseconds (smart scheduling only)
	 * @param {number} [options.coalescingWindowDuration=1000] - Default coalescing window duration in milliseconds
	 * @param {number} [options.coalescingMaxDelay=2000] - Maximum delay before a coalesced task must run regardless of new tasks
	 * @param {boolean} [options.coalescingMultipleCallbacks=false] - If true, call all coalesced callbacks; if false, call only the latest
	 * @param {boolean} [options.coalescingResolveAllPromises=true] - If true, resolve all coalesced promises with same result; if false, reject non-latest
	 * @example
	 * const queue = new HoldMyTask({
	 *   concurrency: 2,
	 *   tick: 50,
	 *   defaultPriority: 1,
	 *   delays: { 0: 1000, 1: 500 },
	 *   coalescingWindowDuration: 1500,
	 *   coalescingMaxDelay: 3000,
	 *   coalescingResolveAllPromises: true
	 * });
	 *
	 * @example
	 * // Use traditional polling instead of smart scheduling
	 * const legacyQueue = new HoldMyTask({
	 *   smartScheduling: false,
	 *   tick: 50
	 * });
	 */
	constructor(options = {}) {
		super();
		this.options = {
			concurrency: 1,
			tick: 25,
			autoStart: true,
			defaultPriority: 0,
			maxQueue: Infinity,
			delays: {}, // priority -> delay in ms between tasks of that priority
			smartScheduling: true, // Use smart timeouts instead of polling by default
			healingInterval: 5000, // Self-healing check interval (smart scheduling only)
			coalescingWindowDuration: 1000, // Default coalescing window duration
			coalescingMaxDelay: 2000, // Maximum delay before task must run
			coalescingMultipleCallbacks: false, // Call multiple callbacks vs single latest
			coalescingResolveAllPromises: true, // Resolve all promises vs reject non-latest
			...options
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
	 * Adds a task to the queue for execution. Supports both callback and promise-based APIs.
	 * @param {Function} task - The task function to execute. Can be sync or async.
	 * @param {Function|Object} [optionsOrCallback] - Either a callback function or options object
	 * @param {Object} [options={}] - Additional options (if callback was provided as second parameter)
	 * @param {number} [options.priority] - Task priority (higher numbers run first)
	 * @param {number} [options.timestamp] - When the task should be ready to run (milliseconds since epoch)
	 * @param {number} [options.start] - Milliseconds from now when the task should be ready to run (convenience for timestamp calculation)
	 * @param {AbortSignal} [options.signal] - AbortSignal to cancel the task
	 * @param {number} [options.timeout] - Task timeout in milliseconds (for execution time limit)
	 * @param {number} [options.expire] - Task expiration timestamp or milliseconds from now (for queue waiting time limit)
	 * @param {number} [options.delay] - Delay after task completion before next task of same priority
	 * @param {boolean} [options.bypassDelay] - If true, skip any active delay period and start immediately
	 * @param {string} [options.coalescingKey] - Key for task coalescing - tasks with same key will be coalesced within windows
	 * @param {number} [options.coalescingWindowDuration] - Override default coalescing window duration in milliseconds
	 * @param {number} [options.coalescingMaxDelay] - Override default max delay before task must run regardless of coalescing
	 * @param {boolean} [options.coalescingMultipleCallbacks] - Override default for calling multiple vs single callback
	 * @param {boolean} [options.coalescingResolveAllPromises] - Override default for resolving all promises vs rejecting non-latest
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
			throw new Error("Queue is destroyed");
		}

		if (this.tasks.size >= this.options.maxQueue) {
			throw new Error("Queue is full");
		}

		// Handle dual API: callback can be second or third parameter
		let callback = null;
		let finalOptions = options;

		if (typeof optionsOrCallback === "function") {
			callback = optionsOrCallback;
		} else if (optionsOrCallback && typeof optionsOrCallback === "object") {
			finalOptions = { ...optionsOrCallback, ...options };
		}

		const id = String(this.nextId++);
		const now = this.now();

		// Handle coalescing tasks separately
		if (finalOptions.coalescingKey) {
			return this.handleCoalescingTask(id, task, callback, finalOptions, now);
		}

		// Regular task handling
		const readyAt = finalOptions.timestamp ?? (finalOptions.start ? now + finalOptions.start : now);

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
			priority: finalOptions.priority ?? this.options.defaultPriority,
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
			this.cancelTask(id, "Task was aborted");
		} else if (finalOptions.signal) {
			// For both callback and promise API, the queue handles signal abortion
			finalOptions.signal.addEventListener("abort", () => {
				this.cancelTask(id, "Task was aborted");
			});
		}

		if (this.isActive) {
			if (this.options.smartScheduling) {
				this.scheduleSmartTimeout();
			} else {
				this.scheduleNextTick();
			}
		}

		const tasks = this.tasks; // Capture reference
		const taskHandle = {
			id,
			cancel: (reason) => this.cancelTask(id, reason),
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

			// Attach task handle properties to the promise with live getters
			const tasksRef = this.tasks;
			Object.defineProperty(promise, "id", { value: id, enumerable: true });
			Object.defineProperty(promise, "cancel", { value: (reason) => this.cancelTask(id, reason), enumerable: true });
			Object.defineProperty(promise, "status", { value: () => tasksRef.get(id)?.status ?? "canceled", enumerable: true });
			Object.defineProperty(promise, "startedAt", { get: () => tasksRef.get(id)?.startedAt, enumerable: true });
			Object.defineProperty(promise, "finishedAt", { get: () => tasksRef.get(id)?.finishedAt, enumerable: true });
			Object.defineProperty(promise, "result", { get: () => tasksRef.get(id)?.result, enumerable: true });
			Object.defineProperty(promise, "error", { get: () => tasksRef.get(id)?.error, enumerable: true });

			return promise;
		}

		return taskHandle;
	}

	/**
	 * Handles tasks with coalescingKey through the coalescing system.
	 * @private
	 * @param {string} id - Task ID
	 * @param {Function} task - Task function
	 * @param {Function|null} callback - Callback function (null for promise API)
	 * @param {Object} options - Task options
	 * @param {number} now - Current timestamp
	 * @returns {Promise|Object} Promise or task handle
	 */
	handleCoalescingTask(id, task, callback, options, now) {
		const { coalescingKey } = options;
		const windowDuration = options.coalescingWindowDuration ?? this.options.coalescingWindowDuration;
		const maxDelay = options.coalescingMaxDelay ?? this.options.coalescingMaxDelay;
		const multipleCallbacks = options.coalescingMultipleCallbacks ?? this.options.coalescingMultipleCallbacks;
		const resolveAllPromises = options.coalescingResolveAllPromises ?? this.options.coalescingResolveAllPromises;

		const readyAt = options.timestamp ?? (options.start ? now + options.start : now);
		const windowEnd = now + windowDuration;
		const mustRunBy = now + maxDelay;

		// Create task item (not added to main queue directly)
		const taskItem = {
			id,
			task,
			callback,
			priority: options.priority ?? this.options.defaultPriority,
			readyAt,
			status: "coalescing",
			signal: options.signal,
			timeout: options.timeout,
			delay: options.delay,
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
			return this.createTaskHandle(taskItem, callback);
		}

		// Add abort listener
		options.signal?.addEventListener("abort", () => {
			this.cancelCoalescingTask(id, coalescingKey, "Task was aborted");
		});

		// Find compatible coalescing group or create new one
		const compatibleGroup = this.findCompatibleCoalescingGroup(coalescingKey, now);

		if (compatibleGroup) {
			// Add to existing group
			this.addToCoalescingGroup(compatibleGroup, taskItem, windowEnd, mustRunBy);
		} else {
			// Create new coalescing group
			this.createCoalescingGroup(coalescingKey, taskItem, windowEnd, mustRunBy, multipleCallbacks, resolveAllPromises);
		}

		return this.createTaskHandle(taskItem, callback);
	}

	/**
	 * Finds a compatible coalescing group for a new task.
	 * @private
	 * @param {string} coalescingKey - The coalescing key
	 * @param {number} now - Current timestamp
	 * @param {number} windowEnd - End of new task's coalescing window
	 * @param {number} mustRunBy - New task's mustRunBy deadline
	 * @returns {Object|null} Compatible coalescing group or null
	 */
	findCompatibleCoalescingGroup(coalescingKey, now) {
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
	 * @param {string} coalescingKey - The coalescing key
	 * @param {Object} taskItem - The first task item for this group
	 * @param {number} windowEnd - End of coalescing window
	 * @param {number} mustRunBy - Latest execution deadline
	 * @param {boolean} multipleCallbacks - Whether to call multiple callbacks
	 * @param {boolean} resolveAllPromises - Whether to resolve all promises with same result
	 * @returns {Object} The created coalescing group
	 */
	createCoalescingGroup(coalescingKey, taskItem, windowEnd, mustRunBy, multipleCallbacks, resolveAllPromises) {
		const representativeId = String(this.nextId++);
		const groupId = String(this.nextGroupId++);

		// Create representative task that will actually run
		const representative = {
			id: representativeId,
			task: this.createCoalescingRepresentativeTask(coalescingKey, groupId),
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
				this.scheduleNextTick();
			}
		}

		return group;
	}

	/**
	 * Adds a task to an existing coalescing group, updating the representative if needed.
	 * @private
	 * @param {Object} group - The existing coalescing group
	 * @param {Object} taskItem - The new task item to add
	 * @param {number} windowEnd - End of coalescing window
	 * @param {number} mustRunBy - Latest execution deadline
	 * @param {number} now - Current timestamp
	 * @returns {void}
	 */
	addToCoalescingGroup(group, taskItem, windowEnd, mustRunBy) {
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
			this.rebuildHeaps();

			if (this.isActive) {
				if (this.options.smartScheduling) {
					this.scheduleSmartTimeout();
				} else {
					this.scheduleNextTick();
				}
			}
		}
	}

	/**
	 * Creates the representative task function that manages coalesced task execution.
	 * @private
	 * @param {string} coalescingKey - The coalescing key
	 * @param {string} groupId - The group ID
	 * @returns {Function} The representative task function
	 */
	createCoalescingRepresentativeTask(coalescingKey, groupId) {
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
				this.resolveCoalescingGroup(group, null, result);

				return result;
			} catch (error) {
				// Handle errors for all tasks in group
				this.resolveCoalescingGroup(group, error, null);
				throw error;
			} finally {
				// Clean up coalescing group
				this.cleanupCoalescingGroup(coalescingKey, groupId);
			}
		};
	}

	/**
	 * Resolves all callbacks/promises in a coalescing group.
	 * @private
	 * @param {Object} group - The coalescing group
	 * @param {Error|null} error - Error if task failed
	 * @param {*} result - Result if task succeeded
	 * @returns {void}
	 */
	resolveCoalescingGroup(group, error, result) {
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
	 * @param {string} taskId - ID of task to cancel
	 * @param {string} coalescingKey - The coalescing key
	 * @param {string} reason - Cancellation reason
	 * @returns {void}
	 */
	cancelCoalescingTask(taskId, coalescingKey, reason) {
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
					this.cancelTask(group.representativeId, "All coalesced tasks canceled");
				}
				this.cleanupCoalescingGroup(coalescingKey, group.groupId);
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
	 * @param {string} coalescingKey - The coalescing key
	 * @param {string} groupId - The group ID to clean up
	 * @returns {void}
	 */
	cleanupCoalescingGroup(coalescingKey, groupId) {
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
	 * @returns {void}
	 */
	rebuildHeaps() {
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
	 * @param {Object} item - The task item
	 * @param {Function|null} callback - Callback function
	 * @returns {Promise|Object} Promise or task control object
	 */
	createTaskHandle(item, callback) {
		const taskHandle = {
			id: item.id,
			cancel: (reason) => {
				if (item.coalescingKey) {
					this.cancelCoalescingTask(item.id, item.coalescingKey, reason || "Task canceled");
				} else {
					this.cancelTask(item.id, reason || "Task canceled");
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

			// Attach task handle properties to the promise
			Object.defineProperty(promise, "id", { value: item.id, enumerable: true });
			Object.defineProperty(promise, "cancel", { value: taskHandle.cancel, enumerable: true });
			Object.defineProperty(promise, "status", { value: taskHandle.status, enumerable: true });
			Object.defineProperty(promise, "startedAt", { get: () => item.startedAt, enumerable: true });
			Object.defineProperty(promise, "finishedAt", { get: () => item.finishedAt, enumerable: true });
			Object.defineProperty(promise, "result", { get: () => item.result, enumerable: true });
			Object.defineProperty(promise, "error", { get: () => item.error, enumerable: true });

			return promise;
		}

		return taskHandle;
	}

	/**
	 * Cancels a pending task by ID.
	 * @param {string} id - The task ID to cancel
	 * @param {string} [reason="Task canceled"] - Reason for cancellation
	 * @returns {void}
	 * @example
	 * const task = queue.enqueue(() => longRunningTask());
	 * queue.cancelTask(task.id, "User requested cancellation");
	 */
	cancelTask(id, reason) {
		const item = this.tasks.get(id);
		if (!item || item.status !== "pending") return;

		item.status = "canceled";
		item.finishedAt = this.now();
		this.tasks.delete(id);
		this.emit("cancel", item, reason);

		// Reject promise if no callback
		if (!item.callback && item.reject) {
			item.reject(new Error(reason || "Task canceled"));
		}
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
			this.scheduleNextTick();
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
	 */
	scheduleNextTick() {
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
					this.expireTask(task);
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
		const delay = this.lastCompletedPriority !== null ? this.options.delays[this.lastCompletedPriority] || 0 : 0;
		const delayActive = delay > 0 && currentTime < this.nextAvailableTime;

		while (this.running.size < this.options.concurrency && this.readyHeap.size() > 0) {
			const task = this.readyHeap.peek();
			if (!task) break;

			// Check if task has expired before starting it
			if (task.expireAt && currentTime >= task.expireAt) {
				this.readyHeap.pop(); // Remove expired task from heap
				this.expireTask(task);
				continue; // Check next task
			}

			const canStart = task.bypassDelay || !delayActive;

			if (canStart) {
				this.readyHeap.pop(); // Remove it from heap
				this.startTask(task);
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
						this.expireTask(bypassTask);
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
						this.startTask(bypassTask);
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
			this.scheduleNextTick();
		}
	}

	/**
	 * Handles an expired task by removing it and calling appropriate error handling.
	 * @param {Object} item - The expired task item
	 * @returns {void}
	 * @private
	 */
	expireTask(item) {
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
	 */
	async startTask(item) {
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
			if (item.status !== "completed") {
				this.tasks.delete(item.id); // Clean up failed/canceled tasks
			}

			// Update delay tracking after task completion
			const completedPriority = item.priority;
			const taskDelay = item.delay;
			const globalDelay = this.options.delays[completedPriority] || 0;
			const delay = taskDelay !== undefined ? taskDelay : globalDelay;
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
			const delay = this.lastCompletedPriority !== null ? this.options.delays[this.lastCompletedPriority] || 0 : 0;
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
}
