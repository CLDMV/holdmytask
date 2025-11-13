/**
 *	@Project: @cldmv/holdmytask
 *	@Filename: /tests/CommonAliases.vest.mjs
 *	@Date: 2025-01-23
 *	@Author: Nate Hyson <CLDMV>
 *	@Email: <Shinrai@users.noreply.github.com>
 *	-----
 *	@Copyright: Copyright (c) 2013-2025 Catalyzed Motivation Inc. All rights reserved.
 */

import { test, expect, describe } from "vitest";
import { HoldMyTask, Queue, TaskManager, TaskQueue, QueueManager, TaskProcessor } from "../index.mjs";

describe("Common Queue System Aliases", () => {
	test("should export HoldMyTask as the main class", () => {
		expect(HoldMyTask).toBeDefined();
		expect(typeof HoldMyTask).toBe("function");
	});

	test("should export Queue alias that works identically to HoldMyTask", () => {
		expect(Queue).toBeDefined();
		expect(Queue).toBe(HoldMyTask);

		const queue = new Queue();
		expect(queue).toBeInstanceOf(HoldMyTask);
		expect(typeof queue.enqueue).toBe("function");
		expect(typeof queue.destroy).toBe("function");
		expect(typeof queue.shutdown).toBe("function");
	});

	test("should export TaskManager alias that works identically to HoldMyTask", () => {
		expect(TaskManager).toBeDefined();
		expect(TaskManager).toBe(HoldMyTask);

		const taskManager = new TaskManager();
		expect(taskManager).toBeInstanceOf(HoldMyTask);
		expect(typeof taskManager.enqueue).toBe("function");
		expect(typeof taskManager.destroy).toBe("function");
		expect(typeof taskManager.shutdown).toBe("function");
	});

	test("should export TaskQueue alias that works identically to HoldMyTask", () => {
		expect(TaskQueue).toBeDefined();
		expect(TaskQueue).toBe(HoldMyTask);

		const taskQueue = new TaskQueue();
		expect(taskQueue).toBeInstanceOf(HoldMyTask);
		expect(typeof taskQueue.enqueue).toBe("function");
		expect(typeof taskQueue.destroy).toBe("function");
		expect(typeof taskQueue.shutdown).toBe("function");
	});

	test("should export QueueManager alias that works identically to HoldMyTask", () => {
		expect(QueueManager).toBeDefined();
		expect(QueueManager).toBe(HoldMyTask);

		const queueManager = new QueueManager();
		expect(queueManager).toBeInstanceOf(HoldMyTask);
		expect(typeof queueManager.enqueue).toBe("function");
		expect(typeof queueManager.destroy).toBe("function");
		expect(typeof queueManager.shutdown).toBe("function");
	});

	test("should export TaskProcessor alias that works identically to HoldMyTask", () => {
		expect(TaskProcessor).toBeDefined();
		expect(TaskProcessor).toBe(HoldMyTask);

		const taskProcessor = new TaskProcessor();
		expect(taskProcessor).toBeInstanceOf(HoldMyTask);
		expect(typeof taskProcessor.enqueue).toBe("function");
		expect(typeof taskProcessor.destroy).toBe("function");
		expect(typeof taskProcessor.shutdown).toBe("function");
	});

	test("should allow all aliases to work with enhanced configuration", () => {
		const config = {
			priorities: {
				99: { delay: 50 }
			},
			coalescing: {
				defaults: {
					delay: 150,
					windowDuration: 200,
					maxDelay: 1000
				},
				keys: {
					"test": { delay: 75 }
				}
			}
		};

		// Test each alias can be instantiated with configuration
		const queue = new Queue(config);
		const taskManager = new TaskManager(config);
		const taskQueue = new TaskQueue(config);
		const queueManager = new QueueManager(config);
		const taskProcessor = new TaskProcessor(config);

		// Verify they all have the same configuration
		expect(queue.getPriorityConfigurations()[99].delay).toBe(50);
		expect(taskManager.getPriorityConfigurations()[99].delay).toBe(50);
		expect(taskQueue.getPriorityConfigurations()[99].delay).toBe(50);
		expect(queueManager.getPriorityConfigurations()[99].delay).toBe(50);
		expect(taskProcessor.getPriorityConfigurations()[99].delay).toBe(50);

		expect(queue.getCoalescingConfigurations().test.delay).toBe(75);
		expect(taskManager.getCoalescingConfigurations().test.delay).toBe(75);
		expect(taskQueue.getCoalescingConfigurations().test.delay).toBe(75);
		expect(queueManager.getCoalescingConfigurations().test.delay).toBe(75);
		expect(taskProcessor.getCoalescingConfigurations().test.delay).toBe(75);
	});

	test("should allow functional equivalence between aliases", async () => {
		const results = [];

		// Create instances using different aliases
		const queue = new Queue();
		const taskManager = new TaskManager();

		// Schedule tasks with both
		queue.enqueue(() => results.push("queue"), { delay: 50, coalescingKey: "test1" });
		taskManager.enqueue(() => results.push("taskManager"), { delay: 50, coalescingKey: "test2" });

		// Wait for execution
		await new Promise((resolve) => setTimeout(resolve, 100));

		// Both should have executed
		expect(results).toContain("queue");
		expect(results).toContain("taskManager");
		expect(results.length).toBe(2);

		// Clean up
		queue.destroy();
		taskManager.destroy();
	});

	test("should support shutdown alias on all exported classes", () => {
		const queue = new Queue();
		const taskManager = new TaskManager();
		const taskQueue = new TaskQueue();
		const queueManager = new QueueManager();
		const taskProcessor = new TaskProcessor();

		// All should have shutdown method
		expect(typeof queue.shutdown).toBe("function");
		expect(typeof taskManager.shutdown).toBe("function");
		expect(typeof taskQueue.shutdown).toBe("function");
		expect(typeof queueManager.shutdown).toBe("function");
		expect(typeof taskProcessor.shutdown).toBe("function");

		// Should not throw when called
		expect(() => queue.shutdown()).not.toThrow();
		expect(() => taskManager.shutdown()).not.toThrow();
		expect(() => taskQueue.shutdown()).not.toThrow();
		expect(() => queueManager.shutdown()).not.toThrow();
		expect(() => taskProcessor.shutdown()).not.toThrow();
	});

	// Method Alias Tests
	test("schedule method should be alias for enqueue", async () => {
		const queue = new HoldMyTask();
		let executed = false;

		// Test with promise
		await queue.schedule(() => {
			executed = true;
		});

		expect(executed).toBe(true);
		queue.destroy();
	});

	test("schedule method should work with callback", () => {
		const queue = new HoldMyTask();
		let executed = false;

		const task = queue.schedule(
			() => {
				executed = true;
			},
			(_) => {
				expect(executed).toBe(true);
				queue.destroy();
			}
		);

		expect(task).toBeDefined();
		expect(task.id).toBeDefined();
	});

	test("add method should be alias for enqueue", async () => {
		const queue = new HoldMyTask();
		let executed = false;

		// Test with promise
		await queue.add(() => {
			executed = true;
		});

		expect(executed).toBe(true);
		queue.destroy();
	});

	test("add method should work with callback", () => {
		const queue = new HoldMyTask();
		let executed = false;

		const task = queue.add(
			() => {
				executed = true;
			},
			(_) => {
				expect(executed).toBe(true);
				queue.destroy();
			}
		);

		expect(task).toBeDefined();
		expect(task.id).toBeDefined();
	});

	// Custom ID Tests
	test("custom task ID should be accepted", () => {
		const queue = new HoldMyTask();
		const customId = "my-custom-task-123";

		const task = queue.enqueue(
			() => {},
			() => {},
			{ id: customId }
		);

		expect(task.id).toBe(customId);
		expect(queue.hasTask(customId)).toBe(true);
		queue.destroy();
	});

	test("custom ID uniqueness should be enforced", async () => {
		const queue = new HoldMyTask();
		const customId = "duplicate-task-id";

		// First task with custom ID should succeed
		const task1 = queue.enqueue(
			() => {},
			() => {},
			{ id: customId }
		);
		expect(task1.id).toBe(customId);

		// Second task with same ID should emit error event instead of throwing
		await new Promise((resolve) => {
			queue.on("error", (errorInfo) => {
				expect(errorInfo.error.message).toBe(`Task with ID '${customId}' already exists`);
				resolve();
			});

			// This should trigger error event since ID already exists
			queue
				.enqueue(
					() => {},
					() => {},
					{ id: customId }
				)
				.catch(() => {}); // Handle the promise rejection
		});

		queue.destroy();
	});

	test("getTask should find task by ID", () => {
		const queue = new HoldMyTask();
		const customId = "findable-task";

		queue.enqueue(
			() => {},
			() => {},
			{ id: customId }
		);

		const foundTask = queue.getTask(customId);
		expect(foundTask).toBeDefined();
		expect(foundTask.id).toBe(customId);

		const notFound = queue.getTask("non-existent");
		expect(notFound).toBe(null);

		queue.destroy();
	});

	test("hasTask should check task existence", () => {
		const queue = new HoldMyTask();
		const customId = "existence-test";

		expect(queue.hasTask(customId)).toBe(false);

		queue.enqueue(
			() => {},
			() => {},
			{ id: customId }
		);
		expect(queue.hasTask(customId)).toBe(true);

		queue.destroy();
	});

	test("cancelTask should work with custom IDs", () => {
		const queue = new HoldMyTask();
		const customId = "cancellable-task";
		let executed = false;

		queue.enqueue(
			() => {
				executed = true;
			},
			() => {},
			{ id: customId }
		);

		const cancelled = queue.cancelTask(customId, "Test cancellation");
		expect(cancelled).toBe(true);
		expect(queue.hasTask(customId)).toBe(false);

		// Task should not execute after cancellation
		setTimeout(() => {
			expect(executed).toBe(false);
		}, 10);

		queue.destroy();
	});
});

describe("Primary Method Names", () => {
	test("has() should work as primary method", () => {
		const queue = new HoldMyTask();
		const customId = "primary-has-test";

		expect(queue.has(customId)).toBe(false);
		queue.enqueue(() => {}, { id: customId });
		expect(queue.has(customId)).toBe(true);

		queue.destroy();
	});

	test("get() should work as primary method", () => {
		const queue = new HoldMyTask();
		const customId = "primary-get-test";

		queue.enqueue(() => "test result", { id: customId });
		const foundTask = queue.get(customId);
		expect(foundTask).toBeTruthy();
		expect(foundTask.id).toBe(customId);

		const notFound = queue.get("non-existent");
		expect(notFound).toBe(null);

		queue.destroy();
	});

	test("cancel() should work as primary method", () => {
		const queue = new HoldMyTask();
		const customId = "primary-cancel-test";
		let executed = false;

		queue.enqueue(
			() => {
				executed = true;
			},
			() => {},
			{ id: customId }
		);

		const cancelled = queue.cancel(customId, "Primary method test");
		expect(cancelled).toBe(true);
		expect(queue.has(customId)).toBe(false);

		// Task should not execute after cancellation
		setTimeout(() => {
			expect(executed).toBe(false);
		}, 10);

		queue.destroy();
	});
});

describe("Method Alias Compatibility", () => {
	test("hasTask() should work as alias for has()", () => {
		const queue = new HoldMyTask();
		const customId = "hasTask-alias-test";

		// Both methods should return same results
		expect(queue.has(customId)).toBe(queue.hasTask(customId));

		queue.enqueue(() => {}, { id: customId });
		expect(queue.has(customId)).toBe(queue.hasTask(customId));
		expect(queue.hasTask(customId)).toBe(true);

		queue.destroy();
	});

	test("getTask() should work as alias for get()", () => {
		const queue = new HoldMyTask();
		const customId = "getTask-alias-test";

		// Both methods should return same results
		expect(queue.get(customId)).toBe(queue.getTask(customId));
		expect(queue.getTask(customId)).toBe(null);

		queue.enqueue(() => "alias test", { id: customId });
		const primaryResult = queue.get(customId);
		const aliasResult = queue.getTask(customId);

		expect(primaryResult).toBe(aliasResult);
		expect(aliasResult.id).toBe(customId);

		queue.destroy();
	});

	test("cancelTask() should work as alias for cancel()", () => {
		const queue = new HoldMyTask();
		const customId1 = "cancelTask-alias-test-1";
		const customId2 = "cancelTask-alias-test-2";

		queue.enqueue(
			() => {},
			() => {},
			{ id: customId1 }
		);
		queue.enqueue(
			() => {},
			() => {},
			{ id: customId2 }
		);

		// Test primary method
		const cancelled1 = queue.cancel(customId1, "Primary method");
		// Test alias method
		const cancelled2 = queue.cancelTask(customId2, "Alias method");

		expect(cancelled1).toBe(true);
		expect(cancelled2).toBe(true);
		expect(queue.has(customId1)).toBe(false);
		expect(queue.has(customId2)).toBe(false);

		queue.destroy();
	});
});

describe("Enqueue Method Aliases", () => {
	test("schedule() should work as alias for enqueue()", () => {
		const queue = new HoldMyTask();
		let executed = false;

		const task = queue.schedule(() => {
			executed = true;
			return "scheduled result";
		});

		expect(task).toBeTruthy();
		expect(task.id).toBeTruthy();

		// Wait for execution
		return new Promise((resolve) => {
			setTimeout(() => {
				expect(executed).toBe(true);
				queue.destroy();
				resolve();
			}, 50);
		});
	});

	test("add() should work as alias for enqueue()", () => {
		const queue = new HoldMyTask();
		let executed = false;

		const task = queue.add(() => {
			executed = true;
			return "added result";
		});

		expect(task).toBeTruthy();
		expect(task.id).toBeTruthy();

		// Wait for execution
		return new Promise((resolve) => {
			setTimeout(() => {
				expect(executed).toBe(true);
				queue.destroy();
				resolve();
			}, 50);
		});
	});

	test("schedule() and add() should support all enqueue() parameters", () => {
		const queue = new HoldMyTask();
		let scheduleExecuted = false;
		let addExecuted = false;

		// Test with callback
		queue.schedule(
			() => {
				scheduleExecuted = true;
			},
			() => {},
			{ id: "schedule-with-callback" }
		);

		// Test with options
		queue.add(
			() => {
				addExecuted = true;
			},
			{ id: "add-with-options", priority: 5 }
		);

		expect(queue.has("schedule-with-callback")).toBe(true);
		expect(queue.has("add-with-options")).toBe(true);

		// Wait for execution
		return new Promise((resolve) => {
			setTimeout(() => {
				expect(scheduleExecuted).toBe(true);
				expect(addExecuted).toBe(true);
				queue.destroy();
				resolve();
			}, 50);
		});
	});
});

describe("Import Aliases", () => {
	test("queue alias should work", async () => {
		const { queue } = await import("../index.mjs");
		const instance = new queue();
		expect(instance).toBeInstanceOf(HoldMyTask);
		instance.destroy();
	});

	test("Queue alias should work", async () => {
		const { Queue } = await import("../index.mjs");
		const instance = new Queue();
		expect(instance).toBeInstanceOf(HoldMyTask);
		instance.destroy();
	});

	test("TaskManager alias should work", async () => {
		const { TaskManager } = await import("../index.mjs");
		const instance = new TaskManager();
		expect(instance).toBeInstanceOf(HoldMyTask);
		instance.destroy();
	});

	test("TaskQueue alias should work", async () => {
		const { TaskQueue } = await import("../index.mjs");
		const instance = new TaskQueue();
		expect(instance).toBeInstanceOf(HoldMyTask);
		instance.destroy();
	});

	test("QueueManager alias should work", async () => {
		const { QueueManager } = await import("../index.mjs");
		const instance = new QueueManager();
		expect(instance).toBeInstanceOf(HoldMyTask);
		instance.destroy();
	});

	test("TaskProcessor alias should work", async () => {
		const { TaskProcessor } = await import("../index.mjs");
		const instance = new TaskProcessor();
		expect(instance).toBeInstanceOf(HoldMyTask);
		instance.destroy();
	});

	test("default export should work", async () => {
		const DefaultExport = (await import("../index.mjs")).default;
		const instance = new DefaultExport();
		expect(instance).toBeInstanceOf(HoldMyTask);
		instance.destroy();
	});

	test("star import should work", async () => {
		const AllExports = await import("../index.mjs");
		const instance = new AllExports.HoldMyTask();
		expect(instance).toBeInstanceOf(HoldMyTask);

		// Test that all aliases are available
		expect(AllExports.queue).toBe(HoldMyTask);
		expect(AllExports.Queue).toBe(HoldMyTask);
		expect(AllExports.TaskManager).toBe(HoldMyTask);
		expect(AllExports.TaskQueue).toBe(HoldMyTask);
		expect(AllExports.QueueManager).toBe(HoldMyTask);
		expect(AllExports.TaskProcessor).toBe(HoldMyTask);
		expect(AllExports.default).toBe(HoldMyTask);

		instance.destroy();
	});
});

describe("Control Method Aliases", () => {
	test("shutdown() should work as alias for destroy()", async () => {
		const queue = new HoldMyTask();

		queue.enqueue(() => {
			return "test";
		});

		// Test that shutdown works and queue is actually shut down
		queue.shutdown();
		expect(queue.destroyed).toBe(true);

		// Verify queue is actually shut down by checking for error event instead of throw
		let errorReceived = false;
		queue.on("error", (errorInfo) => {
			expect(errorInfo.error.message).toBe("Queue is destroyed");
			errorReceived = true;
		});

		// This should trigger error event since queue is destroyed
		queue.enqueue(() => {}).catch(() => {}); // Handle the promise rejection

		// Wait for the error event to be emitted
		await new Promise((resolve) => setTimeout(resolve, 50));
		expect(errorReceived).toBe(true);
	});
});
