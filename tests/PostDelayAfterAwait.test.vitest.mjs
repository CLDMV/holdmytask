/**
 *
 *	@Project: @cldmv/holdmytask
 *	@Filename: /tests/PostDelayAfterAwait.test.vitest.mjs
 *	@Date: 2026-10-03T17:26:43-07:00 (1791073603)
 *	@Author: Nate Corcoran <CLDMV>
 *	@Email: <Shinrai@users.noreply.github.com>
 *	-----
 *	@Last modified by: Nate Corcoran <CLDMV> (Shinrai@users.noreply.github.com)
 *	@Last modified time: 2026-10-03T17:26:45-07:00 (1791073605)
 *	-----
 *	@Copyright: Copyright (c) 2013-2026 Catalyzed Motivation Inc. All rights reserved.
 *
 */

import { test, expect, describe, vi, beforeEach, afterEach } from "vitest";
import { HoldMyTask } from "../src/hold-my-task.mjs";

// Regression coverage for #52: a task enqueued immediately after awaiting the previous
// task (same priority) must still wait out the priority postDelay.
describe.each([
	{ smartScheduling: true, mode: "Smart Scheduling" },
	{ smartScheduling: false, mode: "Traditional Polling" }
])("priority postDelay after await with $mode", ({ smartScheduling }) => {
	beforeEach(() => {
		vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout", "setInterval", "clearInterval", "setImmediate", "clearImmediate", "Date"] });
	});
	afterEach(() => {
		vi.useRealTimers();
	});

	test("promise API: enqueue right after await honours postDelay", async () => {
		const q = new HoldMyTask({ concurrency: 1, smartScheduling, priorities: { 1: { postDelay: 300 } } });
		try {
			const first = q.enqueue(() => "a", { priority: 1 });
			await vi.advanceTimersByTimeAsync(50);
			await first;
			const finishedAt = first.finishedAt;

			// 50ms of the 300ms postDelay has already elapsed; the next 200ms stay inside it.
			const second = q.enqueue(() => "b", { priority: 1 });
			await vi.advanceTimersByTimeAsync(200);
			expect(second.status()).not.toBe("completed");

			await vi.advanceTimersByTimeAsync(200);
			await second;
			expect(second.startedAt - finishedAt).toBeGreaterThanOrEqual(300);
		} finally {
			q.destroy();
		}
	});

	test("promise API: enqueue in the same microtask as resolution honours postDelay", async () => {
		const q = new HoldMyTask({ concurrency: 1, smartScheduling, priorities: { 1: { postDelay: 300 } } });
		try {
			let second;
			let finishedAt;
			const first = q.enqueue(() => "a", { priority: 1 });
			first.then(() => {
				finishedAt = first.finishedAt;
				second = q.enqueue(() => "b", { priority: 1 });
			});
			await vi.advanceTimersByTimeAsync(50);
			expect(second).toBeDefined();
			await vi.advanceTimersByTimeAsync(400);
			await second;
			expect(second.startedAt - finishedAt).toBeGreaterThanOrEqual(300);
		} finally {
			q.destroy();
		}
	});

	test("callback API: enqueue from inside the completion callback honours postDelay", async () => {
		const q = new HoldMyTask({ concurrency: 1, smartScheduling, priorities: { 1: { postDelay: 300 } } });
		try {
			let finishedAt;
			let secondStartedAt;
			q.enqueue(
				() => "a",
				(err) => {
					expect(err).toBeNull();
					finishedAt = Date.now();
					q.enqueue(
						() => {
							secondStartedAt = Date.now();
							return "b";
						},
						() => {},
						{ priority: 1 }
					);
				},
				{ priority: 1 }
			);
			await vi.advanceTimersByTimeAsync(500);
			expect(secondStartedAt).toBeDefined();
			expect(secondStartedAt - finishedAt).toBeGreaterThanOrEqual(300);
		} finally {
			q.destroy();
		}
	});
});
