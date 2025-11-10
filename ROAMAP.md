# Project Roadmap — holdmytask

## 0) Objective & Success Criteria

Goal: Implement a small, dependency-light Node module that accepts queue items with a callback and optional timestamp, delay, priority, and executes each callback when the item becomes "ready," honoring ordering rules and concurrency limits.

Done when:

- API below is implemented with unit tests (≥95% line coverage).
- Priority, delay, and timestamp rules are enforced deterministically.
- Concurrency, cancellation, and graceful shutdown work reliably.
- Typings (TS) and dual ESM/CJS exports are provided.
- README has runnable examples; package is publishable to npm.

---

## 1) Minimum Viable API (Public Surface)

### Constructor

const q = new HoldMyTask(options?)

options (all optional):

- concurrency (number, default 1)
- tick (number ms, default 25)
- autoStart (boolean, default true)
- defaultPriority (integer, default 0)
- maxQueue (number | Infinity, default Infinity)
- delays (object mapping priority -> delay ms, default {})
- onError (fn(err, item))
- now (fn(): number) — injectable clock for tests

### Enqueue

q.enqueue(task, callback, options?)

task: (signal?: AbortSignal) => unknown | Promise<unknown>  
callback: (error, result) => void

options (all optional):

- delay (ms) — completion delay after task finishes
- timestamp (ms epoch)
- priority (int)
- signal (AbortSignal)
- timeout (ms) — kill task if it doesn't complete in time
- metadata (any)

Returns: TaskHandle  
→ id, cancel(reason?), status(), startedAt, finishedAt, result, error

### Controls

q.pause()  
q.resume()  
q.clear()  
q.size()  
q.inflight()  
q.destroy()

### Events

start, success, error, cancel, drain, scheduled

---

## 2) Readiness & Ordering Rules

1. Ready time = timestamp → else enqueueTime.
2. Eligibility: now() >= readyAt and not canceled.
3. Ordering: priority ↓, readyAt ↑, FIFO.
4. Backpressure: if size() >= maxQueue → throw.
5. AbortSignal: cancel before start.
6. Concurrency: limited by concurrency.
7. Completion delays: configurable delays between task completions based on priority.
8. Timeouts: tasks can be aborted if they exceed timeout duration.
9. Callbacks: completion callbacks receive (error, result) parameters.
10. Errors: emit + call completion callback with error payload.

---

## 3) Internal Data Model

Item:

- id, task, callback, priority, readyAt, enqueueSeq
- status, signal, timeout, delay, metadata, startedAt, finishedAt, result, error

Heaps:

- Min-heap by readyAt (pending)
- Max-heap by (priority, -readyAt, -enqueueSeq) (ready)

Scheduler:

- Interval (tick ms) or timeout until next ready or delay expires.
- On tick:
  1. Move ready → readyHeap.
  2. Start until inflight < concurrency and delay constraints satisfied.

---

## 4) Core Implementation Phases

### Phase A — Foundations (MVP)

- Implement heaps, scheduler, enqueue/run/cancel, tests.
- setInterval scheduler.
- Basic error handling.

Tests:

- Immediate, delayed, timestamped, priority, concurrency, cancel.

### Phase B — Robustness

- Add onError, drain, per-item status, metrics snapshot.
- Debug logging toggle.

### Phase C — Performance & Precision

- Hybrid scheduler (setTimeout to next ready).
- Heap ops O(log n).
- Benchmarks with perf_hooks.

Targets:

- 100k enqueues < 2s.
- Scheduler overhead <5%.

### Phase D — Quality & Packaging

- TS typings, dual exports.
- ESLint + Prettier.
- Coverage ≥95%.
- CI with Node 18.12+/20/22/latest

---

## 5) Edge Cases

- Both timestamp + delay: prefer timestamp.
- Past timestamps → run now.
- Huge delay → no overflow.
- Non-promise callback.
- Never-resolving callback → document.
- Abort after start → not supported (MVP).

---

## 6) Optional Enhancements

- Per-task timeout.
- Priority aging.
- Persistence plugin.
- Rate limiting.
- Lanes/partitions.
- Async iterator stream.
- Introspection API.

---

## 7) Testing Plan

Unit: delay/timestamp/priority/concurrency/cancel/errors/drain/FIFO.  
Clock injection: deterministic time.  
Fuzz: random enqueue order.

---

## 8) Documentation

README:

- One-liner: "A tiny task queue that waits until your task is ready."
- Install: npm i holdmytask
- Examples:
  - Simple delay/priority.
  - Concurrency.
  - Cancellation.
  - Events.
- Ordering guarantees.
- Performance notes.

---

## 9) Repository & Packaging

- package.json (name, keywords, exports, types, engines)
- LICENSE (Apache-2.0)
- src/, dist/
- README.md + badges
- CHANGELOG.md
- CI workflow with tests + coverage

---

## 10) Milestones

1. M1 (Day 1–2): MVP
2. M2 (Day 3): Events, metrics, drain
3. M3 (Day 4): Precision scheduler, performance
4. M4 (Day 5): Typings, CI, publish

---

## 11) Acceptance Demo

- Enqueue 6 mixed tasks.
- Concurrency 2.
- Cancel one.
- Log events and timestamps.
- Verify order + drain.

---

## 12) Agent Roadmap with Code Examples and Internal Details

This section provides a detailed guide for implementing the `holdmytask` module, including code examples, internal workings, and step-by-step development roadmap for an AI agent.

### 12.1) Project Setup and Structure

First, initialize the project with proper Node.js structure:

````bash
mkdir holdmytask
cd holdmytask
npm init -y
```bash
npm install --save-dev vitest @vitest/ui eslint prettier
````

Project structure:

````text
holdmytask/
├── src/
│   ├── hold-my-task.mjs   # Core implementation
│   └── utils.mjs          # Helper functions
├── tests/
│   └── HoldMyTask.vest.mjs
├── package.json
├── .configs/
│   ├── eslint.config.mjs
│   ├── vitest.config.mjs  # Existing Vitest configuration
│   └── prettier.config.js
└── README.md
```markdown
### 12.2) Core Concepts and How It Works

#### Task Lifecycle

1. **Enqueue**: Task enters the queue with calculated `readyAt` time
2. **Wait**: Task waits in `pendingHeap` until `now() >= readyAt`
3. **Ready**: Moves to `readyHeap` ordered by priority and FIFO
4. **Execute**: Starts when concurrency allows, runs callback
5. **Complete**: Emits success/error, updates metrics

#### Heap Management

- **pendingHeap**: Min-heap by `readyAt` (earliest first)
- **readyHeap**: Max-heap by `(priority, -readyAt, -enqueueSeq)`
  - Higher priority (larger number) comes first
  - Earlier readyAt comes first (smaller -readyAt)
  - Earlier enqueue sequence comes first

#### Scheduler Algorithm

```javascript
// Pseudocode for scheduler tick
function schedulerTick() {
	const now = this.now();

	// Move ready tasks from pending to ready heap
	while (this.pendingHeap.peek()?.readyAt <= now) {
		const task = this.pendingHeap.pop();
		this.readyHeap.push(task);
	}

	// Start tasks up to concurrency limit
	while (this.inflight < this.concurrency && this.readyHeap.size() > 0) {
		const task = this.readyHeap.pop();
		this.startTask(task);
	}

	// Schedule next tick
	this.scheduleNextTick();
}
````

### 12.3) Phase-by-Phase Implementation Guide

#### Phase A: Foundations (MVP)

**Step 1: Define Types (inline or in comments)**

Since we're using JavaScript, types are defined via JSDoc comments and runtime checks.

**Step 2: Implement Basic Heap**

```javascript
// utils.mjs
export class MinHeap {
	constructor(compare) {
		this.heap = [];
		this.compare = compare;
	}

	push(item) {
		this.heap.push(item);
		this.bubbleUp(this.heap.length - 1);
	}

	pop() {
		if (this.heap.length === 0) return undefined;
		const root = this.heap[0];
		const last = this.heap.pop();
		if (this.heap.length > 0) {
			this.heap[0] = last;
			this.sinkDown(0);
		}
		return root;
	}

	peek() {
		return this.heap[0];
	}

	size() {
		return this.heap.length;
	}

	bubbleUp(index) {
		while (index > 0) {
			const parentIndex = Math.floor((index - 1) / 2);
			if (this.compare(this.heap[index], this.heap[parentIndex]) >= 0) break;
			[this.heap[index], this.heap[parentIndex]] = [this.heap[parentIndex], this.heap[index]];
			index = parentIndex;
		}
	}

	sinkDown(index) {
		const length = this.heap.length;
		while (true) {
			let left = 2 * index + 1;
			let right = 2 * index + 2;
			let smallest = index;

			if (left < length && this.compare(this.heap[left], this.heap[smallest]) < 0) {
				smallest = left;
			}
			if (right < length && this.compare(this.heap[right], this.heap[smallest]) < 0) {
				smallest = right;
			}
			if (smallest === index) break;

			[this.heap[index], this.heap[smallest]] = [this.heap[smallest], this.heap[index]];
			index = smallest;
		}
	}
}
```

**Step 3: Core HoldMyTask Class**

```typescript
// hold-my-task.mjs
import { EventEmitter } from "events";
import { MinHeap } from "./utils.mjs";

export class HoldMyTask extends EventEmitter {
	private pendingHeap: MinHeap<TaskItem>;
	private readyHeap: MinHeap<TaskItem>; // Actually max-heap via comparator
	private running = new Set<TaskItem>();
	private tasks = new Map<string, TaskItem>();
	private nextId = 1;
	private enqueueSeq = 1;

	constructor(private options: HoldMyTaskOptions = {}) {
		super();
		this.options.concurrency ??= 1;
		this.options.tick ??= 25;
		this.options.autoStart ??= true;
		// Initialize heaps with comparators
	}

	enqueue(callback: () => any, options: TaskOptions = {}): TaskHandle {
		const id = String(this.nextId++);
		const now = this.now();
		const readyAt = options.timestamp ?? now + (options.delay ?? 0);

		const item: TaskItem = {
			id,
			callback,
			priority: options.priority ?? this.options.defaultPriority ?? 0,
			readyAt,
			enqueueSeq: this.enqueueSeq++,
			status: "pending",
			signal: options.signal,
			metadata: options.metadata
		};

		this.tasks.set(id, item);
		this.pendingHeap.push(item);

		if (this.options.autoStart) {
			this.scheduleTick();
		}

		return {
			id,
			cancel: (reason) => this.cancelTask(id, reason),
			status: () => this.tasks.get(id)?.status ?? "canceled",
			get startedAt() {
				return this.tasks.get(id)?.startedAt;
			},
			get finishedAt() {
				return this.tasks.get(id)?.finishedAt;
			},
			get result() {
				return this.tasks.get(id)?.result;
			},
			get error() {
				return this.tasks.get(id)?.error;
			}
		};
	}

	// Implementation continues...
}
```

**Example Usage:**

```javascript
const q = new HoldMyTask({ concurrency: 2 });

// Simple task
q.enqueue(() => console.log("Hello"));

// Delayed task
q.enqueue(() => console.log("Delayed"), { delay: 1000 });

// Priority task
q.enqueue(() => console.log("High priority"), { priority: 10 });

// Timestamp task
q.enqueue(() => console.log("Scheduled"), { timestamp: Date.now() + 5000 });
```

#### Phase B: Robustness

Add event emission and error handling:

```typescript
private async startTask(item: TaskItem) {
  item.status = 'running';
  item.startedAt = this.now();
  this.running.add(item);
  this.emit('start', item);

  try {
    const result = await item.callback();
    item.result = result;
    item.status = 'completed';
    item.finishedAt = this.now();
    this.emit('success', item);
  } catch (error) {
    item.error = error;
    item.status = 'error';
    item.finishedAt = this.now();
    this.emit('error', item);
    this.options.onError?.(error, item);
  } finally {
    this.running.delete(item);
    if (this.running.size === 0 && this.pendingHeap.size() === 0 && this.readyHeap.size() === 0) {
      this.emit('drain');
    }
  }
}
```

**Event Example:**

```javascript
q.on("start", (task) => console.log(`Started: ${task.id}`));
q.on("success", (task) => console.log(`Completed: ${task.id}`));
q.on("error", (task) => console.error(`Error in ${task.id}:`, task.error));
q.on("drain", () => console.log("All tasks completed"));
```

#### Phase C: Performance & Precision

Implement hybrid scheduler:

```typescript
private scheduleNextTick() {
  if (!this.isActive) return;

  const nextPending = this.pendingHeap.peek();
  const nextReady = this.readyHeap.peek();

  if (nextPending) {
    const delay = Math.max(0, nextPending.readyAt - this.now());
    if (delay > this.options.tick!) {
      // Use setTimeout for precision
      this.timer = setTimeout(() => this.schedulerTick(), delay);
      return;
    }
  }

  // Use interval for frequent checks
  if (!this.interval) {
    this.interval = setInterval(() => this.schedulerTick(), this.options.tick);
  }
}
```

#### Phase D: Quality & Packaging

Add TypeScript declarations, dual exports:

```typescript
// index.ts
export { HoldMyTask } from "./HoldMyTask";
export type { TaskOptions, TaskHandle, HoldMyTaskOptions } from "./types";
```

```json
// package.json
{
	"name": "holdmytask",
	"exports": {
		".": {
			"import": "./index.mjs",
			"require": "./index.cjs"
		}
	},
	"types": "./src/index.d.ts"
}
```

### 12.4) Testing Examples

**Basic Functionality Test:**

```typescript
test("executes tasks in priority order", async () => {
	const q = new HoldMyTask({ concurrency: 1, now: () => 1000 });
	const results: string[] = [];

	q.enqueue(() => results.push("low"), { priority: 0 });
	q.enqueue(() => results.push("high"), { priority: 10 });
	q.enqueue(() => results.push("medium"), { priority: 5 });

	await new Promise((resolve) => q.on("drain", resolve));

	expect(results).toEqual(["high", "medium", "low"]);
});
```

**Concurrency Test:**

```typescript
test("respects concurrency limit", async () => {
	const q = new HoldMyTask({ concurrency: 2 });
	let running = 0;
	const maxRunning: number[] = [];

	const task = () =>
		new Promise((resolve) => {
			running++;
			maxRunning.push(running);
			setTimeout(() => {
				running--;
				resolve();
			}, 100);
		});

	for (let i = 0; i < 5; i++) {
		q.enqueue(task);
	}

	await new Promise((resolve) => q.on("drain", resolve));

	expect(Math.max(...maxRunning)).toBe(2);
});
```

### 12.5) Performance Considerations

- **Heap Operations**: O(log n) for insert/delete
- **Scheduler Overhead**: Minimize ticks, use timeouts for distant tasks
- **Memory Usage**: Bounded by maxQueue, efficient data structures
- **Clock Precision**: Injectable `now()` for testing, use `performance.now()` in production

### 12.6) Common Pitfalls and Solutions

1. **Race Conditions**: Always check task status before operations
2. **Timer Leaks**: Clear intervals/timeouts on destroy
3. **Memory Leaks**: Remove completed tasks from maps
4. **Precision Loss**: Use high-resolution timers for delays

### 12.7) Dual ESM/CJS Compatibility

The `holdmytask` module supports both ES Modules (ESM) and CommonJS (CJS) to ensure compatibility with different Node.js environments and build tools.

#### Index Files Structure

**index.mjs (ESM Entry Point):**

```javascript
/**
 * ES Module entry point for holdmytask
 *
 * This file provides ES Module (import) support for the holdmytask library.
 * It exports the main HoldMyTask class.
 *
 * @module holdmytask
 */

export { HoldMyTask } from "./src/hold-my-task.mjs";
```

**index.cjs (CJS Entry Point):**

```javascript
/**
 * CommonJS entry point for holdmytask
 *
 * This file provides CommonJS (require) support for the holdmytask library.
 * It imports and re-exports the main HoldMyTask class from the ESM module.
 *
 * @module holdmytask
 */

const { createRequire } = require("module");
const requireESM = createRequire(__filename);

const { HoldMyTask } = requireESM("./index.mjs");

module.exports = { HoldMyTask };
module.exports.HoldMyTask = HoldMyTask;
```

#### How Dual Exports Work

1. **Development Setup**: During development, all source files are in the `src/` folder. The index files point directly to the source files for immediate testing.

2. **Build Process**: For production, TypeScript source files in `src/` are compiled to both ESM (`.mjs`) and CJS (`.cjs`) formats. The CJS entry uses Node.js's `createRequire` to import from the ESM build, ensuring consistency.

3. **Package.json Configuration**:

```json
{
	"name": "holdmytask",
	"engines": {
		"node": ">=18.12"
	},
	"exports": {
		".": {
			"import": "./index.mjs",
			"require": "./index.cjs"
		}
	},
	"types": "./src/index.d.ts",
	"main": "./index.cjs",
	"module": "./index.mjs"
}
```

4. **CJS to ESM Bridge**: The `index.cjs` file uses `createRequire` to dynamically import the ESM module, allowing the same codebase to be used for both formats without duplication.

**ESM (Modern Node.js or bundlers):**

```javascript
import { HoldMyTask } from "holdmytask";

const q = new HoldMyTask();
```

**CJS (Legacy Node.js):**

```javascript
const { HoldMyTask } = require("holdmytask");

const q = new HoldMyTask();
```

#### Build Configuration

**TypeScript Config for Dual Output:**

```json
// tsconfig.json
{
	"compilerOptions": {
		"target": "ES2020",
		"module": "ESNext",
		"moduleResolution": "node",
		"declaration": true,
		"outDir": "./dist",
		"rootDir": "./src"
	},
	"include": ["src/**/*"]
}
```

**Build Script (package.json):**

```json
{
	"scripts": {
		"build": "tsc && npm run build:cjs",
		"build:cjs": "tsc --module commonjs --outDir dist/cjs --target ES2020"
	}
}
```

---

## 13) Clarifications and Missing Details

Based on the roadmap, here are additional implementation details, clarifications, and answers to potential questions:

### 13.1) Heap Implementation Details

**MinHeap for Pending Tasks (by readyAt):**

```typescript
class MinHeap<T> {
	private heap: T[] = [];
	private compare: (a: T, b: T) => number;

	constructor(compare: (a: T, b: T) => number) {
		this.compare = compare;
	}

	push(item: T): void {
		this.heap.push(item);
		this.bubbleUp(this.heap.length - 1);
	}

	pop(): T | undefined {
		if (this.heap.length === 0) return undefined;
		const root = this.heap[0];
		const last = this.heap.pop()!;
		if (this.heap.length > 0) {
			this.heap[0] = last;
			this.sinkDown(0);
		}
		return root;
	}

	peek(): T | undefined {
		return this.heap[0];
	}

	size(): number {
		return this.heap.length;
	}

	private bubbleUp(index: number): void {
		while (index > 0) {
			const parentIndex = Math.floor((index - 1) / 2);
			if (this.compare(this.heap[index], this.heap[parentIndex]) >= 0) break;
			[this.heap[index], this.heap[parentIndex]] = [this.heap[parentIndex], this.heap[index]];
			index = parentIndex;
		}
	}

	private sinkDown(index: number): void {
		const length = this.heap.length;
		while (true) {
			let left = 2 * index + 1;
			let right = 2 * index + 2;
			let smallest = index;

			if (left < length && this.compare(this.heap[left], this.heap[smallest]) < 0) {
				smallest = left;
			}
			if (right < length && this.compare(this.heap[right], this.heap[smallest]) < 0) {
				smallest = right;
			}
			if (smallest === index) break;

			[this.heap[index], this.heap[smallest]] = [this.heap[smallest], this.heap[index]];
			index = smallest;
		}
	}
}
```

**MaxHeap for Ready Tasks (by priority, then FIFO):**

```typescript
// Use MinHeap with inverted comparator
const readyHeap = new MinHeap<TaskItem>((a, b) => {
	// Higher priority first (priority is larger number)
	if (a.priority !== b.priority) return b.priority - a.priority;
	// Earlier readyAt first
	if (a.readyAt !== b.readyAt) return a.readyAt - b.readyAt;
	// Earlier enqueue sequence first
	return a.enqueueSeq - b.enqueueSeq;
});
```

### 13.2) TaskItem Interface Definition

```typescript
interface TaskItem {
	id: string;
	callback: () => any;
	priority: number;
	readyAt: number;
	enqueueSeq: number;
	status: "pending" | "ready" | "running" | "completed" | "canceled" | "error";
	signal?: AbortSignal;
	metadata?: any;
	startedAt?: number;
	finishedAt?: number;
	result?: any;
	error?: Error;
}
```

### 13.3) Scheduler Implementation

**Hybrid Scheduler Logic:**

```typescript
private scheduleNextTick(): void {
  if (!this.isActive || this.destroyed) return;

  clearTimeout(this.timeoutId);
  clearInterval(this.intervalId);

  const now = this.now();
  let nextTime = Infinity;

  // Check pending heap for next ready time
  const nextPending = this.pendingHeap.peek();
  if (nextPending && nextPending.readyAt > now) {
    nextTime = nextPending.readyAt;
  }

  // If next event is soon, use interval
  if (nextTime - now <= this.options.tick!) {
    this.intervalId = setInterval(() => this.schedulerTick(), this.options.tick);
  } else {
    // Use timeout for distant events
    this.timeoutId = setTimeout(() => this.schedulerTick(), Math.min(nextTime - now, 2147483647)); // Max 32-bit int
  }
}
```

### 13.4) Control Methods Implementation

**Pause/Resume:**

```typescript
pause(): void {
  this.isActive = false;
  clearTimeout(this.timeoutId);
  clearInterval(this.intervalId);
}

resume(): void {
  if (this.destroyed) return;
  this.isActive = true;
  this.scheduleNextTick();
}
```

**Clear:**

```typescript
clear(): void {
  // Cancel all pending tasks
  for (const item of this.pendingHeap) {
    if (item.status === 'pending') {
      item.status = 'canceled';
      this.emit('cancel', item);
    }
  }
  this.pendingHeap = new MinHeap(...);
  this.readyHeap = new MinHeap(...);
}
```

**Destroy:**

```typescript
destroy(): void {
  this.destroyed = true;
  this.pause();
  this.clear();
  // Cancel running tasks if supported
  for (const item of this.running) {
    // Note: Cannot cancel already running tasks in MVP
  }
  this.emit('drain');
}
```

### 13.5) Error Handling Details

- **Callback Errors**: Caught and emitted as 'error' event, passed to onError
- **onError Callback**: Receives (error, item), doesn't prevent other tasks
- **Promise Rejections**: Treated as callback errors
- **Internal Errors**: Logged but don't crash the queue

### 13.6) Testing Setup

### 13.6) Testing Setup

**Using Existing Vitest Configuration:**
The project uses the existing `vitest.config.mjs` from the `.configs/` folder, which is configured for `.vest.mjs` test files.

**Test File Structure:**

```javascript
// tests/HoldMyTask.vest.mjs
import { test, expect, vi, beforeEach } from "vitest";
import { HoldMyTask } from "../src/hold-my-task.mjs";

test("executes tasks in priority order", async () => {
	// ... test code
});
```

**Clock Injection for Deterministic Testing:**

```javascript
// Use a mock clock
const mockNow = vi.fn();
const q = new HoldMyTask({ now: mockNow });

// Control time in tests
mockNow.mockReturnValue(1000); // Start at time 1000
q.enqueue(() => {}, { delay: 500 });
mockNow.mockReturnValue(1500); // Advance to 1500
// Task should be ready
```

### 13.7) Linting and Formatting

**ESLint Config:**

```json
{
	"extends": ["eslint:recommended", "@typescript-eslint/recommended"],
	"parser": "@typescript-eslint/parser",
	"plugins": ["@typescript-eslint"],
	"rules": {
		"@typescript-eslint/no-unused-vars": "error",
		"@typescript-eslint/explicit-function-return-type": "off"
	}
}
```

**Prettier Config:**

```json
{
	"semi": true,
	"trailingComma": "es5",
	"singleQuote": true,
	"printWidth": 100,
	"tabWidth": 2
}
```

### 13.8) CI/CD Setup

**GitHub Actions Workflow:**

```yaml
name: CI
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        node: ["18.12", "20", "22", "latest"]
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: ${{ matrix.node }}
      - run: npm ci
      - run: npm run lint
      - run: npm test
      - run: npm run build
```

### 13.9) Performance Benchmarks

**Benchmark Script (benchmarks/index.js):**

```javascript
const { HoldMyTask } = require("../dist");
const { performance } = require("perf_hooks");

async function benchmark() {
	const q = new HoldMyTask({ concurrency: 10 });
	const tasks = 100000;
	const start = performance.now();

	for (let i = 0; i < tasks; i++) {
		q.enqueue(() => Promise.resolve(i), { delay: Math.random() * 1000 });
	}

	await new Promise((resolve) => q.on("drain", resolve));
	const end = performance.now();

	console.log(`Processed ${tasks} tasks in ${end - start}ms`);
	console.log(`Rate: ${tasks / ((end - start) / 1000)} tasks/sec`);
}
```

### 13.10) Memory Management

- **Task Cleanup**: Remove completed tasks from maps immediately
- **Heap Efficiency**: Heaps only store pending/ready tasks
- **Running Set**: Use Set for O(1) membership checks
- **Event Listeners**: Avoid memory leaks from unremoved listeners

### 13.11) Event Details

**Event Payloads:**

- `start`: { task: TaskItem }
- `success`: { task: TaskItem, result: any, duration: number }
- `error`: { task: TaskItem, error: Error, duration: number }
- `cancel`: { task: TaskItem, reason?: string }
- `drain`: {} (no payload)
- `scheduled`: { nextRun: number } (optional)

### 13.12) Build Tool Choice

**Recommendation**: Use `tsc` for dual builds with separate config files:

**tsconfig.esm.json:**

```json
{
	"extends": "./tsconfig.json",
	"module": "ES2020",
	"target": "ES2020",
	"outDir": "./dist/esm",
	"moduleResolution": "node"
}
```

**tsconfig.cjs.json:**

```json
{
	"extends": "./tsconfig.json",
	"module": "CommonJS",
	"target": "ES2020",
	"outDir": "./dist/cjs"
}
```

**Build Script:**

```json
"build": "tsc -p tsconfig.esm.json && tsc -p tsconfig.cjs.json && npm run rename"
```

### 13.13) Security Considerations

- **Input Validation**: Validate options and parameters
- **Resource Limits**: maxQueue prevents DoS
- **Timeout Protection**: Optional per-task timeouts
- **Signal Handling**: Proper AbortSignal integration
- **Error Isolation**: Errors don't affect other tasks

### 13.14) API Documentation

**Use TypeDoc:**

```json
{
	"scripts": {
		"docs": "typedoc src/index.ts"
	}
}
```

**JSDoc Comments** on all public APIs with examples.

This completes the roadmap with all necessary implementation details for building a robust, production-ready task queue library.
