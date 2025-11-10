/**
 *	@Project: @cldmv/holdmytask
 *	@Filename: /src/hold-my-task.mjs
 *	@Date: 2025-11-08 17:43:19 -08:00 (1762652599)
 *	@Author: Nate Hyson <CLDMV>
 *	@Email: <Shinrai@users.noreply.github.com>
 *	-----
 *	@Last modified by: Nate Hyson <CLDMV> (Shinrai@users.noreply.github.com)
 *	@Last modified time: 2025-11-09 19:27:13 -08:00 (1762745233)
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
	 * @example
	 * const queue = new HoldMyTask({
	 *   concurrency: 2,
	 *   tick: 50,
	 *   defaultPriority: 1,
	 *   delays: { 0: 1000, 1: 500 }
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
		const readyAt = finalOptions.timestamp ?? now;

		// Calculate expiration timestamp
		let expireAt = null;
		if (finalOptions.expire !== undefined) {
			// If expire > current timestamp, treat as absolute timestamp
			// If expire <= current timestamp, treat as milliseconds from now
			if (finalOptions.expire > now) {
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
			this.cancelTask(id, "Aborted");
		} else if (callback) {
			// For callback API, the queue handles signal abortion
			finalOptions.signal?.addEventListener("abort", () => {
				this.cancelTask(id, "Aborted");
			});
		}
		// For promise API, assume the task handles the signal itself

		if (this.isActive) {
			this.scheduleNextTick();
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
		this.clearTimers();
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
		// If there are pending tasks, run scheduler immediately
		if (this.pendingHeap.size() > 0 || this.readyHeap.size() > 0) {
			this.schedulerTick();
		}
		this.scheduleNextTick();
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

		this.pendingHeap = new MinHeap((a, b) => a.readyAt - b.readyAt);
		this.readyHeap = new MinHeap((a, b) => {
			if (a.priority !== b.priority) return b.priority - a.priority;
			if (a.readyAt !== b.readyAt) return a.readyAt - b.readyAt;
			return a.enqueueSeq - b.enqueueSeq;
		});
		this.tasks.clear();
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
		if (this.pendingHeap.size() > 0 || this.readyHeap.size() > 0 || hasWaitingTasks) {
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
					// More tasks to run, run scheduler immediately
					this.schedulerTick();
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
}
