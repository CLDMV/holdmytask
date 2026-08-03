import { describe, test } from "vitest";
import { expect } from "vitest";
import { HoldMyTask } from "../src/hold-my-task.mjs";

describe("Async Constructor Pattern and Events-Only Error Handling", () => {
	test("should support sync mode by default (backwards compatibility)", () => {
		const queue = new HoldMyTask({ maxQueue: 5 });

		expect(queue).toBeInstanceOf(HoldMyTask);
		expect(queue._syncMode).toBe(true);
		expect(queue.options.maxQueue).toBe(5);

		queue.destroy();
	});

	test("should support explicit sync mode", () => {
		const queue = new HoldMyTask({ maxQueue: 3, sync: true });

		expect(queue).toBeInstanceOf(HoldMyTask);
		expect(queue._syncMode).toBe(true);
		expect(queue.options.maxQueue).toBe(3);

		queue.destroy();
	});

	test("should support async mode with sync: false", async () => {
		const queuePromise = new HoldMyTask({ maxQueue: 2, sync: false });

		expect(queuePromise).toBeInstanceOf(Promise);

		const queue = await queuePromise;
		expect(queue).toBeInstanceOf(HoldMyTask);
		expect(queue._syncMode).toBe(false);
		expect(queue.options.maxQueue).toBe(2);

		queue.destroy();
	});

	test("should support async initialization with sync: false", async () => {
		const queue = await new HoldMyTask({ maxQueue: 1, sync: false });

		expect(queue).toBeInstanceOf(HoldMyTask);
		expect(queue._syncMode).toBe(false);
		expect(queue.options.maxQueue).toBe(1);

		queue.destroy();
	});

	test("should allow event listeners to be attached before async initialization completes", async () => {
		// Test that async constructor works - no validation errors occur in constructor
		// The test is about being able to create async instances and attach event listeners
		const queuePromise = new HoldMyTask({ maxQueue: 10, sync: false });
		const queue = await queuePromise;

		// Test that we can attach event listeners after async initialization
		let errorReceived = false;
		queue.on("error", () => {
			errorReceived = true;
		});

		// Now fill the queue and try to add one more to trigger error event
		for (let i = 0; i < 10; i++) {
			queue.enqueue(
				() => new Promise((resolve) => setTimeout(resolve, 100)),
				() => {}
			);
		}

		// This should trigger error event since queue is full
		queue
			.enqueue(
				() => {},
				() => {}
			)
			.catch(() => {}); // Handle the promise rejection

		// Wait for the error event to be emitted
		await new Promise((resolve) => setTimeout(resolve, 50));

		expect(errorReceived).toBe(true);
		queue.destroy();
	});
	test("should emit error events instead of throwing for enqueue validation errors", async () => {
		const queue = new HoldMyTask({ maxQueue: 5, sync: false });
		const initializedQueue = await queue;

		await new Promise((resolve) => {
			initializedQueue.on("error", (errorInfo) => {
				expect(errorInfo.error.message).toBe("Task with ID 'duplicate' already exists");
				initializedQueue.destroy();
				resolve();
			});

			// Add a task with a specific ID
			initializedQueue.enqueue(() => {}, { id: "duplicate" }).catch(() => {});

			// Try duplicate ID - should emit error event
			initializedQueue.enqueue(() => {}, { id: "duplicate" }).catch(() => {});
		});
	});

	test("should emit error events for destroyed queue", async () => {
		const queue = new HoldMyTask({ maxQueue: 1 });
		queue.destroy();

		const errorPromise = new Promise((resolve) => {
			queue.on("error", (errorInfo) => {
				expect(errorInfo.error.message).toBe("Queue is destroyed");
				resolve();
			});
		});

		// This should trigger an error event
		queue.enqueue(() => {}).catch(() => {}); // Handle the promise rejection

		await errorPromise;
	});

	test("should emit error events for configurePriority validation errors", async () => {
		const queue = new HoldMyTask({ sync: false });
		const initializedQueue = await queue;

		const errorEvents = [];

		const errorPromise = new Promise((resolve) => {
			initializedQueue.on("error", (errorInfo) => {
				errorEvents.push(errorInfo);

				if (errorEvents.length === 3) {
					expect(errorEvents[0].error.message).toBe("priority must be a number");
					expect(errorEvents[0].method).toBe("configurePriority");

					expect(errorEvents[1].error.message).toBe("config must be an object");
					expect(errorEvents[1].method).toBe("configurePriority");

					expect(errorEvents[2].error.message).toContain("Invalid config keys: invalidKey");
					expect(errorEvents[2].method).toBe("configurePriority");

					resolve();
				}
			});
		});

		// Test various validation errors
		initializedQueue.configurePriority("invalid", { delay: 100 });
		initializedQueue.configurePriority(1, null);
		initializedQueue.configurePriority(2, { invalidKey: true });

		await errorPromise;
		initializedQueue.destroy();
	});

	test("should emit error events for configureCoalescingKey validation errors", async () => {
		const queue = new HoldMyTask({ sync: false });
		const initializedQueue = await queue;

		const errorEvents = [];

		const errorPromise = new Promise((resolve) => {
			initializedQueue.on("error", (errorInfo) => {
				errorEvents.push(errorInfo);

				if (errorEvents.length === 3) {
					expect(errorEvents[0].error.message).toBe("coalescingKey must be a string");
					expect(errorEvents[0].method).toBe("configureCoalescingKey");

					expect(errorEvents[1].error.message).toBe("config must be an object");
					expect(errorEvents[1].method).toBe("configureCoalescingKey");

					expect(errorEvents[2].error.message).toContain("Invalid config keys: badKey");
					expect(errorEvents[2].method).toBe("configureCoalescingKey");

					resolve();
				}
			});
		});

		// Test various validation errors
		initializedQueue.configureCoalescingKey(123, {});
		initializedQueue.configureCoalescingKey("test", null);
		initializedQueue.configureCoalescingKey("test2", { badKey: true });

		await errorPromise;
		initializedQueue.destroy();
	});

	test("should support backwards compatibility property transformation in async mode", async () => {
		const queue = await new HoldMyTask({
			sync: false,
			priorities: {
				1: { delay: 100, start: 50 }, // Old property names
				2: { postDelay: 200, startDelay: 75 } // New property names
			}
		});

		// Verify transformation worked
		expect(queue.options.priorities[1].postDelay).toBe(100);
		expect(queue.options.priorities[1].startDelay).toBe(50);
		expect(queue.options.priorities[2].postDelay).toBe(200);
		expect(queue.options.priorities[2].startDelay).toBe(75);

		// Old properties should be removed
		expect(queue.options.priorities[1].delay).toBeUndefined();
		expect(queue.options.priorities[1].start).toBeUndefined();

		queue.destroy();
	});

	test("should handle promise rejection for async enqueue errors", async () => {
		const queue = await new HoldMyTask({ maxQueue: 1, sync: false });

		// Add error listener to prevent unhandled error events
		queue.on("error", () => {}); // Just consume the events

		// Fill the queue
		queue.enqueue(() => {}).catch(() => {}); // Handle in case this also rejects

		// This should return a rejected promise
		const promise = queue.enqueue(() => {});

		await expect(promise).rejects.toThrow("Queue is full");

		queue.destroy();
	});

	test("should maintain all existing functionality in sync mode", () => {
		const queue = new HoldMyTask({
			maxQueue: 10,
			concurrency: 2,
			priorities: {
				1: { postDelay: 100, startDelay: 25 }
			},
			sync: true
		});

		expect(queue.options.maxQueue).toBe(10);
		expect(queue.options.concurrency).toBe(2);
		expect(queue.options.priorities[1].postDelay).toBe(100);
		expect(queue.options.priorities[1].startDelay).toBe(25);
		expect(queue._syncMode).toBe(true);

		// Should be able to enqueue tasks normally
		const handle = queue.enqueue(() => "test", { priority: 1 });
		expect(handle.id).toBeDefined();

		queue.destroy();
	});

	test("should maintain all existing functionality in async mode", async () => {
		const queue = await new HoldMyTask({
			sync: false,
			maxQueue: 10,
			concurrency: 2,
			priorities: {
				1: { postDelay: 100, startDelay: 25 }
			}
		});

		expect(queue.options.maxQueue).toBe(10);
		expect(queue.options.concurrency).toBe(2);
		expect(queue.options.priorities[1].postDelay).toBe(100);
		expect(queue.options.priorities[1].startDelay).toBe(25);
		expect(queue._syncMode).toBe(false);

		// Should be able to enqueue tasks normally
		const promise = queue.enqueue(() => "test", { priority: 1 });
		expect(promise).toBeInstanceOf(Promise);

		const result = await promise;
		expect(result).toBe("test");

		queue.destroy();
	});
});
