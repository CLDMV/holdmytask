import { test, expect, describe } from "vitest";
import { HoldMyTask } from "../src/hold-my-task.mjs";

describe("Inspection Methods", () => {
	test("should provide comprehensive queue state inspection", async () => {
		const queue = new HoldMyTask({
			concurrency: 2,
			smartScheduling: true,
			tick: 100
		});

		// Add test tasks with different configurations
		queue.enqueue(async () => "task1", {
			priority: 1,
			metadata: { type: "high-priority", userId: 123 }
		});

		queue.enqueue(async () => "task2", {
			priority: 2,
			start: 1000,
			metadata: { type: "delayed", userId: 456 }
		});

		queue.enqueue(async () => "task3", {
			coalescingKey: "user-action",
			metadata: { action: "save", document: "report.pdf" }
		});

		// Test inspect() method
		const state = queue.inspect();

		// Verify basic structure
		expect(state).toHaveProperty("timestamp");
		expect(state).toHaveProperty("scheduler");
		expect(state).toHaveProperty("timers");
		expect(state).toHaveProperty("queues");
		expect(state).toHaveProperty("totals");
		expect(state).toHaveProperty("coalescing");
		expect(state).toHaveProperty("delays");

		// Verify scheduler info
		expect(state.scheduler.isActive).toBe(true);
		expect(state.scheduler.smartScheduling).toBe(true);
		expect(state.scheduler.concurrency).toBe(2);
		expect(typeof state.scheduler.currentConcurrency).toBe("number");

		// Verify queue counts
		expect(state.totals.totalTasks).toBe(3);
		expect(state.queues.pending.tasks).toBeInstanceOf(Array);
		expect(state.queues.ready.tasks).toBeInstanceOf(Array);
		expect(state.queues.running.tasks).toBeInstanceOf(Array);

		// Verify timer information
		expect(state.timers).toHaveProperty("schedulerInterval");
		expect(state.timers).toHaveProperty("schedulerTimeout");
		expect(state.timers).toHaveProperty("nextScheduledRun");

		// Wait briefly and check state changes
		await new Promise((resolve) => setTimeout(resolve, 50));

		const updatedState = queue.inspect();
		expect(updatedState.timestamp).toBeGreaterThan(state.timestamp);
	});

	test("should provide detailed task inspection", async () => {
		const queue = new HoldMyTask({ concurrency: 1 });

		// Add tasks with different priorities and coalescing keys - with delays to keep them around
		queue.enqueue(
			async () => {
				await new Promise((r) => setTimeout(r, 100));
				return "p1-task";
			},
			{ priority: 1, metadata: { priority: "high" } }
		);

		queue.enqueue(
			async () => {
				await new Promise((r) => setTimeout(r, 100));
				return "p2-task";
			},
			{ priority: 2, metadata: { priority: "medium" } }
		);

		queue.enqueue(
			async () => {
				await new Promise((r) => setTimeout(r, 100));
				return "coalesced1";
			},
			{
				coalescingKey: "group1",
				metadata: { action: "save" }
			}
		);

		queue.enqueue(
			async () => {
				await new Promise((r) => setTimeout(r, 100));
				return "coalesced2";
			},
			{
				coalescingKey: "group1",
				metadata: { action: "delete" }
			}
		);

		// Wait a moment for tasks to be queued but not necessarily started
		await new Promise((resolve) => setTimeout(resolve, 10));

		const tasks = queue.inspectTasks();

		// Verify structure
		expect(tasks).toHaveProperty("pending");
		expect(tasks).toHaveProperty("ready");
		expect(tasks).toHaveProperty("running");
		expect(tasks).toHaveProperty("byPriority");
		expect(tasks).toHaveProperty("byCoalescingKey");
		expect(tasks).toHaveProperty("total");

		// Verify counts (coalescing reduces 4 enqueued tasks to 3 actual tasks)
		expect(tasks.total).toBe(3);
		expect(tasks.pending).toBeInstanceOf(Array);
		expect(tasks.ready).toBeInstanceOf(Array);
		expect(tasks.running).toBeInstanceOf(Array);

		// Verify priority grouping
		expect(tasks.byPriority).toHaveProperty("1");
		expect(tasks.byPriority).toHaveProperty("2");

		// Verify coalescing behavior - tasks with same coalescingKey are grouped
		// Check that we have a representative task with coalescing metadata
		const allTasks = [...tasks.pending, ...tasks.ready, ...tasks.running];
		const coalescedTask = allTasks.find((t) => t.metadata?.representative);
		expect(coalescedTask).toBeTruthy();
		expect(coalescedTask.metadata.coalescingKey).toBe("group1"); // Wait for some tasks to complete
		await new Promise((resolve) => setTimeout(resolve, 100));

		const updatedTasks = queue.inspectTasks();
		expect(updatedTasks.total).toBeLessThanOrEqual(tasks.total);
	});

	test("should provide scheduler state inspection", async () => {
		const queue = new HoldMyTask({
			concurrency: 3,
			smartScheduling: false,
			tick: 50
		});

		// Add a delayed task
		queue.enqueue(async () => "delayed", {
			start: 500,
			priority: 1,
			metadata: { delayed: true }
		});

		// Add a ready task
		queue.enqueue(async () => "ready", {
			priority: 2,
			metadata: { ready: true }
		});

		const scheduler = queue.inspectScheduler();

		// Verify structure
		expect(scheduler).toHaveProperty("timestamp");
		expect(scheduler).toHaveProperty("isActive");
		expect(scheduler).toHaveProperty("smartScheduling");
		expect(scheduler).toHaveProperty("concurrency");
		expect(scheduler).toHaveProperty("currentConcurrency");
		expect(scheduler).toHaveProperty("availableSlots");
		expect(scheduler).toHaveProperty("timers");
		expect(scheduler).toHaveProperty("delays");
		expect(scheduler).toHaveProperty("queueCounts");

		// Verify values
		expect(scheduler.isActive).toBe(true);
		expect(scheduler.smartScheduling).toBe(false);
		expect(scheduler.concurrency).toBe(3);
		expect(scheduler.currentConcurrency).toBeGreaterThanOrEqual(0);
		expect(scheduler.availableSlots).toBeLessThanOrEqual(3);

		// Verify queue counts
		expect(scheduler.queueCounts.total).toBe(2);
	});

	test("should provide timer state inspection", async () => {
		const queue = new HoldMyTask({
			smartScheduling: true,
			tick: 200
		});

		// Add a task to activate timers
		queue.enqueue(async () => "test", { start: 300 });

		const timers = queue.inspectTimers();

		// Verify structure
		expect(timers).toHaveProperty("schedulerInterval");
		expect(timers).toHaveProperty("schedulerTimeout");
		expect(timers).toHaveProperty("nextScheduledRun");
		expect(timers).toHaveProperty("nextRunIn");
		expect(timers).toHaveProperty("smartScheduling");
		expect(timers).toHaveProperty("tickInterval");

		// Verify timer objects
		expect(timers.schedulerInterval.type).toBe("interval");
		expect(timers.schedulerTimeout.type).toBe("timeout");

		// Verify configuration values
		expect(timers.smartScheduling).toBe(true);
		expect(timers.tickInterval).toBe(200);

		// At least one timer should be active when tasks are pending
		const hasActiveTimer = timers.schedulerInterval.active || timers.schedulerTimeout.active;
		expect(hasActiveTimer).toBe(true);
	});

	test("should provide debugLog output without errors", async () => {
		const queue = new HoldMyTask({ concurrency: 2 });

		// Add test tasks
		queue.enqueue(async () => "task1", {
			priority: 1,
			metadata: { test: "data" }
		});
		queue.enqueue(async () => "task2", {
			coalescingKey: "test-group",
			metadata: { group: "test" }
		});

		// Capture console output
		const originalLog = console.log;
		let logOutput = [];
		console.log = (...args) => {
			logOutput.push(args.join(" "));
		};

		try {
			// Test basic debug log
			queue.debugLog();
			expect(logOutput.length).toBeGreaterThan(0);
			expect(logOutput.join("\n")).toContain("HoldMyTask Debug Information");

			// Reset output
			logOutput = [];

			// Test detailed debug log
			queue.debugLog(true);
			expect(logOutput.length).toBeGreaterThan(0);
			expect(logOutput.join("\n")).toContain("Detailed Task Information");
		} finally {
			// Restore console.log
			console.log = originalLog;
		}
	});

	test("should handle empty queue inspection", async () => {
		const queue = new HoldMyTask();

		const state = queue.inspect();
		expect(state.totals.totalTasks).toBe(0);
		expect(state.queues.pending.count).toBe(0);
		expect(state.queues.ready.count).toBe(0);
		expect(state.queues.running.count).toBe(0);

		const tasks = queue.inspectTasks();
		expect(tasks.total).toBe(0);
		expect(tasks.pending).toHaveLength(0);
		expect(tasks.ready).toHaveLength(0);
		expect(tasks.running).toHaveLength(0);

		const scheduler = queue.inspectScheduler();
		expect(scheduler.queueCounts.total).toBe(0);
		expect(scheduler.nextTask).toBeNull();

		// Debug log should work with empty queue
		const originalLog = console.log;
		let logCalled = false;
		console.log = () => {
			logCalled = true;
		};

		try {
			queue.debugLog();
			expect(logCalled).toBe(true);
		} finally {
			console.log = originalLog;
		}
	});
});
