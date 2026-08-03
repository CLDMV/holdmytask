import { test, expect, describe } from "vitest";
import { HoldMyTask } from "../src/hold-my-task.mjs";

describe("Per-Priority Concurrency Limits", () => {
	test("should respect per-priority concurrency limits", async () => {
		const queue = new HoldMyTask({
			concurrency: 10, // Global limit: high to avoid conflicts
			priorities: {
				1: { concurrency: 1 }, // Critical: only 1 at a time
				2: { concurrency: 2 }, // Important: up to 2 at a time
				3: { concurrency: 3 } // Background: up to 3 at a time
			}
		});

		let priority1Running = 0;
		let priority2Running = 0;
		let priority3Running = 0;
		let maxPriority1 = 0;
		let maxPriority2 = 0;
		let maxPriority3 = 0;

		const tasks = [];

		// Add multiple tasks for each priority
		for (let i = 0; i < 5; i++) {
			// Priority 1 tasks (should only run 1 at a time)
			tasks.push(
				queue.enqueue(
					async () => {
						priority1Running++;
						maxPriority1 = Math.max(maxPriority1, priority1Running);
						await new Promise((resolve) => setTimeout(resolve, 100));
						priority1Running--;
						return `p1-task-${i}`;
					},
					{ priority: 1 }
				)
			);

			// Priority 2 tasks (should only run 2 at a time)
			tasks.push(
				queue.enqueue(
					async () => {
						priority2Running++;
						maxPriority2 = Math.max(maxPriority2, priority2Running);
						await new Promise((resolve) => setTimeout(resolve, 100));
						priority2Running--;
						return `p2-task-${i}`;
					},
					{ priority: 2 }
				)
			);

			// Priority 3 tasks (should only run 3 at a time)
			tasks.push(
				queue.enqueue(
					async () => {
						priority3Running++;
						maxPriority3 = Math.max(maxPriority3, priority3Running);
						await new Promise((resolve) => setTimeout(resolve, 100));
						priority3Running--;
						return `p3-task-${i}`;
					},
					{ priority: 3 }
				)
			);
		}

		// Wait for all tasks to complete
		await Promise.all(tasks);

		// Verify per-priority concurrency limits were respected
		expect(maxPriority1).toBe(1);
		expect(maxPriority2).toBe(2);
		expect(maxPriority3).toBe(3);

		// Verify all tasks completed successfully
		expect(tasks).toHaveLength(15);
		for (const task of tasks) {
			expect(await task).toMatch(/^p[123]-task-[0-4]$/);
		}
	});

	test("should respect global concurrency limit with per-priority limits", async () => {
		const queue = new HoldMyTask({
			concurrency: 4, // Global limit: only 4 total tasks
			priorities: {
				1: { concurrency: 2 }, // Up to 2 priority 1 tasks
				2: { concurrency: 3 }, // Up to 3 priority 2 tasks
				3: { concurrency: 5 } // Up to 5 priority 3 tasks (but global limit is 4)
			}
		});

		let totalRunning = 0;
		let maxTotalRunning = 0;
		let priority1Running = 0;
		let priority2Running = 0;
		let priority3Running = 0;
		let maxPriority1 = 0;
		let maxPriority2 = 0;
		let maxPriority3 = 0;

		const tasks = [];

		// Add tasks across priorities
		for (let i = 0; i < 3; i++) {
			for (let priority = 1; priority <= 3; priority++) {
				tasks.push(
					queue.enqueue(
						async () => {
							totalRunning++;
							maxTotalRunning = Math.max(maxTotalRunning, totalRunning);

							if (priority === 1) {
								priority1Running++;
								maxPriority1 = Math.max(maxPriority1, priority1Running);
							} else if (priority === 2) {
								priority2Running++;
								maxPriority2 = Math.max(maxPriority2, priority2Running);
							} else {
								priority3Running++;
								maxPriority3 = Math.max(maxPriority3, priority3Running);
							}

							await new Promise((resolve) => setTimeout(resolve, 150));

							totalRunning--;
							if (priority === 1) priority1Running--;
							else if (priority === 2) priority2Running--;
							else priority3Running--;

							return `p${priority}-task-${i}`;
						},
						{ priority }
					)
				);
			}
		}

		await Promise.all(tasks);

		// Global concurrency limit should be respected
		expect(maxTotalRunning).toBeLessThanOrEqual(4);

		// Per-priority limits should be respected
		expect(maxPriority1).toBeLessThanOrEqual(2);
		expect(maxPriority2).toBeLessThanOrEqual(3);
		expect(maxPriority3).toBeLessThanOrEqual(5);
	});

	test("should allow tasks when priority has no concurrency limit set", async () => {
		const queue = new HoldMyTask({
			concurrency: 5,
			priorities: {
				1: { concurrency: 1 } // Limited to 1
				// Priority 2 has no limit, should use global concurrency
			}
		});

		let priority1Running = 0;
		let priority2Running = 0;
		let maxPriority1 = 0;
		let maxPriority2 = 0;

		const tasks = [];

		// Add tasks for both priorities
		for (let i = 0; i < 4; i++) {
			tasks.push(
				queue.enqueue(
					async () => {
						priority1Running++;
						maxPriority1 = Math.max(maxPriority1, priority1Running);
						await new Promise((resolve) => setTimeout(resolve, 100));
						priority1Running--;
						return `p1-${i}`;
					},
					{ priority: 1 }
				)
			);

			tasks.push(
				queue.enqueue(
					async () => {
						priority2Running++;
						maxPriority2 = Math.max(maxPriority2, priority2Running);
						await new Promise((resolve) => setTimeout(resolve, 100));
						priority2Running--;
						return `p2-${i}`;
					},
					{ priority: 2 }
				)
			);
		}

		await Promise.all(tasks);

		// Priority 1 should be limited to 1
		expect(maxPriority1).toBe(1);

		// Priority 2 should be able to run more (up to global limit)
		expect(maxPriority2).toBeGreaterThan(1);
	});

	test("should handle priority concurrency limits with task scheduling", async () => {
		const queue = new HoldMyTask({
			concurrency: 6,
			priorities: {
				1: { concurrency: 1 }, // High priority, but limited
				2: { concurrency: 2 }, // Medium priority
				3: { concurrency: 4 } // Low priority, but more concurrent
			}
		});

		const completionOrder = [];
		const tasks = [];

		// Add high priority task (will start first)
		tasks.push(
			queue.enqueue(
				async () => {
					await new Promise((resolve) => setTimeout(resolve, 200));
					completionOrder.push("high-1");
					return "high-1";
				},
				{ priority: 1 }
			)
		);

		// Add another high priority task (should wait due to concurrency: 1)
		tasks.push(
			queue.enqueue(
				async () => {
					await new Promise((resolve) => setTimeout(resolve, 50));
					completionOrder.push("high-2");
					return "high-2";
				},
				{ priority: 1 }
			)
		);

		// Add medium priority tasks (should start while high priority is running)
		tasks.push(
			queue.enqueue(
				async () => {
					await new Promise((resolve) => setTimeout(resolve, 100));
					completionOrder.push("medium-1");
					return "medium-1";
				},
				{ priority: 2 }
			)
		);

		tasks.push(
			queue.enqueue(
				async () => {
					await new Promise((resolve) => setTimeout(resolve, 100));
					completionOrder.push("medium-2");
					return "medium-2";
				},
				{ priority: 2 }
			)
		);

		// Add low priority tasks
		tasks.push(
			queue.enqueue(
				async () => {
					await new Promise((resolve) => setTimeout(resolve, 75));
					completionOrder.push("low-1");
					return "low-1";
				},
				{ priority: 3 }
			)
		);

		tasks.push(
			queue.enqueue(
				async () => {
					await new Promise((resolve) => setTimeout(resolve, 75));
					completionOrder.push("low-2");
					return "low-2";
				},
				{ priority: 3 }
			)
		);

		await Promise.all(tasks);

		// Verify tasks completed
		expect(completionOrder).toHaveLength(6);

		// Verify that medium and low priority tasks could run concurrently
		// while high priority was limited to 1
		expect(completionOrder.includes("medium-1")).toBe(true);
		expect(completionOrder.includes("medium-2")).toBe(true);
		expect(completionOrder.includes("low-1")).toBe(true);
		expect(completionOrder.includes("low-2")).toBe(true);
	});

	test("should show per-priority concurrency in inspection methods", async () => {
		const queue = new HoldMyTask({
			concurrency: 8,
			priorities: {
				1: { concurrency: 1 },
				2: { concurrency: 3 },
				3: { concurrency: 2 }
			}
		});

		// Add some long-running tasks
		const tasks = [];
		for (let priority = 1; priority <= 3; priority++) {
			for (let i = 0; i < 2; i++) {
				tasks.push(
					queue.enqueue(
						async () => {
							await new Promise((resolve) => setTimeout(resolve, 500));
							return `p${priority}-${i}`;
						},
						{ priority }
					)
				);
			}
		}

		// Wait a moment for tasks to start
		await new Promise((resolve) => setTimeout(resolve, 50));

		// Test inspect method
		const inspection = queue.inspect();
		expect(inspection.scheduler.priorityConcurrency).toBeDefined();

		// Should show running tasks for priority 1 (limited to 1)
		expect(inspection.scheduler.priorityConcurrency[1]).toEqual({
			running: 1,
			limit: 1,
			available: 0
		});

		// Should show running tasks for priority 2 (can run up to 3)
		expect(inspection.scheduler.priorityConcurrency[2]).toEqual({
			running: 2,
			limit: 3,
			available: 1
		});

		// Should show running tasks for priority 3 (can run up to 2)
		expect(inspection.scheduler.priorityConcurrency[3]).toEqual({
			running: 2,
			limit: 2,
			available: 0
		});

		// Test inspectScheduler method
		const scheduler = queue.inspectScheduler();
		expect(scheduler.priorityConcurrency).toBeDefined();
		expect(Object.keys(scheduler.priorityConcurrency)).toEqual(["1", "2", "3"]);

		// Cleanup
		await Promise.all(tasks);
	});

	test("should handle edge case with zero concurrency limit", async () => {
		const queue = new HoldMyTask({
			concurrency: 5,
			priorities: {
				1: { concurrency: 0 }, // No tasks allowed for this priority
				2: { concurrency: 2 } // Normal limit
			}
		});

		const results = [];

		// Add priority 1 task (should never start)
		const p1Task = queue.enqueue(
			async () => {
				results.push("priority-1-executed");
				return "p1";
			},
			{ priority: 1 }
		);

		// Add priority 2 tasks (should execute normally)
		const p2Task1 = queue.enqueue(
			async () => {
				results.push("priority-2-task-1");
				return "p2-1";
			},
			{ priority: 2 }
		);

		const p2Task2 = queue.enqueue(
			async () => {
				results.push("priority-2-task-2");
				return "p2-2";
			},
			{ priority: 2 }
		);

		// Wait a bit to see what executes
		await new Promise((resolve) => setTimeout(resolve, 100));

		// Priority 2 tasks should have executed
		expect(results).toContain("priority-2-task-1");
		expect(results).toContain("priority-2-task-2");

		// Priority 1 task should not have executed
		expect(results).not.toContain("priority-1-executed");

		// Check that priority 1 task is still pending
		const inspection = queue.inspect();
		const priority1Tasks = inspection.queues.ready.tasks.filter((t) => t.priority === 1);
		expect(priority1Tasks).toHaveLength(1);

		// Clean up by canceling the stuck task
		await queue.cancel(await p1Task.id);
		await Promise.all([p2Task1, p2Task2]);
	});
});
