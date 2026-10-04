/**
 *
 *	@Project: @cldmv/holdmytask
 *	@Filename: /tests/TaskLevelDelayNames.test.vitest.mjs
 *	@Date: 2026-10-03T17:15:23-07:00 (1791072923)
 *	@Author: Nate Corcoran <CLDMV>
 *	@Email: <Shinrai@users.noreply.github.com>
 *	-----
 *	@Last modified by: Nate Corcoran <CLDMV> (Shinrai@users.noreply.github.com)
 *	@Last modified time: 2026-10-03T17:19:29-07:00 (1791073169)
 *	-----
 *	@Copyright: Copyright (c) 2013-2026 Catalyzed Motivation Inc. All rights reserved.
 *
 */

import { test, expect, describe, vi, beforeEach, afterEach } from "vitest";
import { HoldMyTask } from "../src/hold-my-task.mjs";

// #51: task-level `postDelay` / `startDelay` are the current names; `delay` / `start`
// remain as deprecated aliases that emit a deprecation warning.
const fakeTimers = () =>
	vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout", "setInterval", "clearInterval", "setImmediate", "clearImmediate", "Date"] });

describe.each([
	{ smartScheduling: true, mode: "Smart Scheduling" },
	{ smartScheduling: false, mode: "Traditional Polling" }
])("task-level delay names with $mode", ({ smartScheduling }) => {
	beforeEach(fakeTimers);
	afterEach(() => vi.useRealTimers());

	test("task-level postDelay delays the next task without any priority config", async () => {
		const q = new HoldMyTask({ concurrency: 1, smartScheduling });
		try {
			const a = q.enqueue(() => "a", { postDelay: 200 });
			const b = q.enqueue(() => "b");
			await vi.advanceTimersByTimeAsync(150);
			expect(a.status()).toBe("completed");
			expect(b.status()).not.toBe("completed");
			await vi.advanceTimersByTimeAsync(150);
			await Promise.all([a, b]);
			expect(b.startedAt - a.finishedAt).toBeGreaterThanOrEqual(200);
		} finally {
			q.destroy();
		}
	});

	test("deprecated task-level delay still delays the next task and warns once", async () => {
		const q = new HoldMyTask({ concurrency: 1, smartScheduling });
		const warnings = [];
		q.on("warning", (w) => warnings.push(w));
		try {
			const a = q.enqueue(() => "a", { delay: 200 });
			const b = q.enqueue(() => "b", { delay: 0 });
			await vi.advanceTimersByTimeAsync(400);
			await Promise.all([a, b]);
			expect(b.startedAt - a.finishedAt).toBeGreaterThanOrEqual(200);
			const delayWarnings = warnings.filter((w) => w.deprecated === "delay");
			expect(delayWarnings).toHaveLength(1);
			expect(delayWarnings[0]).toMatchObject({ type: "deprecation", deprecated: "delay", replacement: "postDelay" });
			expect(delayWarnings[0].message).toContain("deprecated");
		} finally {
			q.destroy();
		}
	});

	test("task-level startDelay holds the task back; deprecated start does the same and warns", async () => {
		const q = new HoldMyTask({ concurrency: 2, smartScheduling });
		const warnings = [];
		q.on("warning", (w) => warnings.push(w));
		try {
			const enqueuedAt = Date.now();
			const a = q.enqueue(() => "a", { startDelay: 100 });
			const b = q.enqueue(() => "b", { start: 100 });
			await vi.advanceTimersByTimeAsync(50);
			expect(a.status()).toBe("pending");
			expect(b.status()).toBe("pending");
			await vi.advanceTimersByTimeAsync(100);
			await Promise.all([a, b]);
			expect(a.startedAt - enqueuedAt).toBeGreaterThanOrEqual(100);
			expect(b.startedAt - enqueuedAt).toBeGreaterThanOrEqual(100);
			expect(warnings.filter((w) => w.deprecated === "start")).toEqual([
				expect.objectContaining({ type: "deprecation", deprecated: "start", replacement: "startDelay" })
			]);
			expect(warnings.filter((w) => w.deprecated === "startDelay" || w.deprecated === "postDelay")).toHaveLength(0);
		} finally {
			q.destroy();
		}
	});

	test("postDelay: -1 bypasses an active delay period", async () => {
		const q = new HoldMyTask({ concurrency: 1, smartScheduling, priorities: { 1: { postDelay: 500 } } });
		try {
			const a = q.enqueue(() => "a", { priority: 1 });
			await vi.advanceTimersByTimeAsync(30);
			await a;
			const b = q.enqueue(() => "b", { priority: 1, postDelay: -1 });
			await vi.advanceTimersByTimeAsync(50);
			expect(b.status()).toBe("completed");
			await b;
		} finally {
			q.destroy();
		}
	});
});

describe("task-level delay name resolution", () => {
	test("new names win over deprecated aliases without a warning, and options are not mutated", async () => {
		const q = new HoldMyTask({ concurrency: 1, autoStart: false });
		const warnings = [];
		q.on("warning", (w) => warnings.push(w));
		const options = { postDelay: 10, delay: 999, startDelay: 5, start: 999 };
		const p = q.enqueue(() => "x", options);
		expect(options).toEqual({ postDelay: 10, delay: 999, startDelay: 5, start: 999 });
		await new Promise((resolve) => setImmediate(resolve));
		expect(warnings).toHaveLength(0);
		q.resume();
		await p;
		q.destroy();
	});

	test("callback-form options are normalized too", async () => {
		const q = new HoldMyTask({ concurrency: 1 });
		const warnings = [];
		q.on("warning", (w) => warnings.push(w));
		const result = await new Promise((resolve) =>
			q.enqueue(
				() => "cb",
				(err, value) => resolve(value),
				{ delay: 0 }
			)
		);
		expect(result).toBe("cb");
		expect(warnings.some((w) => w.deprecated === "delay")).toBe(true);
		q.destroy();
	});

	test("getPriorityConfig and getCoalescingConfig honour task-level postDelay/startDelay and the aliases", () => {
		const q = new HoldMyTask({ autoStart: false, priorities: { 1: { postDelay: 100, startDelay: 20 } } });
		expect(q.getPriorityConfig(1, { postDelay: 5, startDelay: 6 })).toMatchObject({ postDelay: 5, startDelay: 6, delay: 5, start: 6 });
		expect(q.getPriorityConfig(1, { delay: 7, start: 8 })).toMatchObject({ postDelay: 7, startDelay: 8 });
		expect(q.getPriorityConfig(1, { postDelay: 1, delay: 2 }).postDelay).toBe(1);
		expect(q.getPriorityConfig(1)).toMatchObject({ postDelay: 100, startDelay: 20 });
		expect(q.getCoalescingConfig("k", { postDelay: 9, startDelay: 3 })).toMatchObject({ postDelay: 9, startDelay: 3 });
		expect(q.getCoalescingConfig("k", { delay: 4, start: 2 })).toMatchObject({ postDelay: 4, startDelay: 2 });
		q.destroy();
	});

	test("coalescing tasks honour task-level postDelay/startDelay", async () => {
		vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout", "setInterval", "clearInterval", "setImmediate", "clearImmediate", "Date"] });
		const q = new HoldMyTask({ concurrency: 1, coalescing: { defaults: { windowDuration: 10, maxDelay: 50 } } });
		try {
			const enqueuedAt = Date.now();
			let aRanAt;
			let bRanAt;
			const a = q.enqueue(
				() => {
					aRanAt = Date.now();
					return "a";
				},
				{ coalescingKey: "k", startDelay: 100, postDelay: 200 }
			);
			await vi.advanceTimersByTimeAsync(150);
			await a;
			const b = q.enqueue(() => {
				bRanAt = Date.now();
				return "b";
			});
			await vi.advanceTimersByTimeAsync(1000);
			await b;
			expect(aRanAt - enqueuedAt).toBeGreaterThanOrEqual(100);
			expect(bRanAt - aRanAt).toBeGreaterThanOrEqual(200);
		} finally {
			q.destroy();
			vi.useRealTimers();
		}
	});
});
