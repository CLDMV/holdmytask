/**
 *
 *	@Project: @cldmv/holdmytask
 *	@Filename: /tests/CallbackErrorWithoutListener.test.vitest.mjs
 *	@Date: 2026-10-03T17:20:10-07:00 (1791073210)
 *	@Author: Nate Corcoran <CLDMV>
 *	@Email: <Shinrai@users.noreply.github.com>
 *	-----
 *	@Last modified by: Nate Corcoran <CLDMV> (Shinrai@users.noreply.github.com)
 *	@Last modified time: 2026-10-03T17:23:55-07:00 (1791073435)
 *	-----
 *	@Copyright: Copyright (c) 2013-2026 Catalyzed Motivation Inc. All rights reserved.
 *
 */

import { test, expect, describe } from "vitest";
import { HoldMyTask } from "../src/hold-my-task.mjs";

// #53: a callback-style task failure must reach the callback even when nothing listens
// for the queue's `error` event; the event is only emitted when a listener exists.
const runCallbackTask = (q, task, options = {}) =>
	new Promise((resolve) => {
		q.enqueue(task, (err, result) => resolve({ err, result }), options);
	});

describe.each([
	{ smartScheduling: true, mode: "Smart Scheduling" },
	{ smartScheduling: false, mode: "Traditional Polling" }
])("callback task failures without an error listener ($mode)", ({ smartScheduling }) => {
	test("a failing task delivers { type: 'error', error } to the callback without throwing", async () => {
		const q = new HoldMyTask({ smartScheduling });
		const boom = new Error("boom");
		expect(q.listenerCount("error")).toBe(0);
		const { err, result } = await runCallbackTask(q, () => {
			throw boom;
		});
		expect(err).toEqual({ type: "error", error: boom });
		expect(result).toBeNull();
		q.destroy();
	});

	test("a timed-out task delivers { type: 'timeout', message } to the callback without throwing", async () => {
		const q = new HoldMyTask({ smartScheduling });
		const { err, result } = await runCallbackTask(q, () => new Promise((resolve) => setTimeout(resolve, 500)), { timeout: 20 });
		expect(err).toEqual({ type: "timeout", message: "Task timed out after 20ms" });
		expect(result).toBeNull();
		q.destroy();
	});

	test("an aborted task delivers { type: 'canceled', message: 'Task was aborted' } to the callback without throwing", async () => {
		const q = new HoldMyTask({ smartScheduling });
		const { err, result } = await runCallbackTask(q, () => {
			const abort = new Error("The operation was aborted");
			abort.name = "AbortError";
			throw abort;
		});
		expect(err).toEqual({ type: "canceled", message: "Task was aborted" });
		expect(result).toBeNull();
		q.destroy();
	});

	test("an expired task delivers its expire error to the callback without throwing", async () => {
		const q = new HoldMyTask({ smartScheduling, concurrency: 1 });
		q.enqueue(
			() => new Promise((resolve) => setTimeout(resolve, 60)),
			() => {}
		);
		const { err, result } = await runCallbackTask(q, () => "never", { expire: 10 });
		expect(err).toBeInstanceOf(Error);
		expect(err.type).toBe("expire");
		expect(result).toBeNull();
		q.destroy();
	});

	test("with an error listener attached, the event is still emitted and the callback still runs", async () => {
		const q = new HoldMyTask({ smartScheduling });
		const events = [];
		q.on("error", (payload) => events.push(payload));
		const boom = new Error("boom");
		const { err } = await runCallbackTask(q, () => {
			throw boom;
		});
		expect(err).toEqual({ type: "error", error: boom });
		expect(events).toHaveLength(1);
		expect(events[0].error).toBe(boom);
		expect(events[0].status).toBe("error");
		q.destroy();
	});

	test("with an error listener attached, an expired callback task is still reported", async () => {
		const q = new HoldMyTask({ smartScheduling, concurrency: 1 });
		const events = [];
		q.on("error", (payload) => events.push(payload));
		q.enqueue(
			() => new Promise((resolve) => setTimeout(resolve, 60)),
			() => {}
		);
		const { err } = await runCallbackTask(q, () => "never", { expire: 10 });
		expect(err.type).toBe("expire");
		expect(events.some((e) => e.error === err)).toBe(true);
		q.destroy();
	});
});
