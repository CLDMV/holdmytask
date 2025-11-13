/**
 * @Project: @cldmv/holdmytask
 * @Filename: /tests/CoalescingTasks.vest.mjs
 * @Date: 2025-11-11
 * @Author: Assistant
 * -----
 * @Copyright: Copyright (c) 2013-2025 Catalyzed Motivation Inc. All rights reserved.
 */

import { HoldMyTask } from "../src/hold-my-task.mjs";
import { describe, expect, test } from "vitest";

// Helper function to create a delay
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Test both scheduling modes
describe.each([
	{ smartScheduling: true, mode: "Smart Scheduling" },
	{ smartScheduling: false, mode: "Traditional Polling" }
])("Task Coalescing with $mode", ({ smartScheduling }) => {
	test("basic coalescing - multiple tasks with same key become one", async () => {
		const queue = new HoldMyTask({
			smartScheduling,
			concurrency: 1,
			coalescingWindowDuration: 500,
			coalescingMultipleCallbacks: true
		});
		const results = [];
		let taskExecutions = 0;

		const testTask = async () => {
			taskExecutions++;
			await delay(50);
			return `result-${taskExecutions}`;
		};

		// Enqueue multiple tasks with same coalescing key
		queue.enqueue(testTask, (err, result) => results.push({ id: 1, err, result }), {
			coalescingKey: "test-device"
		});

		queue.enqueue(testTask, (err, result) => results.push({ id: 2, err, result }), {
			coalescingKey: "test-device"
		});

		queue.enqueue(testTask, (err, result) => results.push({ id: 3, err, result }), {
			coalescingKey: "test-device"
		});

		// Wait for completion
		await delay(200);

		// Only one task should have executed
		expect(taskExecutions).toBe(1);

		// All callbacks should have been called with same result
		expect(results).toHaveLength(3);
		expect(results[0].result).toBe("result-1");
		expect(results[1].result).toBe("result-1");
		expect(results[2].result).toBe("result-1");

		queue.destroy();
	});

	test("coalescing with single callback mode", async () => {
		const queue = new HoldMyTask({
			smartScheduling,
			concurrency: 1,
			coalescingWindowDuration: 500,
			coalescingMultipleCallbacks: false // Only latest callback
		});
		const results = [];
		let taskExecutions = 0;

		const testTask = async () => {
			taskExecutions++;
			return `result-${taskExecutions}`;
		};

		// Enqueue multiple tasks with same coalescing key
		queue.enqueue(testTask, (err, result) => results.push({ id: 1, err, result }), {
			coalescingKey: "test-device"
		});

		queue.enqueue(testTask, (err, result) => results.push({ id: 2, err, result }), {
			coalescingKey: "test-device"
		});

		queue.enqueue(testTask, (err, result) => results.push({ id: 3, err, result }), {
			coalescingKey: "test-device"
		});

		// Wait for completion
		await delay(200);

		// Only one task should have executed
		expect(taskExecutions).toBe(1);

		// In single callback mode with callback API:
		// - With coalescingResolveAllPromises: true (default), all callbacks get the same result
		expect(results).toHaveLength(3);

		// All should be successful with same result
		const successResults = results.filter((r) => r.result);
		const coalescedResults = results.filter((r) => r.err);

		expect(successResults).toHaveLength(3);
		expect(coalescedResults).toHaveLength(0);
		expect(successResults[0].result).toBe("result-1");
		expect(successResults[1].result).toBe("result-1");
		expect(successResults[2].result).toBe("result-1");

		queue.destroy();
	});

	test("separate coalescing groups for different keys", async () => {
		const queue = new HoldMyTask({
			smartScheduling,
			concurrency: 2,
			coalescingWindowDuration: 500,
			coalescingMultipleCallbacks: true
		});
		const results = [];
		let taskExecutions = 0;

		const testTask = async (deviceId) => {
			taskExecutions++;
			await delay(50);
			return `result-${deviceId}-${taskExecutions}`;
		};

		// Enqueue tasks with different coalescing keys
		queue.enqueue(
			() => testTask("device1"),
			(err, result) => results.push({ device: "device1", err, result }),
			{
				coalescingKey: "device-1"
			}
		);

		queue.enqueue(
			() => testTask("device1"),
			(err, result) => results.push({ device: "device1", err, result }),
			{
				coalescingKey: "device-1"
			}
		);

		queue.enqueue(
			() => testTask("device2"),
			(err, result) => results.push({ device: "device2", err, result }),
			{
				coalescingKey: "device-2"
			}
		);

		queue.enqueue(
			() => testTask("device2"),
			(err, result) => results.push({ device: "device2", err, result }),
			{
				coalescingKey: "device-2"
			}
		);

		// Wait for completion
		await delay(300);

		// Two tasks should have executed (one per device)
		expect(taskExecutions).toBe(2);

		// All callbacks should have been called
		expect(results).toHaveLength(4);

		// Check device1 results
		const device1Results = results.filter((r) => r.device === "device1");
		expect(device1Results).toHaveLength(2);
		expect(device1Results[0].result).toMatch(/result-device1-/);
		expect(device1Results[1].result).toMatch(/result-device1-/);

		// Check device2 results
		const device2Results = results.filter((r) => r.device === "device2");
		expect(device2Results).toHaveLength(2);
		expect(device2Results[0].result).toMatch(/result-device2-/);
		expect(device2Results[1].result).toMatch(/result-device2-/);

		queue.destroy();
	});

	test("multiple coalescing groups per key based on timing", async () => {
		const queue = new HoldMyTask({
			smartScheduling,
			concurrency: 1,
			coalescingWindowDuration: 200,
			coalescingMaxDelay: 300,
			coalescingMultipleCallbacks: true
		});
		const results = [];
		let taskExecutions = 0;

		const testTask = async () => {
			taskExecutions++;
			await delay(50);
			return `result-${taskExecutions}`;
		};

		// First group of tasks
		queue.enqueue(testTask, (err, result) => results.push({ group: "A", err, result }), {
			coalescingKey: "device-status",
			timestamp: Date.now() + 100
		});

		queue.enqueue(testTask, (err, result) => results.push({ group: "A", err, result }), {
			coalescingKey: "device-status",
			timestamp: Date.now() + 150
		});

		// Wait to create separate timing window
		await delay(400);

		// Second group of tasks (outside first group's window)
		queue.enqueue(testTask, (err, result) => results.push({ group: "B", err, result }), {
			coalescingKey: "device-status",
			timestamp: Date.now() + 100
		});

		queue.enqueue(testTask, (err, result) => results.push({ group: "B", err, result }), {
			coalescingKey: "device-status",
			timestamp: Date.now() + 150
		});

		// Wait for all tasks to complete
		await delay(500);

		// Two tasks should have executed (one per group)
		expect(taskExecutions).toBe(2);

		// All callbacks should have been called
		expect(results).toHaveLength(4);

		queue.destroy();
	});

	test("coalescing with promise API", async () => {
		const queue = new HoldMyTask({
			smartScheduling,
			concurrency: 1,
			coalescingWindowDuration: 500,
			coalescingMultipleCallbacks: false // Only one promise resolves
		});
		let taskExecutions = 0;

		const testTask = async () => {
			taskExecutions++;
			await delay(50);
			return `result-${taskExecutions}`;
		};

		// Enqueue multiple tasks with same coalescing key using promise API
		const promise1 = queue.enqueue(testTask, { coalescingKey: "test-device" });
		const promise2 = queue.enqueue(testTask, { coalescingKey: "test-device" });
		const promise3 = queue.enqueue(testTask, { coalescingKey: "test-device" });

		// Wait for promises - with coalescingResolveAllPromises: true (default), all should resolve with same result
		const results = await Promise.allSettled([promise1, promise2, promise3]);

		// Only one task should have executed
		expect(taskExecutions).toBe(1);

		// All promises should have resolved with the same result
		const fulfilled = results.filter((r) => r.status === "fulfilled");
		const rejected = results.filter((r) => r.status === "rejected");

		expect(fulfilled).toHaveLength(3);
		expect(rejected).toHaveLength(0);
		expect(fulfilled[0].value).toBe("result-1");
		expect(fulfilled[1].value).toBe("result-1");
		expect(fulfilled[2].value).toBe("result-1");

		queue.destroy();
	});

	test("coalescing with coalescingResolveAllPromises: false (reject behavior)", async () => {
		const queue = new HoldMyTask({
			smartScheduling,
			concurrency: 1,
			coalescingWindowDuration: 500,
			coalescingMultipleCallbacks: false,
			coalescingResolveAllPromises: false // Explicitly use reject behavior
		});
		let taskExecutions = 0;

		const testTask = async () => {
			taskExecutions++;
			await delay(50);
			return `result-${taskExecutions}`;
		};

		// Enqueue multiple tasks with same coalescing key using promise API
		const promise1 = queue.enqueue(testTask, { coalescingKey: "test-device" });
		const promise2 = queue.enqueue(testTask, { coalescingKey: "test-device" });
		const promise3 = queue.enqueue(testTask, { coalescingKey: "test-device" });

		// Wait for promises - only latest should resolve, others should reject
		const results = await Promise.allSettled([promise1, promise2, promise3]);

		// Only one task should have executed
		expect(taskExecutions).toBe(1);

		// Only one promise should have resolved (the latest one)
		const fulfilled = results.filter((r) => r.status === "fulfilled");
		const rejected = results.filter((r) => r.status === "rejected");

		expect(fulfilled).toHaveLength(1);
		expect(rejected).toHaveLength(2);
		expect(fulfilled[0].value).toBe("result-1");

		// Check that rejected promises have the expected error message
		expect(rejected[0].reason.message).toBe("Task was coalesced with a newer task");
		expect(rejected[1].reason.message).toBe("Task was coalesced with a newer task");

		queue.destroy();
	});

	test("coalescing window duration override", async () => {
		const queue = new HoldMyTask({
			smartScheduling,
			concurrency: 1,
			coalescingWindowDuration: 100, // Short default window
			coalescingMultipleCallbacks: true
		});
		const results = [];
		let taskExecutions = 0;

		const testTask = async () => {
			taskExecutions++;
			await delay(50);
			return `result-${taskExecutions}`;
		};

		// First task with default window
		queue.enqueue(testTask, (err, result) => results.push({ task: 1, err, result }), {
			coalescingKey: "device-status"
		});

		// Wait longer than default window
		await delay(150);

		// Second task with longer window - should create new group
		queue.enqueue(testTask, (err, result) => results.push({ task: 2, err, result }), {
			coalescingKey: "device-status",
			coalescingWindowDuration: 500 // Override with longer window
		});

		// Third task quickly after - should coalesce with second
		queue.enqueue(testTask, (err, result) => results.push({ task: 3, err, result }), {
			coalescingKey: "device-status",
			coalescingWindowDuration: 500
		});

		// Wait for all tasks to complete
		await delay(300);

		// Two tasks should have executed (two separate groups)
		expect(taskExecutions).toBe(2);

		// All callbacks should have been called
		expect(results).toHaveLength(3);

		queue.destroy();
	});

	test("mustRunBy deadline prevents infinite coalescing", async () => {
		const queue = new HoldMyTask({
			smartScheduling,
			concurrency: 1,
			coalescingWindowDuration: 1000, // Long window
			coalescingMaxDelay: 300, // But short mustRunBy
			coalescingMultipleCallbacks: true
		});
		const results = [];
		let taskExecutions = 0;
		const startTime = Date.now();

		const testTask = async () => {
			taskExecutions++;
			await delay(50);
			return `result-${taskExecutions}`;
		};

		// First task
		queue.enqueue(testTask, (err, result) => results.push({ task: 1, err, result, time: Date.now() - startTime }), {
			coalescingKey: "device-status"
		});

		// Keep adding tasks every 100ms for 500ms total
		const intervals = [];
		for (let i = 0; i < 5; i++) {
			intervals.push(
				setTimeout(
					() => {
						queue.enqueue(testTask, (err, result) => results.push({ task: i + 2, err, result, time: Date.now() - startTime }), {
							coalescingKey: "device-status"
						});
					},
					(i + 1) * 100
				)
			);
		}

		// Wait for all tasks to complete
		await delay(800);

		// Clear intervals
		intervals.forEach((interval) => clearTimeout(interval));

		// Should have executed multiple times due to mustRunBy deadline
		expect(taskExecutions).toBeGreaterThan(1);

		// All callbacks should have been called
		expect(results.length).toBeGreaterThan(0);

		queue.destroy();
	});

	test("task cancellation in coalescing group", async () => {
		const queue = new HoldMyTask({
			smartScheduling,
			concurrency: 1,
			coalescingWindowDuration: 500,
			coalescingMultipleCallbacks: true
		});
		const results = [];
		let taskExecutions = 0;

		const testTask = async () => {
			taskExecutions++;
			await delay(100);
			return `result-${taskExecutions}`;
		};

		// Enqueue tasks with same coalescing key
		queue.enqueue(testTask, (err, result) => results.push({ id: 1, err, result }), {
			coalescingKey: "test-device"
		});

		const task2 = queue.enqueue(testTask, (err, result) => results.push({ id: 2, err, result }), {
			coalescingKey: "test-device"
		});

		queue.enqueue(testTask, (err, result) => results.push({ id: 3, err, result }), {
			coalescingKey: "test-device"
		});

		// Cancel the middle task
		task2.cancel("Test cancellation");

		// Wait for completion
		await delay(300);

		// Only one task should have executed
		expect(taskExecutions).toBe(1);

		// All three callbacks should have been called
		expect(results).toHaveLength(3);

		// Task1 and task3 should have successful results
		expect(results.find((r) => r.id === 1)?.result).toBe("result-1");
		expect(results.find((r) => r.id === 3)?.result).toBe("result-1");

		// Task2 should have been canceled with error
		const task2Result = results.find((r) => r.id === 2);
		expect(task2Result?.err).toBeInstanceOf(Error);
		expect(task2Result?.err?.message).toBe("Test cancellation");

		queue.destroy();
	});

	test("error handling in coalescing group", async () => {
		const queue = new HoldMyTask({
			smartScheduling,
			concurrency: 1,
			coalescingWindowDuration: 500,
			coalescingMultipleCallbacks: true
		});
		const results = [];
		let taskExecutions = 0;

		const testTask = async () => {
			taskExecutions++;
			await delay(50);
			throw new Error("Test error");
		};

		// Enqueue multiple tasks with same coalescing key
		queue.enqueue(testTask, (err, result) => results.push({ id: 1, err: err?.message, result }), {
			coalescingKey: "test-device"
		});

		queue.enqueue(testTask, (err, result) => results.push({ id: 2, err: err?.message, result }), {
			coalescingKey: "test-device"
		});

		queue.enqueue(testTask, (err, result) => results.push({ id: 3, err: err?.message, result }), {
			coalescingKey: "test-device"
		});

		// Wait for completion
		await delay(200);

		// Only one task should have executed
		expect(taskExecutions).toBe(1);

		// All callbacks should have been called with error
		expect(results).toHaveLength(3);
		expect(results[0].err).toBe("Test error");
		expect(results[1].err).toBe("Test error");
		expect(results[2].err).toBe("Test error");

		queue.destroy();
	});

	test("coalescing with different priorities", async () => {
		const queue = new HoldMyTask({
			smartScheduling,
			concurrency: 1,
			coalescingWindowDuration: 500,
			coalescingMultipleCallbacks: true
		});
		const results = [];
		let taskExecutions = 0;

		const testTask = async (priority) => {
			taskExecutions++;
			await delay(50);
			return `result-${priority}-${taskExecutions}`;
		};

		// Enqueue tasks with same coalescing key but different priorities
		queue.enqueue(
			() => testTask(1),
			(err, result) => results.push({ priority: 1, err, result }),
			{
				coalescingKey: "test-device",
				priority: 1
			}
		);

		queue.enqueue(
			() => testTask(5),
			(err, result) => results.push({ priority: 5, err, result }),
			{
				coalescingKey: "test-device",
				priority: 5 // Higher priority
			}
		);

		queue.enqueue(
			() => testTask(3),
			(err, result) => results.push({ priority: 3, err, result }),
			{
				coalescingKey: "test-device",
				priority: 3
			}
		);

		// Wait for completion
		await delay(200);

		// Only one task should have executed (the latest one with highest priority)
		expect(taskExecutions).toBe(1);

		// All callbacks should have been called with result from highest priority task
		expect(results).toHaveLength(3);
		expect(results[0].result).toBe("result-3-1"); // Latest task had priority 3
		expect(results[1].result).toBe("result-3-1");
		expect(results[2].result).toBe("result-3-1");

		queue.destroy();
	});

	test("queue.clear() handles coalescing groups properly", async () => {
		const queue = new HoldMyTask({
			smartScheduling,
			concurrency: 1,
			coalescingWindowDuration: 1000,
			coalescingMultipleCallbacks: true
		});
		const results = [];
		let taskExecutions = 0;

		const testTask = async () => {
			taskExecutions++;
			await delay(100);
			return `result-${taskExecutions}`;
		};

		// Enqueue coalescing tasks
		queue.enqueue(testTask, (err, result) => results.push({ id: 1, err: err?.message, result }), {
			coalescingKey: "test-device"
		});

		queue.enqueue(testTask, (err, result) => results.push({ id: 2, err: err?.message, result }), {
			coalescingKey: "test-device"
		});

		// Clear queue before tasks execute
		queue.clear();

		// Wait to ensure no tasks execute
		await delay(200);

		// No tasks should have executed
		expect(taskExecutions).toBe(0);

		// All callbacks should have been called with cancellation error
		expect(results).toHaveLength(2);
		expect(results[0].err).toBe("Queue cleared");
		expect(results[1].err).toBe("Queue cleared");

		queue.destroy();
	});
});
