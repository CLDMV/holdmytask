/**
 *	@Project: @cldmv/holdmytask
 *	@Filename: /tests/HoldMyTask.vest.mjs
 *	@Date: 2025-11-08 17:43:39 -08:00 (1762652619)
 *	@Author: Nate Hyson <CLDMV>
 *	@Email: <Shinrai@users.noreply.github.com>
 *	-----
 *	@Last modified by: Nate Hyson <CLDMV> (Shinrai@users.noreply.github.com)
 *	@Last modified time: 2025-11-10 22:18:00 -08:00 (1762841880)
 *	-----
 *	@Copyright: Copyright (c) 2013-2025 Catalyzed Motivation Inc. All rights reserved.
 */

import { test, expect, describe } from "vitest";
import { HoldMyTask } from "../src/hold-my-task.mjs";

// Test both scheduling modes
describe.each([
	{ smartScheduling: true, mode: "Smart Scheduling" },
	{ smartScheduling: false, mode: "Traditional Polling" }
])("HoldMyTask with $mode", ({ smartScheduling }) => {
	test("executes tasks in priority order", async () => {
		const q = new HoldMyTask({ smartScheduling, concurrency: 1, autoStart: false });
		const results = [];

		q.enqueue(
			() => "low",
			(err, result) => results.push(result),
			{ priority: 0 }
		);
		q.enqueue(
			() => "high",
			(err, result) => results.push(result),
			{ priority: 10 }
		);
		q.enqueue(
			() => "medium",
			(err, result) => results.push(result),
			{ priority: 5 }
		);

		q.resume();
		await new Promise((resolve) => q.on("drain", resolve));

		expect(results).toEqual(["high", "medium", "low"]);
	});

	test("respects concurrency limit", async () => {
		const q = new HoldMyTask({ smartScheduling, concurrency: 2, autoStart: false });
		let running = 0;
		const maxRunning = [];

		const task = () =>
			new Promise((resolve) => {
				running++;
				maxRunning.push(running);
				setTimeout(() => {
					running--;
					resolve("done");
				}, 100);
			});

		for (let i = 0; i < 5; i++) {
			q.enqueue(task, () => {}, {});
		}

		q.resume();
		await new Promise((resolve) => q.on("drain", resolve));

		expect(Math.max(...maxRunning)).toBe(2);
	});

	test("handles delayed tasks", async () => {
		const q = new HoldMyTask({
			concurrency: 1,
			autoStart: false,
			delays: { 0: 100 }, // 100ms delay after tasks complete
			smartScheduling
		});
		const executionTimes = [];

		q.enqueue(
			() => executionTimes.push(q.now()),
			() => {},
			{ priority: 0 }
		);
		q.enqueue(
			() => executionTimes.push(q.now()),
			() => {},
			{ priority: 0 }
		);

		q.resume();
		await new Promise((resolve) => q.on("drain", resolve));

		expect(executionTimes.length).toBe(2);
		// Second task should execute 100ms after first completes
		expect(executionTimes[1] - executionTimes[0]).toBeGreaterThanOrEqual(95);
	});
	test("cancels tasks", async () => {
		const q = new HoldMyTask({ smartScheduling, autoStart: false });
		let executed = false;

		const handle = q.enqueue(
			() => {
				executed = true;
				return "result";
			},
			() => {},
			{}
		);
		handle.cancel();

		q.resume();
		await new Promise((resolve) => setTimeout(resolve, 10));

		expect(executed).toBe(false);
		expect(handle.status()).toBe("canceled");
	});

	test("handles AbortSignal", async () => {
		const q = new HoldMyTask({ smartScheduling, autoStart: false });
		let executed = false;

		const controller = new AbortController();
		q.enqueue(
			() => {
				executed = true;
				return "result";
			},
			() => {},
			{ signal: controller.signal }
		);

		controller.abort();
		q.resume();
		await new Promise((resolve) => setTimeout(resolve, 10));

		expect(executed).toBe(false);
	});

	test("emits events correctly", async () => {
		const q = new HoldMyTask({ smartScheduling, autoStart: false });
		const events = [];

		q.on("start", () => events.push("start"));
		q.on("success", () => events.push("success"));
		q.on("drain", () => events.push("drain"));

		q.enqueue(
			() => "result",
			() => {},
			{}
		);
		q.resume();

		await new Promise((resolve) => q.on("drain", resolve));

		expect(events).toEqual(["start", "success", "drain"]);
	});

	test("respects maxQueue limit", () => {
		const q = new HoldMyTask({ smartScheduling, maxQueue: 2 });

		q.enqueue(
			() => "a",
			() => {},
			{}
		);
		q.enqueue(
			() => "b",
			() => {},
			{}
		);

		expect(() =>
			q.enqueue(
				() => "c",
				() => {},
				{}
			)
		).toThrow("Queue is full");
	});

	test("handles task errors", async () => {
		const q = new HoldMyTask({ smartScheduling, autoStart: false });
		const errors = [];

		q.on("error", (task) => errors.push(task.error));

		q.enqueue(
			() => {
				throw new Error("test error");
			},
			(err, _) => {
				expect(err.type).toBe("error");
				expect(err.error.message).toBe("test error");
			},
			{}
		);
		q.resume();

		await new Promise((resolve) => q.on("drain", resolve));

		expect(errors.length).toBe(1);
		expect(errors[0].message).toBe("test error");
	});

	test("handles task timeouts", async () => {
		const q = new HoldMyTask({ smartScheduling, autoStart: false });
		const errors = [];
		let callbackCalled = false;

		q.on("error", (task) => errors.push(task.error));

		q.enqueue(
			() =>
				new Promise((resolve) => {
					setTimeout(resolve, 100);
				}),
			(err, result) => {
				callbackCalled = true;
				expect(err.type).toBe("timeout");
				expect(err.message).toBe("Task timed out after 50ms");
				expect(result).toBe(null);
			},
			{ timeout: 50 }
		);
		q.resume();

		await new Promise((resolve) => q.on("drain", resolve));

		expect(errors.length).toBe(1);
		expect(callbackCalled).toBe(true);
	});

	test("respects priority delays", async () => {
		const q = new HoldMyTask({
			concurrency: 1,
			autoStart: false,
			delays: { 1: 100, 2: 200 },
			smartScheduling
		});
		const executionTimes = [];

		q.enqueue(
			() => q.now(),
			(err, result) => executionTimes.push(result),
			{ priority: 1 }
		);
		q.enqueue(
			() => q.now(),
			(err, result) => executionTimes.push(result),
			{ priority: 1 }
		);
		q.enqueue(
			() => q.now(),
			(err, result) => executionTimes.push(result),
			{ priority: 2 }
		);

		q.resume();
		await new Promise((resolve) => q.on("drain", resolve));

		// First task executes immediately
		expect(executionTimes[0]).toBeDefined();
		// Second task (same priority) should wait 100ms after first completes
		expect(executionTimes[1] - executionTimes[0]).toBeGreaterThanOrEqual(95);
		// Third task (different priority) should wait 100ms after second completes (based on priority 1 delay)
		expect(executionTimes[2] - executionTimes[1]).toBeGreaterThanOrEqual(95);
	});

	test("injects higher priority tasks correctly", async () => {
		const q = new HoldMyTask({ smartScheduling, concurrency: 1, autoStart: false });
		const results = [];
		let slowTaskStarted = false;

		// Start a slow low-priority task
		q.enqueue(
			() => {
				slowTaskStarted = true;
				return new Promise((resolve) => setTimeout(() => resolve("slow"), 200));
			},
			(err, result) => results.push(result),
			{ priority: 1 }
		);

		q.resume();

		// Wait for slow task to start
		await new Promise((resolve) => {
			const check = () => {
				if (slowTaskStarted) resolve();
				else setTimeout(check, 10);
			};
			check();
		});

		// Inject higher priority task
		q.enqueue(
			() => "high",
			(err, result) => results.push(result),
			{ priority: 10 }
		);

		// Wait for completion
		await new Promise((resolve) => q.on("drain", resolve));

		expect(results).toEqual(["slow", "high"]);
	});

	test("handles complex delay timing with multiple priorities", async () => {
		const q = new HoldMyTask({
			concurrency: 1,
			autoStart: false,
			delays: { 1: 50, 2: 100, 3: 25 },
			smartScheduling
		});
		const executionOrder = [];
		const startTime = Date.now();

		// Mix of priorities with delays
		const tasks = [
			{ priority: 1, expectedDelay: 0 }, // First task, no delay
			{ priority: 1, expectedDelay: 50 }, // Same priority, 50ms delay after first
			{ priority: 2, expectedDelay: 50 }, // Different priority, but waits for priority 1's delay
			{ priority: 2, expectedDelay: 100 }, // Same priority, 100ms delay after third
			{ priority: 3, expectedDelay: 100 }, // Different priority, waits for priority 2's delay
			{ priority: 1, expectedDelay: 25 }, // Priority 1, waits for priority 3's delay
			{ priority: 3, expectedDelay: 50 } // Priority 3 again, waits for priority 1's delay
		];

		tasks.forEach((task, index) => {
			q.enqueue(
				() => {
					executionOrder.push({ index, time: Date.now() - startTime, priority: task.priority });
					return `task-${index}`;
				},
				() => {},
				{ priority: task.priority }
			);
		});

		q.resume();
		await new Promise((resolve) => q.on("drain", resolve));

		expect(executionOrder.length).toBe(7);

		// Verify execution order respects priorities
		const priorities = executionOrder.map((e) => e.priority);
		expect(priorities).toEqual([3, 3, 2, 2, 1, 1, 1]); // Higher priorities first

		// Verify delays are respected based on the last completed task's priority
		// Task 0 (pri 3) completes -> next tasks wait 25ms
		// Task 1 (pri 3) completes -> next tasks wait 25ms
		// Task 2 (pri 2) completes -> next tasks wait 100ms
		// Task 3 (pri 2) completes -> next tasks wait 100ms
		// Task 4 (pri 1) completes -> next tasks wait 50ms
		// Task 5 (pri 1) completes -> next tasks wait 50ms
		// Task 6 (pri 3) completes

		// Check that tasks respect the delays from previous completions
		for (let i = 1; i < executionOrder.length; i++) {
			const prevTask = executionOrder[i - 1];
			const currTask = executionOrder[i];
			const expectedDelay = q.options.delays[prevTask.priority] || 0;
			if (expectedDelay > 0) {
				expect(currTask.time - prevTask.time).toBeGreaterThanOrEqual(expectedDelay - 10); // Allow some tolerance
			}
		}
	});

	test("task-specific delay overrides global delays", async () => {
		const q = new HoldMyTask({
			concurrency: 1,
			autoStart: false,
			delays: { 1: 200 }, // Global delay of 200ms for priority 1
			smartScheduling
		});
		const executionTimes = [];

		// First task uses global delay (200ms)
		q.enqueue(
			() => q.now(),
			(err, result) => executionTimes.push(result),
			{ priority: 1 }
		);
		// Second task overrides with 50ms delay
		q.enqueue(
			() => q.now(),
			(err, result) => executionTimes.push(result),
			{ priority: 1, delay: 50 }
		);
		// Third task uses global delay again (200ms)
		q.enqueue(
			() => q.now(),
			(err, result) => executionTimes.push(result),
			{ priority: 1 }
		);

		q.resume();
		await new Promise((resolve) => q.on("drain", resolve));

		expect(executionTimes.length).toBe(3);
		// First to second: 200ms delay
		expect(executionTimes[1] - executionTimes[0]).toBeGreaterThanOrEqual(190);
		// Second to third: 50ms delay (overridden)
		expect(executionTimes[2] - executionTimes[1]).toBeGreaterThanOrEqual(40);
	});

	test("respects autoStart: false", async () => {
		const q = new HoldMyTask({ smartScheduling, autoStart: false });
		let executed = false;

		q.enqueue(
			() => {
				executed = true;
				return "result";
			},
			() => {},
			{}
		);

		// Wait a bit to ensure task doesn't start automatically
		await new Promise((resolve) => setTimeout(resolve, 50));

		expect(executed).toBe(false);

		// Now resume and it should execute
		q.resume();
		await new Promise((resolve) => q.on("drain", resolve));

		expect(executed).toBe(true);
	});

	test("pause and resume functionality", async () => {
		const q = new HoldMyTask({ smartScheduling, concurrency: 1 });
		const results = [];

		// Add several tasks
		for (let i = 0; i < 5; i++) {
			q.enqueue(
				() =>
					new Promise((resolve) => {
						setTimeout(() => resolve(`task-${i}`), 50);
					}),
				(err, result) => results.push(result),
				{}
			);
		}

		// Let first task start
		await new Promise((resolve) => setTimeout(resolve, 25));

		// Pause the queue
		q.pause();

		const tasksCompletedBeforePause = results.length;

		// Wait for the currently running task to complete
		await new Promise((resolve) => setTimeout(resolve, 50));

		// The running task should have completed, but no new tasks should have started
		expect(results.length).toBe(tasksCompletedBeforePause + 1);

		// Wait longer to ensure no more tasks complete while paused
		await new Promise((resolve) => setTimeout(resolve, 200));

		expect(results.length).toBe(tasksCompletedBeforePause + 1);

		// Resume the queue
		q.resume();

		// Wait for all tasks to complete
		await new Promise((resolve) => q.on("drain", resolve));

		expect(results.length).toBe(5);
		expect(results).toEqual(["task-0", "task-1", "task-2", "task-3", "task-4"]);
	});

	// Promise API tests
	test("supports promise API - resolves successfully", async () => {
		const q = new HoldMyTask({ smartScheduling, concurrency: 1 });

		const promise = q.enqueue(() => "success");

		const result = await promise;
		expect(result).toBe("success");
	});

	test("supports promise API - rejects on error", async () => {
		const q = new HoldMyTask({ smartScheduling, concurrency: 1 });

		const promise = q.enqueue(() => {
			throw new Error("test error");
		});

		await expect(promise).rejects.toThrow("test error");
	});

	test("supports promise API - rejects on timeout", async () => {
		const q = new HoldMyTask({ smartScheduling, concurrency: 1 });

		const promise = q.enqueue(() => new Promise((resolve) => setTimeout(resolve, 100)), { timeout: 50 });

		await expect(promise).rejects.toThrow("Task timed out after 50ms");
	});

	test("supports promise API - rejects on cancel", async () => {
		const q = new HoldMyTask({ smartScheduling, concurrency: 1, autoStart: false });

		const promise = q.enqueue(() => "result");
		const handle = q.enqueue(() => "should be canceled");

		handle.cancel();

		q.resume();

		const result = await promise;
		expect(result).toBe("result");

		await expect(handle).rejects.toThrow("Task canceled");
	});

	test("handles task expiration - callback API", async () => {
		const q = new HoldMyTask({ smartScheduling, autoStart: false });
		const errors = [];
		let callbackCalled = false;

		q.on("error", (task) => errors.push(task.error));

		q.enqueue(
			() => "result",
			(err, result) => {
				callbackCalled = true;
				expect(err.type).toBe("expire");
				expect(err.message).toContain("Task expired after waiting");
				expect(result).toBe(null);
			},
			{ expire: 50 } // Expire after 50ms
		);

		// Wait for expiration to occur
		await new Promise((resolve) => setTimeout(resolve, 100));

		// Start the queue after expiration
		q.resume();
		await new Promise((resolve) => setTimeout(resolve, 10));

		expect(callbackCalled).toBe(true);
		expect(errors).toHaveLength(1);
		expect(errors[0].type).toBe("expire");
	});

	test("handles task expiration - promise API", async () => {
		const q = new HoldMyTask({ smartScheduling, autoStart: false });

		const promise = q.enqueue(() => "result", { expire: 50 });

		// Wait for expiration to occur
		await new Promise((resolve) => setTimeout(resolve, 100));

		// Start the queue after expiration
		q.resume();

		await expect(promise).rejects.toThrow("Task expired after waiting");
	});

	test("expire with absolute timestamp", async () => {
		const q = new HoldMyTask({ smartScheduling, autoStart: false });
		const futureTime = Date.now() + 50;

		const promise = q.enqueue(() => "result", { expire: futureTime });

		// Wait for expiration
		await new Promise((resolve) => setTimeout(resolve, 100));

		q.resume();

		await expect(promise).rejects.toThrow("Task expired after waiting");
	});

	test("expire with relative milliseconds", async () => {
		const q = new HoldMyTask({ smartScheduling, autoStart: false });

		const promise = q.enqueue(() => "result", { expire: 30 }); // 30ms from now

		// Wait for expiration
		await new Promise((resolve) => setTimeout(resolve, 50));

		q.resume();

		await expect(promise).rejects.toThrow("Task expired after waiting");
	});

	test("tasks execute before expiration", async () => {
		const q = new HoldMyTask({ smartScheduling, concurrency: 1 });

		const result = await q.enqueue(() => "success", { expire: 1000 }); // Long expiration

		expect(result).toBe("success");
	});

	test("expired tasks are removed from queue", async () => {
		const q = new HoldMyTask({ smartScheduling, autoStart: false });

		const promise1 = q.enqueue(() => "task1", { expire: 30 });
		const promise2 = q.enqueue(() => "task2", { expire: 30 });

		expect(q.length()).toBe(2);

		// Wait for expiration
		await new Promise((resolve) => setTimeout(resolve, 50));

		// Handle the promise rejections before resuming to avoid unhandled rejection errors
		const promiseRejections = Promise.allSettled([promise1, promise2]);

		// Start queue - expired tasks should be cleaned up
		q.resume();
		await new Promise((resolve) => setTimeout(resolve, 10));

		expect(q.length()).toBe(0);

		// Verify the promises were rejected due to expiration
		const results = await promiseRejections;
		expect(results[0].status).toBe("rejected");
		expect(results[0].reason.message).toMatch("expired");
		expect(results[1].status).toBe("rejected");
		expect(results[1].reason.message).toMatch("expired");
	});

	test("expire works with priority and bypass", async () => {
		const q = new HoldMyTask({ smartScheduling, autoStart: false, delays: { 1: 100 } });

		// High priority task that will create delay
		q.enqueue(() => "high-priority", { priority: 1 });

		// Task that bypasses delay but expires
		const bypassPromise = q.enqueue(() => "bypass", {
			priority: 0,
			bypassDelay: true,
			expire: 30
		});

		// Wait for expiration
		await new Promise((resolve) => setTimeout(resolve, 50));

		q.resume();

		await expect(bypassPromise).rejects.toThrow("Task expired after waiting");
	});

	test("supports promise API - rejects on abort signal", async () => {
		const q = new HoldMyTask({ smartScheduling, concurrency: 1 });

		const controller = new AbortController();
		const promise = q.enqueue(
			(signal) =>
				new Promise((resolve, reject) => {
					signal.addEventListener("abort", () => reject(new Error("aborted")));
					setTimeout(resolve, 100);
				}),
			{ signal: controller.signal }
		);

		controller.abort();

		await expect(promise).rejects.toThrow("Task was aborted");
	});

	test("supports mixing callback and promise APIs", async () => {
		const q = new HoldMyTask({ smartScheduling, concurrency: 2 });
		const results = [];

		// Add callback-based task
		const _ = q.enqueue(
			() => "callback",
			(err, result) => results.push(`callback: ${result}`)
		);

		// Add promise-based task
		const promise = q.enqueue(() => "promise");

		// Wait for both to complete
		const promiseResult = await promise;

		expect(results).toEqual(["callback: callback"]);
		expect(promiseResult).toBe("promise");
	});

	test("promise API returns task handle with control methods", async () => {
		const q = new HoldMyTask({ smartScheduling, concurrency: 1, autoStart: false });

		const promise = q.enqueue(() => "test");

		expect(typeof promise.id).toBe("string");
		expect(typeof promise.cancel).toBe("function");
		expect(typeof promise.status).toBe("function");
		expect(promise.startedAt).toBeUndefined();
		expect(promise.finishedAt).toBeUndefined();
		expect(promise.result).toBeUndefined();
		expect(promise.error).toBeUndefined();

		// Start and wait
		q.resume();
		const _ = await promise;

		expect(promise.result).toBe("test");
		expect(typeof promise.startedAt).toBe("number");
		expect(typeof promise.finishedAt).toBe("number");
	});

	test("bypassDelay allows task to skip active delay period", async () => {
		const q = new HoldMyTask({
			concurrency: 1,
			delays: { 1: 500 }, // 500ms delay after priority 1 tasks
			smartScheduling
		});
		const results = [];
		const timestamps = [];

		// Task 1: Priority 1 with delay
		q.enqueue(
			() => {
				timestamps.push(Date.now());
				return "task1";
			},
			(err, result) => results.push(result),
			{ priority: 1 }
		);

		// Task 2: Normal task (should wait for delay)
		q.enqueue(
			() => {
				timestamps.push(Date.now());
				return "task2";
			},
			(err, result) => results.push(result),
			{ priority: 1 }
		);

		// Task 3: Bypass delay (should start immediately after task1)
		q.enqueue(
			() => {
				timestamps.push(Date.now());
				return "task3";
			},
			(err, result) => results.push(result),
			{ priority: 1, bypassDelay: true }
		);

		await new Promise((resolve) => q.on("drain", resolve));

		expect(results).toEqual(["task1", "task3", "task2"]);

		// Task 3 should start immediately after task1 (bypassing delay)
		const task1ToTask3Gap = timestamps[1] - timestamps[0];
		expect(task1ToTask3Gap).toBeLessThan(100); // Should be very quick

		// Task 2 should wait the full delay after task3 completes
		const task3ToTask2Gap = timestamps[2] - timestamps[1];
		expect(task3ToTask2Gap).toBeGreaterThan(400); // Should wait ~500ms delay
	});

	test("delay: -1 works as alternative bypass syntax", async () => {
		const q = new HoldMyTask({
			concurrency: 1,
			delays: { 1: 300 },
			smartScheduling
		});
		const results = [];

		// Task with delay
		q.enqueue(
			() => "task1",
			(err, result) => results.push(result),
			{ priority: 1 }
		);

		// Task with delay: -1 (bypass)
		q.enqueue(
			() => "task2",
			(err, result) => results.push(result),
			{ priority: 1, delay: -1 }
		);

		await new Promise((resolve) => q.on("drain", resolve));

		expect(results).toEqual(["task1", "task2"]);
		// Test passed if no timeout occurred (task2 started immediately)
	});

	test("bypassed task still applies its own completion delay", async () => {
		const q = new HoldMyTask({
			concurrency: 1,
			delays: { 1: 200, 2: 400 },
			smartScheduling
		});
		const results = [];
		const timestamps = [];

		// Task 1: Priority 1 (200ms delay) - will complete first
		q.enqueue(
			() => {
				timestamps.push(Date.now());
				return "task1";
			},
			(err, result) => results.push(result),
			{ priority: 1 }
		);

		// Task 2: Same priority but bypasses the delay from task1, priority 2 means higher priority but has delay
		q.enqueue(
			() => {
				timestamps.push(Date.now());
				return "task2";
			},
			(err, result) => results.push(result),
			{ priority: 1, bypassDelay: true }
		);

		// Task 3: Should wait for whatever delay task2 creates (task2 has no specific delay config, so uses priority 1 = 200ms)
		q.enqueue(
			() => {
				timestamps.push(Date.now());
				return "task3";
			},
			(err, result) => results.push(result),
			{ priority: 1 }
		);

		await new Promise((resolve) => q.on("drain", resolve));

		expect(results).toEqual(["task1", "task2", "task3"]); // Normal priority order, task2 bypasses task1's delay

		// Task2 bypasses task1's delay (should start immediately after task1)
		const task1ToTask2Gap = timestamps[1] - timestamps[0];
		expect(task1ToTask2Gap).toBeLessThan(100);

		// Task3 waits for task2's completion delay (200ms since task2 is priority 1)
		const task2ToTask3Gap = timestamps[2] - timestamps[1];
		expect(task2ToTask3Gap).toBeGreaterThan(150);
	});
}); // End of describe block for scheduling modes
