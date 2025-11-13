# @cldmv/holdmytask

[![npm version](https://img.shields.io/npm/v/%40cldmv%2Fholdmytask.svg?style=for-the-badge&logo=npm&logoColor=white&labelColor=CB3837)](https://www.npmjs.com/package/@cldmv/holdmytask)
[![npm downloads](https://img.shields.io/npm/dm/%40cldmv%2Fholdmytask.svg?style=for-the-badge&logo=npm&logoColor=white&labelColor=CB3837)](https://www.npmjs.com/package/@cldmv/holdmytask)
[![GitHub downloads](https://img.shields.io/github/downloads/CLDMV/holdmytask/total?style=for-the-badge&logo=github&logoColor=white&labelColor=181717)](https://github.com/CLDMV/holdmytask/releases)
[![Last commit](https://img.shields.io/github/last-commit/CLDMV/holdmytask?style=for-the-badge&logo=github&logoColor=white&labelColor=181717)](https://github.com/CLDMV/holdmytask/commits)
[![npm last update](https://img.shields.io/npm/last-update/%40cldmv%2Fholdmytask?style=for-the-badge&logo=npm&logoColor=white&labelColor=CB3837)](https://www.npmjs.com/package/@cldmv/holdmytask)

[![Contributors](https://img.shields.io/github/contributors/CLDMV/holdmytask.svg?style=for-the-badge&logo=github&logoColor=white&labelColor=181717)](https://github.com/CLDMV/holdmytask/graphs/contributors) [![Sponsor shinrai](https://img.shields.io/github/sponsors/shinrai?style=for-the-badge&logo=githubsponsors&logoColor=white&labelColor=EA4AAA&label=Sponsor)](https://github.com/sponsors/shinrai)

A tiny, dependency-free task queue for Node.js that executes tasks with priority ordering, concurrency control, and completion delays. Perfect for managing asynchronous workflows with sophisticated timing requirements.

## ✨ Features

- **Smart scheduling** - Dynamic timeout-based scheduling for optimal performance
- **Task coalescing** - Intelligent merging of similar tasks for efficiency
- **Priority-based execution** - Higher priority tasks run first
- **Concurrency control** - Limit simultaneous task execution
- **Completion delays** - Configurable delays between task completions
- **Delay bypass** - Urgent tasks can skip active delay periods
- **Timeout support** - Automatic task cancellation on timeout
- **Dual API support** - Both callback and Promise-based APIs
- **AbortController integration** - Cooperative cancellation support
- **Dual ESM/CJS exports** - Works with both module systems
- **TypeScript ready** - Full type definitions included
- **Zero dependencies** - Lightweight and fast

## 📦 Installation

```bash
npm install @cldmv/holdmytask
```

## � Import Options

The library provides flexible import options for different use cases:

### Production (Default)

```javascript
import { HoldMyTask } from "@cldmv/holdmytask";
// Uses optimized distribution files
```

### Development Source Access

```javascript
import { HoldMyTask } from "@cldmv/holdmytask/main";
// Conditional: uses source files in development, dist files in production
```

### Direct Source Import (Development Only)

```javascript
import { HoldMyTask } from "@cldmv/holdmytask/src";
// Always uses source files - bypasses devcheck
```

**Note:** The main import automatically runs environment checks in development mode to ensure proper configuration.

## 🚀 Quick Start

```javascript
import { HoldMyTask } from "@cldmv/holdmytask";

const queue = new HoldMyTask({
	concurrency: 2,
	delays: { 1: 100, 2: 200 }, // 100ms delay after priority 1 tasks, 200ms after priority 2
	coalescingWindowDuration: 200, // Group similar tasks within 200ms
	coalescingMaxDelay: 1000 // Force execution after 1000ms max
});

// Enqueue a task
queue.enqueue(
	async (signal) => {
		// Your task logic here
		return "task result";
	},
	(error, result) => {
		if (error) {
			console.error("Task failed:", error);
		} else {
			console.log("Task completed:", result);
		}
	},
	{ priority: 1, timeout: 5000 }
);

// Coalescing example - multiple similar tasks become one
const results = await Promise.all([
	queue.enqueue(async () => updateUI(), { coalescingKey: "ui.update" }),
	queue.enqueue(async () => updateUI(), { coalescingKey: "ui.update" }),
	queue.enqueue(async () => updateUI(), { coalescingKey: "ui.update" })
]);
// Only one updateUI() call executes, all three promises resolve with the same result
```

## 🔄 Promise API

For modern async/await codebases, you can omit the callback to get a Promise:

```javascript
import { HoldMyTask } from "@cldmv/holdmytask";

const queue = new HoldMyTask({ concurrency: 2 });

// Promise-based task
try {
	const result = await queue.enqueue(
		async (signal) => {
			// Task logic with abort support
			if (signal.aborted) throw new Error("Aborted");
			return "task result";
		},
		{ priority: 1, timeout: 5000 }
	);
	console.log("Task completed:", result);
} catch (error) {
	console.error("Task failed:", error.message);
}

// The returned Promise is also a task handle
const promise = queue.enqueue(() => "simple task");
console.log("Task ID:", promise.id);
promise.cancel(); // Cancel the task
```

### Mixing APIs

You can mix callback and promise styles in the same queue:

```javascript
// Callback-based
queue.enqueue(task1, callback, options);

// Promise-based
const result = await queue.enqueue(task2, options);
```

## 📚 API Reference

### Constructor

```javascript
const queue = new HoldMyTask(options?)
```

**Options:**

- `concurrency` (number, default: 1) - Maximum concurrent tasks
- `smartScheduling` (boolean, default: true) - Use dynamic timeout scheduling for better performance
- `tick` (number, default: 25) - Scheduler tick interval in milliseconds (used when smartScheduling is false)
- `autoStart` (boolean, default: true) - Whether to start processing immediately
- `defaultPriority` (number, default: 0) - Default task priority
- `maxQueue` (number, default: Infinity) - Maximum queued tasks
- `delays` (object, default: {}) - Priority-to-delay mapping for completion delays
- `coalescingWindowDuration` (number, default: 200) - Time window in milliseconds for grouping coalescing tasks
- `coalescingMaxDelay` (number, default: 1000) - Maximum delay in milliseconds before forcing coalescing group execution
- `coalescingResolveAllPromises` (boolean, default: true) - Whether all promises in a coalescing group resolve with the result
- `onError` (function) - Global error handler
- `now` (function) - Injectable clock for testing

### Methods

#### `enqueue(task, callback?, options?)`

Adds a task to the queue.

**Parameters:**

- `task` (function) - The task function that receives an `AbortSignal` and returns a value or Promise
- `callback` (function, optional) - Called with `(error, result)` when task completes. If omitted, returns a Promise.
- `options` (object) - Task options

**Task Options:**

- `priority` (number) - Task priority (higher = more important)
- `delay` (number) - Override completion delay for this task (use -1 to bypass delays)
- `bypassDelay` (boolean) - If true, skip any active delay period and start immediately
- `timeout` (number) - Timeout in milliseconds
- `signal` (AbortSignal) - External abort signal
- `timestamp` (number) - Absolute execution timestamp
- `start` (number) - Milliseconds from now when the task should be ready to run (convenience for timestamp calculation)
- `coalescingKey` (string) - Tasks with the same coalescing key can be merged for efficiency
- `mustRunBy` (number) - Absolute timestamp by which the task must execute (overrides coalescing delays)
- `metadata` (any) - Custom metadata

**Returns:** TaskHandle object with:

- `id` - Unique task identifier
- `cancel(reason?)` - Cancel the task
- `status()` - Get current status
- `startedAt` - When task started
- `finishedAt` - When task finished
- `result` - Task result (if completed)
- `error` - Task error (if failed)

When `callback` is omitted, returns a Promise that resolves with the task result or rejects with an error.

#### Control Methods

- `pause()` - Pause task execution
- `resume()` - Resume task execution
- `clear()` - Cancel all pending tasks
- `size()` - Get total queued tasks
- `inflight()` - Get currently running tasks
- `destroy()` - Destroy the queue and cancel all tasks

### Events

```javascript
queue.on("start", (task) => {
	/* task started */
});
queue.on("success", (task) => {
	/* task completed successfully */
});
queue.on("error", (task) => {
	/* task failed */
});
queue.on("cancel", (task, reason) => {
	/* task cancelled */
});
queue.on("drain", () => {
	/* all tasks completed */
});
```

## ⚙️ Concurrency & Delays Interaction

Understanding how concurrency and delays work together is crucial for optimal queue behavior:

### Concurrency Rules

```javascript
const queue = new HoldMyTask({
	concurrency: 3, // Up to 3 tasks can run simultaneously
	delays: { 1: 500, 2: 1000 }
});
```

**Key Behaviors:**

1. **Delays are Global**: When any task completes, its priority delay affects ALL subsequent task starts
2. **Concurrency Slots**: Multiple tasks can run simultaneously until delay blocks new starts
3. **Independent Completion**: Running tasks complete independently; delays only affect new starts

### Timing Examples

```javascript
// Timeline with concurrency: 2, delays: { 1: 1000 }

// 10:00:00 - Start: TaskA (pri 1), TaskB (pri 1) - both running
// 10:00:02 - TaskA completes → 1000ms delay starts, TaskB still running
// 10:00:03 - TaskC (pri 1) ready but blocked by delay
// 10:00:04 - TaskB completes → extends delay to 10:00:05 (1000ms from TaskB completion)
// 10:00:05 - Delay expires, TaskC and TaskD can start (fills 2 slots again)
```

**Best Practices:**

- Use **shorter delays** with **higher concurrency** for throughput with gentle rate limiting
- Use **longer delays** with **lower concurrency** for strict rate limiting and resource protection
- **Monitor `inflight()`** to understand how many tasks are actively running vs waiting

### ⚡ Technical Architecture

HoldMyTask uses a sophisticated dual-heap scheduling system for optimal performance:

**🔄 Dual-Heap System:**

- **Pending Heap**: Time-ordered queue for tasks waiting for their scheduled time (`readyAt`)
- **Ready Heap**: Priority-ordered queue for tasks ready to execute now

**📊 Scheduling Flow:**

```text
1. New tasks → Pending Heap (ordered by readyAt timestamp)
2. Scheduler tick → Move ready tasks: Pending → Ready Heap
3. Execution → Take highest priority from Ready Heap
4. Completion → Apply delays, emit events, schedule next tick
```

**⏰ Smart Timing:**

- **Adaptive scheduling**: Uses intervals for immediate tasks, timeouts for distant tasks
- **Precision timing**: Sub-millisecond accuracy with injectable clock for testing
- **Efficient scanning**: O(log n) heap operations for thousands of tasks

**🚀 Performance Characteristics:**

- **Enqueue**: O(log n) - Insert into priority heap
- **Dequeue**: O(log n) - Extract from priority heap
- **Scheduler tick**: O(k log n) where k = ready tasks
- **Memory**: O(n) - Minimal overhead per task

This architecture enables handling thousands of tasks with precise timing control while maintaining excellent performance.

[![CodeFactor](https://img.shields.io/codefactor/grade/github/CLDMV/holdmytask?style=for-the-badge&logo=codefactor&logoColor=white&labelColor=F44A6A)](https://www.codefactor.io/repository/github/cldmv/holdmytask) [![npms.io score](https://img.shields.io/npms-io/final-score/%40cldmv%2Fholdmytask?style=for-the-badge&logo=npms&logoColor=white&labelColor=0B5D57)](https://npms.io/search?q=%40cldmv%2Fholdmytask)

[![npm unpacked size](https://img.shields.io/npm/unpacked-size/%40cldmv%2Fholdmytask.svg?style=for-the-badge&logo=npm&logoColor=white&labelColor=CB3837)](https://www.npmjs.com/package/@cldmv/holdmytask) [![Repo size](https://img.shields.io/github/repo-size/CLDMV/holdmytask?style=for-the-badge&logo=github&logoColor=white&labelColor=181717)](https://github.com/CLDMV/holdmytask)

## 🎯 Advanced Features

### Priority System

Tasks execute in priority order (highest first):

**Callback API:**

```javascript
queue.enqueue(task1, callback, { priority: 1 });
queue.enqueue(task2, callback, { priority: 10 }); // Runs first
queue.enqueue(task3, callback, { priority: 5 });
```

**Promise API:**

```javascript
await queue.enqueue(task1, { priority: 1 });
await queue.enqueue(task2, { priority: 10 }); // Runs first
await queue.enqueue(task3, { priority: 5 });
```

### Smart Scheduling

By default, HoldMyTask uses intelligent dynamic scheduling that calculates optimal timeout intervals based on when tasks should become ready. This provides significant performance improvements over traditional polling.

**Benefits:**

- **31x performance improvement** in typical scenarios
- **Precise timing** - tasks execute exactly when ready
- **CPU efficient** - no constant polling overhead
- **Dynamic adaptation** - adjusts to task timing patterns

```javascript
// Smart scheduling enabled by default
const queue = new HoldMyTask();

// Traditional polling mode (for compatibility)
const legacyQueue = new HoldMyTask({
	smartScheduling: false,
	tick: 25 // polling interval in ms
});
```

**How it works:**

- Calculates the next task ready time
- Sets a precise timeout for that moment
- Includes healing mechanism to prevent scheduler stalls
- Falls back gracefully on complex timing scenarios

### Priority Delays - Advanced Timing Control

Priority delays create "cool-down" periods after task completion based on the completed task's priority. This helps prevent resource overwhelming, implement rate limiting, and control timing between operations.

#### How It Works

- When a task completes, the delay for its priority level is enforced
- **ALL subsequent tasks** (any priority) must wait for the delay period to expire
- Delays apply globally - they affect the entire queue, not just tasks of the same priority
- Tasks can override delays on a per-task basis or bypass delays entirely

```javascript
const queue = new HoldMyTask({
	concurrency: 1,
	delays: {
		1: 1000, // 1 second delay after priority 1 tasks complete
		2: 500, // 500ms delay after priority 2 tasks complete
		3: 0 // No delay after priority 3 tasks (explicit)
	}
});

// Task A (priority 1) completes at 10:00:05
// → Next task can't start until 10:00:06 (1000ms delay)

// Task B (priority 2) completes at 10:00:07
// → Next task can't start until 10:00:07.5 (500ms delay)

// Override delay for specific task
queue.enqueue(task, callback, { priority: 1, delay: 200 }); // Uses 200ms instead of 1000ms

// Set zero delay for specific task
queue.enqueue(task, callback, { priority: 1, delay: 0 }); // No delay after this task
```

### Delay Bypass - Emergency Task Injection

When urgent tasks need to execute immediately, bypassing active delay periods, use the `bypassDelay` option or `delay: -1` syntax. This is perfect for emergency situations, high-priority interrupts, or critical system tasks.

#### Bypass Behavior

```javascript
const queue = new HoldMyTask({
	concurrency: 1,
	delays: { 1: 1000 } // 1 second delay after priority 1 tasks
});

// Timeline example:
// 10:00:00 - Task A (priority 1) completes → 1000ms delay starts
// 10:00:00.1 - Normal task B enqueued → must wait until 10:01:00
// 10:00:00.2 - Urgent task C enqueued with bypass → can start now (bypasses delay)

queue.enqueue(normalTaskB, callback, { priority: 1 }); // Waits for delay

queue.enqueue(urgentTaskC, callback, {
	priority: 1,
	bypassDelay: true // Skips the 1000ms delay, can start now
});

// Alternative bypass syntax
queue.enqueue(emergencyTaskD, callback, {
	priority: 1,
	delay: -1 // Same as bypassDelay: true
});
```

#### Advanced Bypass Scenarios

```javascript
const queue = new HoldMyTask({
	concurrency: 2,
	delays: { 1: 800, 2: 400 }
});

// Multiple tasks with different bypass behavior
queue.enqueue(taskA, callback, { priority: 1 }); // Completes, starts 800ms delay
queue.enqueue(taskB, callback, { priority: 2 }); // Waits for 800ms delay
queue.enqueue(taskC, callback, { priority: 2, bypassDelay: true }); // Bypasses delay, can start now
queue.enqueue(taskD, callback, { priority: 1 }); // Waits for taskC's completion delay

// Execution order: taskA → taskC (bypass) → taskB → taskD
```

**Critical Notes:**

- ✅ **Bypass affects START timing only** - bypassed tasks still apply their own completion delays
- ✅ **Maintains priority ordering** - bypass doesn't override natural priority rules
- ✅ **Scans entire queue** - finds bypass tasks even when normal tasks are blocked
- ✅ **Concurrency aware** - works correctly with multiple concurrent execution slots
- ⚠️ **Use sparingly** - frequent bypassing defeats the purpose of delay-based rate limiting

## 🔄 Task Coalescing System

The coalescing system allows multiple similar tasks to be intelligently merged, reducing redundant operations while ensuring all promises resolve with accurate results. This is perfect for scenarios like UI updates, API calls, or device commands where only the final result matters.

### How Coalescing Works

When tasks with the same `coalescingKey` are enqueued within a time window, they get merged into groups:

1. **First task** creates a new coalescing group with a time window
2. **Subsequent tasks** with the same key join the existing group (if within the window)
3. **One representative task** executes for the entire group
4. **All promises** in the group resolve with the same result

⚠️ **Critical Timing Consideration**: Real-world tasks take time to execute (100ms-2000ms+). If your coalescing tasks need to see the final state from other operations, ensure proper timing with `start` delays or `timestamp` scheduling. Tasks that start too early may see intermediate states rather than final results.

### 🎯 Correct Coalescing Pattern: Fire-and-Forget with Embedded Updates

The most reliable pattern for coalescing with state consistency is the **"fire-and-forget with embedded updates"** approach:

**❌ WRONG - Parallel Enqueueing:**

```javascript
// DON'T DO THIS - creates race conditions
function volumeUp() {
	const volumePromise = queue.enqueue(changeVolume, { priority: 1 });
	const updatePromise = queue.enqueue(updateUI, { coalescingKey: "ui" }); // May see stale state
	return Promise.all([volumePromise, updatePromise]);
}
```

**✅ CORRECT - Embedded Update Pattern:**

```javascript
// DO THIS - guarantees state consistency
function volumeUp() {
	return queue.enqueue(
		async () => {
			// 1. Perform the main operation
			const result = await changeVolume();

			// 2. AFTER main operation completes, enqueue the update FROM WITHIN
			queue.enqueue(async () => updateUI(), { coalescingKey: "ui" }); // Always sees final state

			return result; // Consumer gets immediate response
		},
		{ priority: 1 }
	);
}
```

**Key Benefits:**

- ✅ **100% State Accuracy**: Updates only trigger after main operations complete
- ✅ **Fire-and-Forget**: Consumers get immediate responses, no waiting
- ✅ **Optimal Coalescing**: Multiple updates coalesce naturally when triggered close together
- ✅ **No Race Conditions**: Sequential execution guarantees consistent state

### Basic Coalescing Configuration

```javascript
const queue = new HoldMyTask({
	concurrency: 1,
	coalescingWindowDuration: 200, // 200ms window for grouping tasks
	coalescingMaxDelay: 1000, // Maximum 1000ms delay before forcing execution
	coalescingResolveAllPromises: true // All promises get the result (default: true)
});
```

### Simple Coalescing Example

```javascript
// Device volume control scenario
async function updateVolume(change) {
	return queue.enqueue(
		async () => {
			// Realistic device operations take time
			const currentVolume = await device.getVolume(); // ~50-200ms
			const newVolume = Math.max(0, Math.min(100, currentVolume + change));
			await device.setVolume(newVolume); // ~100-500ms
			return newVolume;
		},
		{
			coalescingKey: "volume.update", // Tasks with same key get grouped
			priority: 1,
			delay: 100 // 100ms delay after completion
		}
	);
}

// User rapidly presses volume up 5 times within coalescing window
const results = await Promise.all([
	updateVolume(1), // Creates new group
	updateVolume(1), // Joins existing group (if within 200ms window)
	updateVolume(1), // Joins existing group (if within 200ms window)
	updateVolume(1), // Joins existing group (if within 200ms window)
	updateVolume(1) // Joins existing group (if within 200ms window)
]);

// If all tasks coalesce: ONE device.setVolume() call with final state
// If timing spreads them: Multiple groups, each sees state at execution time
console.log(results); // Could be [55, 55, 55, 55, 55] or [51, 53, 55, 55, 55] depending on timing
```

### Advanced Coalescing with Fire-and-Forget Pattern

The correct pattern for coalescing with updates is to enqueue update tasks **from within** the main tasks after they complete. This ensures 100% accuracy and proper state consistency:

```javascript
const queue = new HoldMyTask({
	concurrency: 2, // Allow volume and update tasks to run concurrently
	coalescingWindowDuration: 200,
	coalescingMaxDelay: 1000
});

// Volume commands using fire-and-forget pattern
function volumeUp(amount = 1) {
	const commandId = Date.now();

	// Fire-and-forget: return promise but consumer doesn't await it
	return queue.enqueue(
		async () => {
			console.log(`Executing volume command ${commandId}`);
			// Realistic device operation takes time
			const result = await device.increaseVolume(amount); // 200-1000ms

			// AFTER volume completes, enqueue update task FROM WITHIN
			console.log(`Volume complete, triggering UI update`);
			queue.enqueue(
				async () => {
					console.log(`Updating UI for final volume`);
					// UI operation sees accurate final state
					const volume = await device.getVolume(); // ~50ms
					updateVolumeDisplay(volume); // ~10-100ms
					return volume;
				},
				{
					coalescingKey: "volume.ui.update", // UI updates get coalesced
					priority: 5, // Lower priority than volume commands
					delay: 100 // Brief delay after UI updates
				}
			);

			return result;
		},
		{
			priority: 1, // High priority for user actions
			delay: 100 // Brief delay after volume operations
		}
	);
}

// Consumer usage - fire and forget
volumeUp(1); // Optimistic: assume it will work, don't wait
volumeUp(1); // Multiple rapid calls
volumeUp(1); // Each triggers its own update after completing
volumeUp(1); // Updates get coalesced if close together
volumeUp(1); // Final state is always accurate

// Result: 5 volume commands execute sequentially
//         Update commands coalesce (e.g., 5 → 3 actual updates)
//         UI always shows accurate final state because updates only trigger after volume changes
//         Consumer gets immediate response, no waiting for completion
```

### Multi-Group Coalescing

The same `coalescingKey` can have multiple active groups based on timing windows:

```javascript
// API batch processing
async function processDataBatch(data) {
	return queue.enqueue(
		async () => {
			console.log(`Processing batch with ${data.length} items`);
			return await api.processBatch(data);
		},
		{
			coalescingKey: "api.batch.process",
			priority: 2,
			start: 100 // 100ms delay allows grouping
		}
	);
}

// Timeline:
// 0ms: processDataBatch(data1) → creates Group A (window: 0-200ms)
// 50ms: processDataBatch(data2) → joins Group A
// 250ms: processDataBatch(data3) → creates Group B (window: 250-450ms)
// 300ms: processDataBatch(data4) → joins Group B
// 500ms: processDataBatch(data5) → creates Group C (window: 500-700ms)

// Result: 3 separate API calls, each processing coalesced batches
```

### Coalescing with Explicit Timestamps

For precise scheduling, use `timestamp` instead of `start`:

```javascript
const queue = new HoldMyTask({
	coalescingWindowDuration: 300,
	coalescingMaxDelay: 2000
});

// Schedule all updates for the same exact time
const scheduleTime = Date.now() + 1000; // 1 second from now

const promises = [];
for (let i = 0; i < 10; i++) {
	promises.push(
		queue.enqueue(
			async () => {
				console.log("Executing coalesced batch update");
				return await performBatchUpdate();
			},
			{
				coalescingKey: "batch.update",
				timestamp: scheduleTime, // All scheduled for same time
				priority: 3
			}
		)
	);
}

// All 10 tasks coalesce into 1 execution at exactly scheduleTime
const results = await Promise.all(promises);
console.log(`10 tasks became 1 execution, all got result:`, results[0]);
```

### Must-Run-By Deadlines

Control maximum delay with `mustRunBy` to ensure tasks don't wait too long:

```javascript
const queue = new HoldMyTask({
	coalescingWindowDuration: 500, // Try to group for 500ms
	coalescingMaxDelay: 2000 // But never wait more than 2 seconds
});

// Critical system updates
async function criticalSystemUpdate(updateData) {
	return queue.enqueue(
		async () => {
			console.log("Executing critical system update");
			return await applySystemUpdate(updateData);
		},
		{
			coalescingKey: "system.critical.update",
			priority: 1,
			timestamp: Date.now() + 300, // Prefer 300ms delay
			mustRunBy: Date.now() + 1500 // Must run within 1.5 seconds
		}
	);
}

// Even if coalescing window suggests waiting longer,
// the task will execute by the mustRunBy deadline
```

### Promise Resolution Modes

Control how promises resolve within coalescing groups:

```javascript
const queue = new HoldMyTask({
	coalescingResolveAllPromises: true, // Default: all promises get the result
	coalescingWindowDuration: 200
});

// Mode 1: All promises resolve (default behavior)
const results1 = await Promise.all([
	queue.enqueue(task, { coalescingKey: "test" }),
	queue.enqueue(task, { coalescingKey: "test" }),
	queue.enqueue(task, { coalescingKey: "test" })
]);
// All three promises resolve with the same result

// Mode 2: Only representative promise resolves
const queue2 = new HoldMyTask({
	coalescingResolveAllPromises: false,
	coalescingWindowDuration: 200
});

const [result1, result2, result3] = await Promise.all([
	queue2.enqueue(task, { coalescingKey: "test" }), // Resolves with result
	queue2.enqueue(task, { coalescingKey: "test" }), // Resolves with undefined
	queue2.enqueue(task, { coalescingKey: "test" }) // Resolves with undefined
]);
// Only the first (representative) promise gets the actual result
```

### Real-World Coalescing Patterns

#### Device Control Pattern

```javascript
class VolumeController {
	constructor() {
		this.queue = new HoldMyTask({
			concurrency: 2, // Allow volume and update tasks concurrently
			coalescingWindowDuration: 200,
			coalescingMaxDelay: 1000
		});
	}

	volumeUp(amount = 1) {
		// Fire-and-forget pattern: consumer gets immediate response
		return this.queue.enqueue(
			async () => {
				// Realistic device operations take time
				const currentVolume = await this.device.getVolume(); // ~50-200ms
				const newVolume = Math.min(100, currentVolume + amount);
				await this.device.setVolume(newVolume); // ~100-500ms

				// AFTER volume change completes, enqueue UI update FROM WITHIN
				this.queue.enqueue(
					async () => {
						const volume = await this.device.getVolume(); // ~50ms
						this.ui.updateVolumeDisplay(volume); // ~10-100ms
						return volume;
					},
					{
						coalescingKey: "volume.ui.update", // Updates coalesce together
						priority: 3, // Lower priority than volume changes
						delay: 100 // Brief delay after UI updates
					}
				);

				return newVolume;
			},
			{
				priority: 1, // High priority for user actions
				delay: 50 // Brief delay between volume operations
			}
		);
	}
}
```

#### API Batch Processing Pattern

```javascript
class APIBatcher {
	constructor() {
		this.queue = new HoldMyTask({
			concurrency: 2,
			coalescingWindowDuration: 300,
			coalescingMaxDelay: 1500
		});
	}

	async submitData(data) {
		return this.queue.enqueue(
			async () => {
				// All data submissions in the time window get batched
				const batchData = this.collectBatchData(); // Implementation detail
				const result = await this.api.submitBatch(batchData);
				return result.find((item) => item.id === data.id);
			},
			{
				coalescingKey: `batch.${data.category}`, // Batch by category
				priority: 2,
				metadata: { data, category: data.category }
			}
		);
	}
}
```

### Coalescing Performance Benefits

Real-world performance improvements with the embedded update pattern:

```javascript
// Fire-and-forget pattern with embedded coalescing updates
const queue = new HoldMyTask({
	concurrency: 2,
	coalescingWindowDuration: 200,
	coalescingMaxDelay: 1000
});

// Volume control example - realistic embedded pattern
function processVolumeCommands() {
	// Consumer fires 100 rapid volume commands (fire-and-forget)
	const promises = [];
	for (let i = 0; i < 100; i++) {
		promises.push(
			queue.enqueue(
				async () => {
					// Main operation: change volume (200-500ms each)
					const result = await device.changeVolume(1);

					// Embedded update: triggered AFTER volume change (coalesces automatically)
					queue.enqueue(
						async () => updateVolumeDisplay(), // 50-100ms each
						{ coalescingKey: "volume.display" }
					);

					return result; // Immediate response to consumer
				},
				{ priority: 1 }
			)
		);
	}

	// Consumer gets immediate responses, doesn't wait for display updates
	return promises; // All resolve quickly with volume results
}

// Results with embedded coalescing:
// - 100 volume operations execute (necessary work)
// - ~5-15 display updates execute (95-85% coalescing efficiency)
// - 100% accuracy: displays always show final state
// - Fire-and-forget: consumers get immediate responses
// - Total time: ~25-30 seconds (vs 50+ seconds without coalescing)
```

### Timeouts

Tasks automatically timeout and either call the callback with an error or reject the promise:

**Callback API:**

```javascript
queue.enqueue(
	async (signal) => {
		// Long-running task
		await someAsyncOperation();
		return "result";
	},
	(error, result) => {
		if (error?.type === "timeout") {
			console.log("Task timed out!");
		}
	},
	{ timeout: 5000 } // 5 second timeout
);
```

**Promise API:**

```javascript
try {
	const result = await queue.enqueue(
		async (signal) => {
			// Long-running task
			await someAsyncOperation();
			return "result";
		},
		{ timeout: 5000 } // 5 second timeout
	);
	console.log("Task completed:", result);
} catch (error) {
	if (error.message.includes("timed out")) {
		console.log("Task timed out!");
	}
}
```

## 🛑 AbortController Support

The library uses `AbortController` for cooperative task cancellation. This allows tasks to be cancelled gracefully without forcing termination.

### How It Works

1. **Timeout Cancellation**: When a task exceeds its `timeout`, an `AbortController` is aborted
2. **External Cancellation**: You can pass your own `AbortSignal` to cancel tasks
3. **Cooperative**: Tasks must check the signal and respond to cancellation

### Implementing AbortController Support in Tasks

Your task functions receive an `AbortSignal` as the first parameter. **Always check this signal** to support cancellation:

**Callback API:**

```javascript
// ❌ Bad - doesn't support cancellation
queue.enqueue(async () => {
	await fetch("https://api.example.com/data"); // Can't be cancelled
	return "result";
}, callback);

// ✅ Good - supports cancellation
queue.enqueue(async (signal) => {
	const response = await fetch("https://api.example.com/data", {
		signal // Pass the signal to fetch
	});
	return response.json();
}, callback);
```

**Promise API:**

```javascript
// ❌ Bad - doesn't support cancellation
const result = await queue.enqueue(async () => {
	await fetch("https://api.example.com/data"); // Can't be cancelled
	return "result";
});

// ✅ Good - supports cancellation
const result = await queue.enqueue(async (signal) => {
	const response = await fetch("https://api.example.com/data", {
		signal // Pass the signal to fetch
	});
	return response.json();
});
```

### Checking the Signal Manually

For custom cancellation logic:

**Callback API:**

```javascript
queue.enqueue(
	async (signal) => {
		// Check signal at operation points
		if (signal.aborted) {
			throw new Error("Task was cancelled");
		}

		const result1 = await someOperation();

		if (signal.aborted) {
			throw new Error("Task was cancelled");
		}

		const result2 = await anotherOperation();

		return { result1, result2 };
	},
	callback,
	{ timeout: 10000 }
);
```

**Promise API:**

```javascript
try {
	const result = await queue.enqueue(
		async (signal) => {
			// Check signal at operation points
			if (signal.aborted) {
				throw new Error("Task was cancelled");
			}

			const result1 = await someOperation();

			if (signal.aborted) {
				throw new Error("Task was cancelled");
			}

			const result2 = await anotherOperation();

			return { result1, result2 };
		},
		{ timeout: 10000 }
	);
	console.log("Task completed:", result);
} catch (error) {
	console.log("Task failed:", error.message);
}
```

### External Cancellation

Cancel tasks using your own AbortController:

**Callback API:**

```javascript
const controller = new AbortController();

queue.enqueue(task, callback, {
	signal: controller.signal,
	timeout: 5000
});

// Cancel the task externally
controller.abort();
```

**Promise API:**

```javascript
const controller = new AbortController();

const promise = queue.enqueue(task, {
	signal: controller.signal,
	timeout: 5000
});

// Cancel the task externally
controller.abort();

try {
	const result = await promise;
	console.log("Task completed:", result);
} catch (error) {
	console.log("Task cancelled:", error.message);
}
```

### Best Practices

1. **Always accept the signal parameter** in your task functions
2. **Pass the signal to async operations** that support it (fetch, timers, etc.)
3. **Check `signal.aborted`** at logical breakpoints in long-running tasks
4. **Throw errors** when detecting cancellation
5. **Use descriptive error messages** for cancelled tasks

### Limitations

- **Single-threaded**: Cannot forcibly terminate synchronous JavaScript code
- **Cooperative**: Tasks must actively check and respond to the abort signal
- **Async operations**: Only cancellable if the underlying operation supports AbortSignal

## 📝 Examples

### Basic Usage

```javascript
import { HoldMyTask } from "@cldmv/holdmytask";

const queue = new HoldMyTask({ concurrency: 3 });

function processUser(userId) {
	return queue.enqueue(
		async (signal) => {
			const user = await fetchUser(userId, { signal });
			await sendEmail(user.email, "Welcome!", { signal });
			return user;
		},
		(error, user) => {
			if (error) {
				console.error(`Failed to process user ${userId}:`, error);
			} else {
				console.log(`Processed user: ${user.name}`);
			}
		},
		{ priority: 1, timeout: 30000 }
	);
}
```

### Priority Queue with Delays

```javascript
const queue = new HoldMyTask({
	concurrency: 1,
	delays: {
		1: 1000, // 1 second between high-priority tasks
		2: 100, // 100ms between medium-priority tasks
		3: 0 // No delay for low-priority tasks
	}
});

// High priority - runs immediately, 1s delay after
queue.enqueue(highPriorityTask, callback, { priority: 1 });

// Medium priority - waits for high priority delay, then 100ms between these
queue.enqueue(mediumTask1, callback, { priority: 2 });
queue.enqueue(mediumTask2, callback, { priority: 2 });
```

### Batch Processing with Timeouts

```javascript
const queue = new HoldMyTask({
	concurrency: 5,
	delays: { 1: 50 } // Small delay between batches
});

async function processBatch(items) {
	const results = [];

	for (const item of items) {
		queue.enqueue(
			async (signal) => {
				return await processItem(item, { signal });
			},
			(error, result) => {
				if (error) {
					console.error(`Item ${item.id} failed:`, error);
				} else {
					results.push(result);
				}
			},
			{ priority: 1, timeout: 10000 }
		);
	}

	// Wait for all to complete
	await new Promise((resolve) => queue.on("drain", resolve));
	return results;
}
```

### Emergency Task Management with Delay Bypass

Real-world scenario: API rate limiting with emergency override capability.

```javascript
const apiQueue = new HoldMyTask({
	concurrency: 2,
	delays: {
		1: 2000, // 2 second delay between API calls (rate limiting)
		2: 5000, // 5 second delay for heavy operations
		9: 0 // No delay for monitoring tasks
	}
});

// Regular API operations
apiQueue.enqueue(fetchUserData, handleResponse, { priority: 1 });
apiQueue.enqueue(syncDatabase, handleResponse, { priority: 2 });

// System monitoring (high priority, no delays)
apiQueue.enqueue(healthCheck, handleResponse, { priority: 9 });

// EMERGENCY: Critical security alert needs immediate processing
// This bypasses any active delays and runs immediately
apiQueue.enqueue(processSecurityAlert, handleEmergency, {
	priority: 1,
	bypassDelay: true, // Skip delay, run NOW
	timeout: 10000, // 10 second timeout for critical task
	metadata: { urgency: "critical", alertId: "SEC-001" }
});

// Alternative syntax for bypass
apiQueue.enqueue(emergencyShutdown, handleEmergency, {
	priority: 1,
	delay: -1, // Same as bypassDelay: true
	metadata: { action: "shutdown" }
});

function handleEmergency(error, result) {
	if (error) {
		console.error("Emergency task failed:", error);
		// Implement fallback procedures
	} else {
		console.log("Emergency handled:", result);
		// Log to incident management system
	}
}

// Monitor queue status
setInterval(() => {
	console.log(`Queue: ${apiQueue.size()} total, ${apiQueue.inflight()} running`);
}, 1000);
```

## 🧪 Testing & Development

```bash
# Run tests
npm test

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode
npm run test:run

# Lint code
npm run lint

# Build for publishing
npm run build
```

### Testing with Injectable Clock

```javascript
const queue = new HoldMyTask({
	now: () => mockTime // Control time in tests
});
```

## 📄 License

[![GitHub license](https://img.shields.io/github/license/CLDMV/holdmytask.svg?style=for-the-badge&logo=github&logoColor=white&labelColor=181717)](https://github.com/CLDMV/holdmytask/blob/HEAD/LICENSE) [![npm license](https://img.shields.io/npm/l/%40cldmv%2Fholdmytask.svg?style=for-the-badge&logo=npm&logoColor=white&labelColor=CB3837)](https://www.npmjs.com/package/@cldmv/holdmytask)

Apache License 2.0 - see [LICENSE](LICENSE) file for details.

## 🤝 Contributing

Contributions welcome! Please ensure:

- All tests pass
- Code follows existing style
- New features include tests
- Documentation is updated

---

**Made with ❤️ for robust task management**
