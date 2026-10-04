# @cldmv/holdmytask

**@cldmv/holdmytask** is a tiny, dependency-free task queue for Node.js that executes tasks with priority ordering, concurrency control, and completion delays. It is built for asynchronous workflows with real timing requirements: rate-limited APIs, device control, UI refreshes, and anything else where _when_ a task runs matters as much as _whether_ it runs.

Every task can carry a priority, a scheduled start time, a timeout, an `AbortSignal`, and metadata. Per-priority concurrency limits and pre/post delays shape throughput, urgent work can bypass an active delay, and tasks that share a coalescing key collapse into a single execution whose result resolves every caller. Smart scheduling sets precise timers for the next ready task instead of polling.

Use it with callbacks or promises, from ESM or CommonJS, with full TypeScript definitions included.

> _A tiny task queue that waits until your task is ready._

[![npm version]][npm_version_url] [![npm downloads]][npm_downloads_url] [![GitHub downloads]][github_downloads_url] [![Last commit]][last_commit_url] [![npm last update]][npm_last_update_url] [![coverage]][coverage_url]

[![Contributors]][contributors_url] [![Sponsor shinrai]][sponsor_url]

---

## ✨ What's New

### Latest: v2.0.5 (October 2026)

- **Task-level `postDelay` / `startDelay` work as documented** — `enqueue()` now honors the documented `postDelay` and `startDelay` task options, and a task-level completion delay is enforced even when the task's priority has no `postDelay` of its own. The old `delay` / `start` names still work as deprecated aliases and emit one `deprecation` warning per queue instance.
- **Safer failure reporting** — A failing callback-style task no longer crashes the process when no `error` listener is attached; the failure always reaches the callback, and the `error` event is emitted only when someone listens. Non-integer `priorities` keys now produce an `invalid-priority` warning instead of being dropped silently. The README was rewritten to the CLDMV layout with every example on the current API.
- [View full v2.0.5 Changelog](https://github.com/CLDMV/holdmytask/blob/master/docs/changelog/v2/v2.0.5.md)

### Recent Releases

- **v2.0.4** (October 2026) — Clearer `require()` error on Node.js without `require(esm)`; `brace-expansion` security patch in development tooling ([Changelog](https://github.com/CLDMV/holdmytask/blob/master/docs/changelog/v2/v2.0.4.md))
- **v2.0.3** (October 2026) — Development toolchain moves to vitest 5; bundle-size and v4 workflow updates; verbatim Apache-2.0 license text ([Changelog](https://github.com/CLDMV/holdmytask/blob/master/docs/changelog/v2/v2.0.3.md))
- **v2.0.2** (September 2026) — Development dependency update (`@humanfs/node`); no other changes ([Changelog](https://github.com/CLDMV/holdmytask/blob/master/docs/changelog/v2/v2.0.2.md))
- **v2.0.1** (September 2026) — Fix: a task's timeout timer is now cleared when the task fails or is cancelled ([Changelog](https://github.com/CLDMV/holdmytask/blob/master/docs/changelog/v2/v2.0.1.md))

📚 **For complete version history and detailed release notes, see the [docs/changelog/](https://github.com/CLDMV/holdmytask/tree/master/docs/changelog/) folder.**

---

## 🚀 Key Features

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

---

## 📦 Installation

### Requirements

- **Node.js v18.12.0 or higher** for ESM (`import`), as declared in the package's `engines` field
- **CommonJS `require()`** needs Node.js `^20.19.0` or `>=22.12.0`. The CommonJS entry is a thin wrapper that loads the ESM build through Node's synchronous `require(esm)`. On older Node.js versions `require("@cldmv/holdmytask")` throws an `ERR_REQUIRE_ESM` error that names the supported versions; load the package with `import()` instead.

### Install

```bash
npm install @cldmv/holdmytask
```

---

## 🚀 Quick Start

```javascript
import { HoldMyTask } from "@cldmv/holdmytask";

const queue = new HoldMyTask({
	concurrency: 2,
	priorities: {
		1: { postDelay: 100 }, // 100ms delay after priority 1 tasks
		2: { postDelay: 200 } // 200ms delay after priority 2 tasks
	},
	coalescing: {
		defaults: {
			windowDuration: 200, // Group similar tasks within 200ms
			maxDelay: 1000 // Force execution after 1000ms max
		}
	}
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

CommonJS works the same way: `const { HoldMyTask } = require("@cldmv/holdmytask")` (see [Requirements](#requirements) for the Node.js versions that support `require()`).

---

## 📥 Import Options

The library provides flexible import options for different use cases:

### Production (Default)

```javascript
// Named import
import { HoldMyTask } from "@cldmv/holdmytask";

// Default import
import HoldMyTask from "@cldmv/holdmytask";

// Import everything
import * as HoldMyTaskLib from "@cldmv/holdmytask";
// Uses optimized distribution files

// CommonJS (Node.js ^20.19.0 or >=22.12.0)
const HoldMyTask = require("@cldmv/holdmytask"); // the class itself
const { HoldMyTask: Named } = require("@cldmv/holdmytask"); // or by name
```

### Common Queue System Aliases

For familiarity with other queue systems, several aliases are available:

```javascript
import {
	HoldMyTask, // Original class name
	queue, // Lower-case alias for common conventions
	Queue, // Standard queue naming
	TaskManager, // Task management systems
	TaskQueue, // Task-specific queuing
	QueueManager, // Queue management systems
	TaskProcessor // Task processing systems
} from "@cldmv/holdmytask";

// All aliases are functionally identical
const myQueue = new queue({ concurrency: 5 });
const stdQueue = new Queue({ concurrency: 5 });
const manager = new TaskManager({ priorities: { 1: { postDelay: 100 } } });
```

The ESM entry also exports async factory helpers that resolve to a new instance: `createHoldMyTask(options)`, `createQueue(options)`, `createTaskManager(options)`, and `createTaskProcessor(options)`.

### Development Source Access

```javascript
import { HoldMyTask } from "@cldmv/holdmytask/main";
// Resolves to dist files by default; resolves to src/ when Node.js runs with the holdmytask-dev condition
```

To run against the unbuilt source (from a checkout of this repository), start Node.js with the `holdmytask-dev` export condition:

```bash
node --conditions=holdmytask-dev your-script.mjs
```

**Note:** In a checkout of this repository, the root import runs a best-effort development environment check (`devcheck.mjs`) that exits with setup instructions when `src/` is present but the `holdmytask-dev` condition is not set. The check is skipped when the package is installed as a dependency and in CI.

---

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

---

## 🏗️ Async Constructor Pattern

HoldMyTask works excellently with async constructor patterns for classes that need initialization:

```javascript
class AsyncService {
	constructor(options = {}) {
		this.queue = new HoldMyTask({
			concurrency: options.concurrency || 2,
			maxQueue: -1 // Unlimited queue for initialization tasks
		});
		this.ready = this.initialize();
	}

	async initialize() {
		// Initialization tasks that need to complete before the service is ready
		await this.queue.enqueue(async () => {
			this.config = await this.loadConfiguration();
		});

		await this.queue.enqueue(async () => {
			this.database = await this.connectToDatabase();
		});

		await this.queue.enqueue(async () => {
			this.cache = await this.initializeCache();
		});

		return this;
	}

	async processData(data) {
		// Ensure service is initialized before processing
		await this.ready;

		return this.queue.enqueue(async () => {
			// Process data using initialized resources
			return this.database.save(await this.transformData(data));
		});
	}

	// Clean shutdown
	async shutdown() {
		await this.queue.drain(); // Wait for all tasks to complete
		await this.database.close();
	}
}

// Usage
const service = new AsyncService({ concurrency: 5 });
await service.ready; // Wait for initialization
const result = await service.processData(someData);
```

This pattern is particularly useful for:

- **Database connections**: Initialize connections before accepting work
- **Configuration loading**: Load settings before processing tasks
- **Resource acquisition**: Set up required resources in a controlled manner
- **Dependency injection**: Initialize dependencies in the correct order

---

## 📚 API Reference

### Constructor

```javascript
const queue = new HoldMyTask(options?)
```

### Async Initialization Pattern

With `sync: false`, the constructor returns a Promise that resolves to the instance once initialization has run on the next turn of the event loop. The returned value is a plain Promise, so attach listeners to the resolved instance:

```javascript
// Create instance with async initialization
const queue = await new HoldMyTask({
	concurrency: 5,
	maxQueue: 100,
	sync: false // Enable async initialization
});

// Initialization warnings are emitted asynchronously, so listeners attached here still receive them
queue.on("error", (err) => console.error("Queue error:", err));
queue.on("warning", (warning) => console.warn("Warning:", warning.message));
```

Initialization warnings (such as [deprecation warnings](#warning-events)) are emitted on `setImmediate` in both modes, so a listener attached right after a synchronous `new HoldMyTask(...)` receives them as well.

**Options:**

- `concurrency` (number, default: 1) - Maximum concurrent tasks
- `smartScheduling` (boolean, default: true) - Use dynamic timeout scheduling for better performance
- `tick` (number, default: 25) - Scheduler tick interval in milliseconds (used when smartScheduling is false)
- `autoStart` (boolean, default: true) - Whether to start processing immediately
- `defaultPriority` (number, default: 0) - Default task priority
- `maxQueue` (number, default: Infinity) - Maximum queued tasks. Use `-1` for unlimited queue capacity (equivalent to `Infinity`)
- `priorities` (object, default: {}) - Priority-specific configuration: `{ [priority]: { concurrency, postDelay, startDelay } }`. Keys must be integers; any other key emits a `warning` event with `type: "invalid-priority"` (and is ignored when it isn't numeric at all)
  - `concurrency` (number) - Maximum concurrent tasks for this priority (defaults to global concurrency limit)
  - `postDelay` (number) - Delay after a task of this priority completes before the next task can start (the delay applies queue-wide; see [Priority Delays](#priority-delays---advanced-timing-control))
  - `startDelay` (number) - Delay before task execution (pre-execution delay)
- `coalescing` (object) - Enhanced coalescing configuration
  - `defaults` (object) - Default settings for all coalescing keys
    - `windowDuration` (number, default: 200) - Window duration in milliseconds
    - `maxDelay` (number, default: 1000) - Maximum delay before forcing execution
    - `postDelay` (number) - Default completion delay for coalescing tasks
    - `startDelay` (number) - Default start delay for coalescing tasks
    - `resolveAllPromises` (boolean, default: true) - Whether every task in a coalescing group resolves with the result; when `false`, only the newest task resolves and the others are rejected with `Task was coalesced with a newer task`
    - `multipleCallbacks` (boolean, default: false) - Whether to call multiple callbacks
  - `keys` (object) - Per-key configuration overrides: `{ [key]: { windowDuration, maxDelay, postDelay, startDelay, ... } }`
- `healingInterval` (number, default: 5000) - Self-healing check interval in milliseconds (smart scheduling only)
- `sync` (boolean, default: true) - Set to `false` for [async initialization](#async-initialization-pattern); the constructor then returns a Promise that resolves to the instance
- `now` (function) - Injectable clock for testing

Deprecated option names are still accepted and converted for you, but each one emits a `warning` event; see [Deprecated Options](#deprecated-options) for the mapping.

### Methods

#### `enqueue(task, callback?, options?)`

Adds a task to the queue.

**Parameters:**

- `task` (function) - The task function that receives an `AbortSignal` and returns a value or Promise
- `callback` (function, optional) - Called with `(error, result)` when task completes. If omitted, returns a Promise.
- `options` (object) - Task options

**Task Options:**

- `priority` (number) - Task priority (higher = more important)
- `postDelay` (number) - Override completion delay for this task (use -1 to bypass delays). `delay` is a deprecated alias that emits a `warning` event once per queue
- `bypassDelay` (boolean) - If true, skip any active delay period and start immediately
- `timeout` (number) - Timeout in milliseconds
- `signal` (AbortSignal) - External abort signal
- `timestamp` (number) - Absolute execution timestamp
- `startDelay` (number) - Milliseconds from now when the task should be ready to run (convenience for timestamp calculation). `start` is a deprecated alias that emits a `warning` event once per queue
- `coalescingKey` (string) - Tasks with the same coalescing key can be merged for efficiency
- `mustRunBy` (number) - Absolute timestamp by which the task must execute (overrides coalescing delays)
- `metadata` (any) - Custom metadata attached to the task. Individual metadata is always directly accessible via the returned task handle

**Returns:** TaskHandle object with:

- `id` - Unique task identifier
- `cancel(reason?)` - Cancel the task
- `status()` - Get current status
- `startedAt` - When task started
- `finishedAt` - When task finished
- `result` - Task result (if completed)
- `error` - Task error (if failed)
- `metadata` - Custom metadata attached to this task
- `coalescingInfo` - Coalescing group information (null for non-coalesced tasks)

When `callback` is omitted, returns a Promise that resolves with the task result or rejects with an error.

#### Accessing Task Metadata

Every task handle provides direct access to its metadata and coalescing information:

```javascript
// Create a task with metadata
const task = queue.enqueue(
	async () => {
		return "task completed";
	},
	{
		metadata: { userId: 123, action: "save", document: "report.pdf" },
		coalescingKey: "user-actions"
	}
);

// Direct access to metadata - works for both regular and coalesced tasks
console.log(task.metadata);
// Output: { userId: 123, action: 'save', document: 'report.pdf' }

// For coalesced tasks, get information about the coalescing group
if (task.coalescingInfo) {
	console.log("Coalescing key:", task.coalescingInfo.coalescingKey);
	console.log("Group size:", task.coalescingInfo.taskCount);
	console.log("All task metadata in group:", task.coalescingInfo.allTaskMetadata);
}

// Works the same way with Promise API
const result = await task;
console.log("Still accessible after completion:", task.metadata);
```

**Key Points:**

- `task.metadata` - Returns the original metadata you attached to the task
- `task.coalescingInfo` - Returns coalescing group details (null for non-coalesced tasks)
- Available on both callback-style task handles and Promise-style task handles
- Accessible before, during, and after task execution
- For coalesced tasks, each task retains its individual metadata

#### Method Aliases

For compatibility with common queue system naming conventions, the following aliases are available:

- `schedule(task, callback?, options?)` - Alias for `enqueue()`
- `add(task, callback?, options?)` - Alias for `enqueue()`

```javascript
// These are all equivalent:
queue.enqueue(task, options);
queue.schedule(task, options);
queue.add(task, options);
```

#### Custom Task IDs

Tasks can be assigned custom IDs for easier tracking and management:

```javascript
// Assign custom ID
const task = queue.enqueue(myTask, { id: "user-action-123" });
console.log(task.id); // 'user-action-123'

// Task management by ID
queue.has("user-action-123"); // true
const task = queue.get("user-action-123"); // task object or null
queue.cancel("user-action-123", "User cancelled"); // returns true if cancelled

// Uniqueness is enforced
queue.enqueue(task1, { id: "duplicate" });
queue.enqueue(task2, { id: "duplicate" }); // throws: Task ID "duplicate" already exists
```

**ID Management Methods:**

- `has(id)` - Check if a task with the given ID exists
- `get(id)` - Get task object by ID (returns null if not found)
- `cancel(id, reason?)` - Cancel task by ID (returns boolean success)

**Method Aliases (for backward compatibility):**

- `hasTask(id)` - Alias for `has(id)`
- `getTask(id)` - Alias for `get(id)`
- `cancelTask(id, reason?)` - Alias for `cancel(id, reason?)`

#### Control Methods

- `pause()` - Pause task execution
- `resume()` - Resume task execution
- `clear()` - Cancel all pending tasks
- `size()` - Get total queued tasks
- `length()` - Alias for `size()` - get total queued tasks
- `inflight()` - Get currently running tasks
- `destroy()` - Destroy the queue and cancel all tasks
- `shutdown()` - Alias for `destroy()` - convenient for common queue system naming
- `now()` - Get current timestamp (useful for testing with custom clocks)

#### Configuration Methods

- `configurePriority(priority, config)` - Configure or update priority-specific settings
  - `priority` (string|number) - Priority level to configure
  - `config` (object) - Configuration: `{ postDelay?, startDelay? }`
- `configureCoalescingKey(key, config)` - Configure or update coalescing key settings
  - `key` (string) - Coalescing key to configure
  - `config` (object) - Configuration: `{ windowDuration?, maxDelay?, postDelay?, startDelay?, multipleCallbacks?, resolveAllPromises? }`
- `getPriorityConfig(priority, taskOptions?)` - Get effective configuration for a specific priority
- `getPriorityConfigurations()` - Get all configured priorities and their settings
- `getCoalescingConfig(coalescingKey, taskOptions?)` - Get effective configuration for a specific coalescing key
- `getCoalescingConfigurations()` - Get all configured coalescing keys and their settings

#### Coalescing Group Inspection Methods

- `getCoalescingGroup(coalescingKey, groupId?)` - Get detailed information about coalescing groups
  - `coalescingKey` (string) - The coalescing key to query
  - `groupId` (string, optional) - Specific group ID, or omit to get all groups for the key
  - Returns group info with task details and metadata
- `getCoalescingGroupMetadata(coalescingKey, groupId?)` - Get metadata from all tasks in coalescing groups
  - Returns array of `{ taskId, groupId, metadata }` objects
- `getCoalescingGroupsSummary()` - Get summary of all active coalescing groups
  - Returns object with `{ [coalescingKey]: { groupCount, totalTasks } }`
- `findCoalescingGroupByTaskId(taskId)` - Find which coalescing group contains a specific task
  - Returns group info including the task's metadata and other group members

**Note:** For most use cases, the direct `task.metadata` and `task.coalescingInfo` properties provide easier access to task information. The coalescing group inspection methods are useful for bulk operations, monitoring, debugging, or when you need to query groups by coalescing key without having individual task references.

```javascript
// Example: Direct access to task metadata and coalescing info
const task1 = queue.enqueue(async () => "result", {
	coalescingKey: "user-action",
	metadata: { userId: 123, action: "save" }
});

const task2 = queue.enqueue(async () => "result", {
	coalescingKey: "user-action",
	metadata: { userId: 456, action: "delete" }
});

// Direct access - no additional API calls needed!
console.log("Task 1 metadata:", task1.metadata); // { userId: 123, action: 'save' }
console.log("Task 2 metadata:", task2.metadata); // { userId: 456, action: 'delete' }

// Access coalescing information directly from the task
console.log("Coalescing info:", task1.coalescingInfo);
// {
//   coalescingKey: 'user-action',
//   groupId: '1',
//   representativeId: '3',
//   taskCount: 2,
//   allTaskMetadata: [
//     { id: '1', metadata: { userId: 123, action: 'save' } },
//     { id: '2', metadata: { userId: 456, action: 'delete' } }
//   ]
// }

// Advanced: Use inspection methods for bulk operations
const metadata = queue.getCoalescingGroupMetadata("user-action");
const groupInfo = queue.getCoalescingGroup("user-action");
const taskGroup = queue.findCoalescingGroupByTaskId(task1.id);
```

### Debug and Inspection Methods

For debugging queue behavior, troubleshooting scheduler issues, or monitoring queue state in production, HoldMyTask provides comprehensive inspection methods:

#### Quick Debug Output

```javascript
// Log comprehensive queue state to console
queue.debugLog(); // Basic summary
queue.debugLog(true); // Detailed task information

// Example output:
// === HoldMyTask Debug Information ===
// Timestamp: 2025-11-14T17:45:32.123Z
// Status: ACTIVE
// Smart Scheduling: ON
// Concurrency: 2/5
//
// --- Queue State ---
// Total Tasks: 7
//   Pending: 3
//   Ready: 2
//   Running: 2
//
// --- Timer State ---
// Interval: None
// Timeout: Active (15)
// Next Run: 1250ms
```

#### Detailed Inspection

```javascript
// Get comprehensive queue state
const state = queue.inspect();
console.log("Total tasks:", state.totals.totalTasks);
console.log("Running tasks:", state.queues.running.tasks);
console.log("Next scheduled run:", state.timers.nextRunIn, "ms");

// Inspect just the tasks
const tasks = queue.inspectTasks();
console.log("Tasks by priority:", tasks.byPriority);
console.log("Tasks by coalescing key:", tasks.byCoalescingKey);

// Inspect scheduler state
const scheduler = queue.inspectScheduler();
console.log("Can run task now:", scheduler.nextTask?.canRunNow);
console.log("Available slots:", scheduler.availableSlots);
console.log("Active delays:", scheduler.delays.count);

// Inspect timers specifically
const timers = queue.inspectTimers();
console.log("Scheduler interval active:", timers.schedulerInterval.active);
console.log("Next run in:", timers.nextRunIn, "ms");
```

#### Inspection Methods

- `inspect()` - Get comprehensive queue state including tasks, timers, scheduler, and coalescing information
- `inspectTasks()` - Get detailed task information grouped by status, priority, and coalescing key
- `inspectScheduler()` - Get scheduler state, timing information, and next task details
- `inspectTimers()` - Get timer state and scheduling information
- `debugLog(detailed?)` - Log formatted debug information to console

**Use Cases:**

- **Development**: Debug why tasks aren't running or understand queue behavior
- **Production Monitoring**: Track queue health and performance metrics
- **Troubleshooting**: Identify scheduler issues, timer problems, or concurrency bottlenecks
- **Testing**: Verify queue state in automated tests

```javascript
// Example: Debug scheduler restart issue
const queue = new HoldMyTask({ concurrency: 2 });

// Add some tasks
queue.enqueue(async () => "task1");
queue.enqueue(async () => "task2", { priority: 2, startDelay: 5000 });

// Check initial state
console.log("Initial state:");
queue.debugLog();

// Wait for drain
queue.on("drain", () => {
	console.log("After drain:");
	queue.debugLog();

	// Add new task
	queue.enqueue(async () => "task3");

	console.log("After adding new task:");
	queue.debugLog();
});
```

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
queue.on("warning", (warning) => {
	/* deprecation or configuration warning */
});
```

When a callback-style task fails, times out, or is aborted, the task's callback receives the failure. The queue also emits an `error` event with the task (its `error` and `status` properties describe the failure), but only when an `error` listener is attached, so a listener is optional. Promise-style tasks report task failures only through the rejected promise.

The callback's first argument is an error payload rather than the raw error: `{ type: "timeout", message }`, `{ type: "canceled", message: "Task was aborted" }`, or `{ type: "error", error }`.

### Warning Events

HoldMyTask reports configuration problems through `warning` events instead of throwing. The events are emitted asynchronously (on `setImmediate`), so a listener attached right after the constructor returns still receives them. There are two types.

**Deprecations** (`type: "deprecation"`): when deprecated options are used, HoldMyTask converts them to the current names and emits one warning per deprecated option:

- `type` - `"deprecation"`
- `message` - a human-readable description
- `deprecated` - the deprecated option or property name
- `replacement` - the name to use instead

**Invalid priority keys** (`type: "invalid-priority"`): `priorities` (and the deprecated `delays`) must be keyed by integers. A key that isn't one is reported instead of being dropped silently: a key that isn't numeric at all (`"high"`) is ignored, and a key with a fractional part (`"2.5"`) is applied to the truncated priority (`2`), as before:

- `type` - `"invalid-priority"`
- `message` - a human-readable description
- `option` - the option the key came from (`"priorities"` or `"delays"`)
- `key` - the key as written
- `priority` - the priority it was applied to, or `null` when it was ignored

```javascript
const queue = new HoldMyTask({
	delays: { 1: 100 }, // Deprecated: use priorities
	coalescingWindowDuration: 200 // Deprecated: use coalescing.defaults.windowDuration
});

queue.on("warning", (warning) => {
	if (warning.type === "deprecation") {
		console.warn(`${warning.message} (${warning.deprecated} -> ${warning.replacement})`);
	}
});

// Output:
// Option 'coalescingWindowDuration' is deprecated. Use 'coalescing.defaults.windowDuration' instead. (coalescingWindowDuration -> coalescing.defaults.windowDuration)
// Option 'delays' is deprecated. Use 'priorities' instead with { [priority]: { postDelay: value, startDelay: 0 } } format. (delays -> priorities)
```

### Deprecated Options

These names still work, but each emits a deprecation warning. Use the current names in new code:

| Deprecated                                                                                                                           | Use instead                                     |
| ------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------- |
| `delays: { [priority]: ms }`                                                                                                         | `priorities: { [priority]: { postDelay: ms } }` |
| `delay` in a `priorities` entry, `coalescing.defaults`, `coalescing.keys` entry, `configurePriority()` or `configureCoalescingKey()` | `postDelay`                                     |
| `start` in the same places                                                                                                           | `startDelay`                                    |
| `delay` as a task option passed to `enqueue()`                                                                                       | `postDelay`                                     |
| `start` as a task option passed to `enqueue()`                                                                                       | `startDelay`                                    |
| `coalescingWindowDuration` (constructor)                                                                                             | `coalescing.defaults.windowDuration`            |
| `coalescingMaxDelay` (constructor)                                                                                                   | `coalescing.defaults.maxDelay`                  |
| `coalescingMultipleCallbacks` (constructor)                                                                                          | `coalescing.defaults.multipleCallbacks`         |
| `coalescingResolveAllPromises` (constructor)                                                                                         | `coalescing.defaults.resolveAllPromises`        |

Each task-level alias (`delay`, `start`) warns once per queue instance, not once per task. If both a deprecated alias and its replacement are given, the replacement wins. The per-task `coalescingWindowDuration` / `coalescingMaxDelay` / `coalescingMultipleCallbacks` / `coalescingResolveAllPromises` overrides are not deprecated and remain the current names for task options.

---

## ⚙️ Concurrency & Delays Interaction

Understanding how concurrency and delays work together is crucial for optimal queue behavior:

### Concurrency Rules

```javascript
const queue = new HoldMyTask({
	concurrency: 3, // Up to 3 tasks can run simultaneously
	priorities: { 1: { postDelay: 500 }, 2: { postDelay: 1000 } }
});
```

**Key Behaviors:**

1. **Delays are Global**: When any task completes, its priority delay affects ALL subsequent task starts
2. **Concurrency Slots**: Multiple tasks can run simultaneously until delay blocks new starts
3. **Independent Completion**: Running tasks complete independently; delays only affect new starts

### Timing Examples

```javascript
// Timeline with concurrency: 2, priorities: { 1: { postDelay: 1000 } }

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

### Unlimited Queue Capacity

For scenarios requiring unlimited task queuing, you can set `maxQueue` to `-1`:

```javascript
const queue = new HoldMyTask({
	concurrency: 5,
	maxQueue: -1 // Unlimited queue capacity (equivalent to Infinity)
});

// Now you can enqueue unlimited tasks without hitting queue limits
for (let i = 0; i < 100000; i++) {
	queue.enqueue(async () => processTask(i));
}
```

**Use Cases:**

- **Batch processing**: When processing large datasets where queue size is unpredictable
- **Event-driven systems**: Where task volume can spike dramatically
- **Data pipelines**: For ETL operations with variable input sizes
- **Development/testing**: When you need to stress-test with large task volumes

**Memory Considerations:**

While `-1` allows unlimited queuing, be mindful of memory usage with very large task sets. Each queued task consumes memory until executed.

---

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

### Enhanced Priority & Coalescing Configuration

HoldMyTask supports comprehensive priority and coalescing configuration for sophisticated timing control:

```javascript
const queue = new HoldMyTask({
	concurrency: 3,
	// Priority-specific defaults
	priorities: {
		1: { postDelay: 200, startDelay: 0 }, // High priority: 200ms delay, immediate start
		2: { postDelay: 100, startDelay: 25 }, // Medium priority: 100ms delay, 25ms start delay
		3: { postDelay: 50, startDelay: 50 } // Low priority: 50ms delay, 50ms start delay
	},
	// Enhanced coalescing with per-key settings
	coalescing: {
		defaults: {
			windowDuration: 200,
			maxDelay: 1000,
			postDelay: 75, // Default completion delay for coalescing tasks
			startDelay: 25, // Default start delay for coalescing tasks
			resolveAllPromises: true
		},
		keys: {
			"ui.update": {
				windowDuration: 100,
				maxDelay: 500,
				postDelay: 25, // Fast UI updates
				startDelay: 0
			},
			"api.batch": {
				windowDuration: 1000,
				maxDelay: 5000,
				postDelay: 200, // Slower API operations
				startDelay: 100
			}
		}
	}
});

// Dynamic configuration
queue.configurePriority(4, { postDelay: 300, startDelay: 75 });
queue.configureCoalescingKey("data.sync", {
	windowDuration: 800,
	maxDelay: 3000,
	postDelay: 150,
	startDelay: 50
});

// Get configuration information
const priority4Config = queue.getPriorityConfig(4);
console.log(`Priority 4: ${priority4Config.postDelay}ms delay, ${priority4Config.startDelay}ms start delay`);

const dataSyncConfig = queue.getCoalescingConfig("data.sync");
console.log(`Data sync: ${dataSyncConfig.windowDuration}ms window, ${dataSyncConfig.maxDelay}ms max delay`);

// Get all configurations
const allPriorities = queue.getPriorityConfigurations();
const allCoalescingKeys = queue.getCoalescingConfigurations();
console.log("All priority configs:", allPriorities);
console.log("All coalescing configs:", allCoalescingKeys);
```

**Configuration Hierarchy:**

1. Task-level options (highest priority)
2. Coalescing key configuration
3. Priority defaults
4. Coalescing defaults
5. System defaults (lowest priority)

**Backward Compatibility:** Deprecated option names are converted automatically; see [Deprecated Options](#deprecated-options).

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

### Per-Priority Concurrency Limits

HoldMyTask supports granular concurrency control at the priority level, allowing you to fine-tune how many tasks of each priority can run simultaneously while still respecting the global concurrency limit.

#### Key Benefits

- **Database operations** - Run only 1 critical database migration at a time
- **API rate limiting** - Limit API calls per priority to avoid overwhelming services
- **Resource management** - Control expensive operations while allowing lightweight tasks
- **Flexible scaling** - Different priorities can have different concurrency characteristics

#### Configuration

```javascript
const queue = new HoldMyTask({
	concurrency: 8, // Global maximum: 8 total tasks across all priorities
	priorities: {
		1: {
			concurrency: 1, // Critical: Only 1 at a time (database migrations, etc.)
			postDelay: 100, // 100ms delay after completion
			startDelay: 0 // No pre-execution delay
		},
		2: {
			concurrency: 3, // Important: Up to 3 at a time (API calls, file processing)
			postDelay: 200, // 200ms delay after completion
			startDelay: 50 // 50ms pre-execution delay
		},
		3: {
			concurrency: 5, // Background: Up to 5 at a time (cleanup, logging, etc.)
			postDelay: 0, // No post-completion delay
			startDelay: 100 // 100ms pre-execution delay
		}
		// Priority 4+ tasks: No specific limit, use global concurrency
	}
});
```

#### How It Works

1. **Global Limit First** - The total running tasks never exceed the global `concurrency` setting
2. **Per-Priority Limits** - Tasks of each priority respect their individual `concurrency` limit
3. **Dynamic Scheduling** - If one priority is at its limit, other priorities can still start tasks
4. **Automatic Fallback** - Priorities without `concurrency` settings use the global limit

#### Usage Examples

```javascript
// Database migration (priority 1): Only 1 can run at a time
await queue.enqueue(
	async () => {
		await runDatabaseMigration();
	},
	{ priority: 1 }
);

// API calls (priority 2): Up to 3 can run concurrently
await queue.enqueue(
	async () => {
		return await fetchUserData(userId);
	},
	{ priority: 2 }
);

// Background cleanup (priority 3): Up to 5 can run concurrently
await queue.enqueue(
	async () => {
		await cleanupTempFiles();
	},
	{ priority: 3 }
);

// High-priority urgent task (priority 10): Uses global concurrency limit
await queue.enqueue(
	async () => {
		await handleEmergencyAlert();
	},
	{ priority: 10 }
);
```

#### Monitoring Per-Priority Concurrency

```javascript
// Check current concurrency state
const inspection = queue.inspect();
console.log("Global concurrency:", inspection.scheduler.currentConcurrency + "/" + inspection.scheduler.concurrency);

// Per-priority concurrency information
Object.entries(inspection.scheduler.priorityConcurrency).forEach(([priority, info]) => {
	console.log(`Priority ${priority}: ${info.running}/${info.limit} (${info.available} available)`);
});

// Or use the scheduler-specific inspection
const scheduler = queue.inspectScheduler();
console.log("Priority concurrency limits:", scheduler.priorityConcurrency);
```

#### Example Output

```text
Global concurrency: 6/8
Priority 1: 1/1 (0 available)
Priority 2: 2/3 (1 available)
Priority 3: 3/5 (2 available)
```

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
	priorities: {
		1: { postDelay: 1000 }, // 1 second delay after priority 1 tasks complete
		2: { postDelay: 500 }, // 500ms delay after priority 2 tasks complete
		3: { postDelay: 0 } // No delay after priority 3 tasks (explicit)
	}
});

// Task A (priority 1) completes at 10:00:05
// → Next task can't start until 10:00:06 (1000ms delay)

// Task B (priority 2) completes at 10:00:07
// → Next task can't start until 10:00:07.5 (500ms delay)

// Override delay for specific task
queue.enqueue(task, callback, { priority: 1, postDelay: 200 }); // Uses 200ms instead of 1000ms

// Set zero delay for specific task
queue.enqueue(task, callback, { priority: 1, postDelay: 0 }); // No delay after this task
```

### Delay Bypass - Emergency Task Injection

When urgent tasks need to execute immediately, bypassing active delay periods, use the `bypassDelay` option or `postDelay: -1` syntax. This is perfect for emergency situations, high-priority interrupts, or critical system tasks.

#### Bypass Behavior

```javascript
const queue = new HoldMyTask({
	concurrency: 1,
	priorities: { 1: { postDelay: 1000 } } // 1 second delay after priority 1 tasks
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
	postDelay: -1 // Same as bypassDelay: true
});
```

#### Advanced Bypass Scenarios

```javascript
const queue = new HoldMyTask({
	concurrency: 2,
	priorities: { 1: { postDelay: 800 }, 2: { postDelay: 400 } }
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

---

## 🔄 Task Coalescing System

The coalescing system allows multiple similar tasks to be intelligently merged, reducing redundant operations while ensuring all promises resolve with accurate results. This is perfect for scenarios like UI updates, API calls, or device commands where only the final result matters.

### How Coalescing Works

When tasks with the same `coalescingKey` are enqueued within a time window, they get merged into groups:

1. **First task** creates a new coalescing group with a time window
2. **Subsequent tasks** with the same key join the existing group (if within the window)
3. **One representative task** executes for the entire group
4. **All promises** in the group resolve with the same result

⚠️ **Critical Timing Consideration**: Real-world tasks take time to execute (100ms-2000ms+). If your coalescing tasks need to see the final state from other operations, ensure proper timing with `startDelay` or `timestamp` scheduling. Tasks that start too early may see intermediate states rather than final results.

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
	coalescing: {
		defaults: {
			windowDuration: 200, // 200ms window for grouping tasks
			maxDelay: 1000, // Maximum 1000ms delay before forcing execution
			resolveAllPromises: true // All promises get the result (default: true)
		}
	}
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
			postDelay: 100 // 100ms delay after completion
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
	coalescing: {
		defaults: {
			windowDuration: 200,
			maxDelay: 1000
		}
	}
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
					postDelay: 100 // Brief delay after UI updates
				}
			);

			return result;
		},
		{
			priority: 1, // High priority for user actions
			postDelay: 100 // Brief delay after volume operations
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
			startDelay: 100 // 100ms delay allows grouping
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

For precise scheduling, use `timestamp` instead of `startDelay`:

```javascript
const queue = new HoldMyTask({
	coalescing: {
		defaults: {
			windowDuration: 300,
			maxDelay: 2000
		}
	}
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
	coalescing: {
		defaults: {
			windowDuration: 500, // Try to group for 500ms
			maxDelay: 2000 // But never wait more than 2 seconds
		}
	}
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
	coalescing: {
		defaults: {
			resolveAllPromises: true, // Default: all promises get the result
			windowDuration: 200
		}
	}
});

// Mode 1: All promises resolve (default behavior)
const results1 = await Promise.all([
	queue.enqueue(task, { coalescingKey: "test" }),
	queue.enqueue(task, { coalescingKey: "test" }),
	queue.enqueue(task, { coalescingKey: "test" })
]);
// All three promises resolve with the same result

// Mode 2: Only the representative (newest) task's promise resolves
const queue2 = new HoldMyTask({
	coalescing: {
		defaults: {
			resolveAllPromises: false,
			windowDuration: 200
		}
	}
});

const settled = await Promise.allSettled([
	queue2.enqueue(task, { coalescingKey: "test" }), // Rejects: "Task was coalesced with a newer task"
	queue2.enqueue(task, { coalescingKey: "test" }), // Rejects: "Task was coalesced with a newer task"
	queue2.enqueue(task, { coalescingKey: "test" }) // Resolves with the result
]);
// Only the newest task in the group gets the result; the others are rejected
// (callback-style tasks receive the same error as their first argument)
```

### Real-World Coalescing Patterns

#### Device Control Pattern

```javascript
class VolumeController {
	constructor() {
		this.queue = new HoldMyTask({
			concurrency: 2, // Allow volume and update tasks concurrently
			coalescing: {
				defaults: {
					windowDuration: 200,
					maxDelay: 1000
				}
			}
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
						postDelay: 100 // Brief delay after UI updates
					}
				);

				return newVolume;
			},
			{
				priority: 1, // High priority for user actions
				postDelay: 50 // Brief delay between volume operations
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
			coalescing: {
				defaults: {
					windowDuration: 300,
					maxDelay: 1500
				}
			}
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
	coalescing: {
		defaults: {
			windowDuration: 200,
			maxDelay: 1000
		}
	}
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

---

## ⏱️ Timeouts

Tasks automatically time out and either call the callback with an error payload or reject the promise. Callback-style timeouts also emit an `error` event on the queue (see [Events](#events)):

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

---

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

---

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
	priorities: {
		1: { postDelay: 1000 }, // 1 second between high-priority tasks
		2: { postDelay: 100 }, // 100ms between medium-priority tasks
		3: { postDelay: 0 } // No delay for low-priority tasks
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
	priorities: { 1: { postDelay: 50 } } // Small delay between batches
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
	priorities: {
		1: { postDelay: 2000 }, // 2 second delay between API calls (rate limiting)
		2: { postDelay: 5000 }, // 5 second delay for heavy operations
		9: { postDelay: 0 } // No delay for monitoring tasks
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
	postDelay: -1, // Same as bypassDelay: true
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

---

## 🧪 Testing & Development

```bash
# Run tests (vitest suite + CommonJS entry tests)
npm test

# Run tests with coverage
npm run coverage

# Run tests in watch mode
npm run test:watch

# Lint and format check
npm run lint
npm run format:check

# Build types, type-check, and build for publishing
npm run build:ci
```

### Testing with Injectable Clock

For testing, you can inject a custom clock function and use the `now()` method to get the current time according to your queue:

```javascript
let mockTime = Date.now();
const queue = new HoldMyTask({
	now: () => mockTime // Control time in tests
});

// In tests, you can advance time
mockTime += 1000; // Advance by 1 second

// The queue's now() method respects your custom clock
console.log(queue.now()); // Returns mockTime value
console.log(Date.now()); // Returns actual system time

// Useful for testing time-based behavior
queue.enqueue(task, { timestamp: queue.now() + 5000 }); // 5 seconds from mock time
```

---

## 📚 Documentation

- **[Changelog](https://github.com/CLDMV/holdmytask/tree/master/docs/changelog/)** — release notes for every version (v1 + v2)
- **[Examples](https://github.com/CLDMV/holdmytask/tree/master/examples/)** — runnable scripts exercising priorities, coalescing, and stress scenarios
- **[Type definitions](https://github.com/CLDMV/holdmytask/tree/master/types/)** — the TypeScript declarations shipped with the package

[![CodeFactor]][codefactor_url] [![OpenSSF Scorecard]][ossf_scorecard_url] [![npms.io score]][npms_url] [![npm unpacked size]][npm_size_url] [![Repo size]][repo_size_url]

---

## 🤝 Contributing

Contributions are welcome! Please ensure:

- All tests pass
- Code follows existing style
- New features include tests
- Documentation is updated

[![Contributors]][contributors_url] [![Sponsor shinrai]][sponsor_url]

---

## 🔗 Links

- **npm**: [@cldmv/holdmytask](https://www.npmjs.com/package/@cldmv/holdmytask)
- **GitHub**: [CLDMV/holdmytask](https://github.com/CLDMV/holdmytask)
- **Issues**: [GitHub Issues](https://github.com/CLDMV/holdmytask/issues)
- **Changelog**: [docs/changelog/](https://github.com/CLDMV/holdmytask/tree/master/docs/changelog/)
- **Releases**: [GitHub Releases](https://github.com/CLDMV/holdmytask/releases)

---

## 📄 License

[![GitHub license]][github_license_url] [![npm license]][npm_license_url]

Apache-2.0 © Shinrai / CLDMV — see [LICENSE](https://github.com/CLDMV/holdmytask/blob/HEAD/LICENSE) for details.

[npm version]: https://img.shields.io/npm/v/%40cldmv%2Fholdmytask.svg?style=for-the-badge&logo=npm&logoColor=white&labelColor=CB3837
[npm_version_url]: https://www.npmjs.com/package/@cldmv/holdmytask
[last commit]: https://img.shields.io/github/last-commit/CLDMV/holdmytask?style=for-the-badge&logo=github&logoColor=white&labelColor=181717
[last_commit_url]: https://github.com/CLDMV/holdmytask/commits
[npm last update]: https://img.shields.io/npm/last-update/%40cldmv%2Fholdmytask?style=for-the-badge&logo=npm&logoColor=white&labelColor=CB3837
[npm_last_update_url]: https://www.npmjs.com/package/@cldmv/holdmytask
[codefactor]: https://img.shields.io/codefactor/grade/github/CLDMV/holdmytask?style=for-the-badge&logo=codefactor&logoColor=white&labelColor=F44A6A
[codefactor_url]: https://www.codefactor.io/repository/github/cldmv/holdmytask
[openssf scorecard]: https://img.shields.io/ossf-scorecard/github.com/CLDMV/holdmytask?style=for-the-badge&label=OpenSSF%20Scorecard
[ossf_scorecard_url]: https://scorecard.dev/viewer/?uri=github.com/CLDMV/holdmytask
[npms.io score]: https://img.shields.io/npms-io/final-score/%40cldmv%2Fholdmytask?style=for-the-badge&logo=npms&logoColor=white&labelColor=0B5D57
[npms_url]: https://npms.io/search?q=%40cldmv%2Fholdmytask
[npm downloads]: https://img.shields.io/npm/dm/%40cldmv%2Fholdmytask.svg?style=for-the-badge&logo=npm&logoColor=white&labelColor=CB3837
[npm_downloads_url]: https://www.npmjs.com/package/@cldmv/holdmytask
[github downloads]: https://img.shields.io/github/downloads/CLDMV/holdmytask/total?style=for-the-badge&logo=github&logoColor=white&labelColor=181717
[github_downloads_url]: https://github.com/CLDMV/holdmytask/releases
[npm unpacked size]: https://img.shields.io/npm/unpacked-size/%40cldmv%2Fholdmytask.svg?style=for-the-badge&logo=npm&logoColor=white&labelColor=CB3837
[npm_size_url]: https://www.npmjs.com/package/@cldmv/holdmytask
[repo size]: https://img.shields.io/github/repo-size/CLDMV/holdmytask?style=for-the-badge&logo=github&logoColor=white&labelColor=181717
[repo_size_url]: https://github.com/CLDMV/holdmytask
[github license]: https://img.shields.io/github/license/CLDMV/holdmytask.svg?style=for-the-badge&logo=github&logoColor=white&labelColor=181717
[github_license_url]: https://github.com/CLDMV/holdmytask/blob/HEAD/LICENSE
[npm license]: https://img.shields.io/npm/l/%40cldmv%2Fholdmytask.svg?style=for-the-badge&logo=npm&logoColor=white&labelColor=CB3837
[npm_license_url]: https://www.npmjs.com/package/@cldmv/holdmytask
[coverage]: https://img.shields.io/endpoint?url=https%3A%2F%2Fraw.githubusercontent.com%2FCLDMV%2Fholdmytask%2Fbadges%2Fcoverage.json&style=for-the-badge&logo=vitest&logoColor=white
[coverage_url]: https://github.com/CLDMV/holdmytask/blob/badges/coverage.json
[contributors]: https://img.shields.io/github/contributors/CLDMV/holdmytask.svg?style=for-the-badge&logo=github&logoColor=white&labelColor=181717
[contributors_url]: https://github.com/CLDMV/holdmytask/graphs/contributors
[sponsor shinrai]: https://img.shields.io/github/sponsors/shinrai?style=for-the-badge&logo=githubsponsors&logoColor=white&labelColor=EA4AAA&label=Sponsor
[sponsor_url]: https://github.com/sponsors/shinrai
