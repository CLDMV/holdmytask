/**
 *
 *	@Project: @cldmv/holdmytask
 *	@Filename: /tests/PriorityKeyValidation.test.vitest.mjs
 *	@Date: 2026-10-03T17:24:45-07:00 (1791073485)
 *	@Author: Nate Corcoran <CLDMV>
 *	@Email: <Shinrai@users.noreply.github.com>
 *	-----
 *	@Last modified by: Nate Corcoran <CLDMV> (Shinrai@users.noreply.github.com)
 *	@Last modified time: 2026-10-03T17:25:44-07:00 (1791073544)
 *	-----
 *	@Copyright: Copyright (c) 2013-2026 Catalyzed Motivation Inc. All rights reserved.
 *
 */

import { test, expect, describe } from "vitest";
import { HoldMyTask } from "../src/hold-my-task.mjs";

// #54: priority keys that aren't integers used to be dropped (or truncated) silently.
const collectWarnings = async (options) => {
	const queue = new HoldMyTask({ autoStart: false, ...options });
	const warnings = [];
	queue.on("warning", (w) => warnings.push(w));
	await new Promise((resolve) => setImmediate(resolve));
	return { queue, warnings: warnings.filter((w) => w.type === "invalid-priority") };
};

describe("priority key validation", () => {
	test("a non-numeric priorities key emits an invalid-priority warning and is ignored", async () => {
		const { queue, warnings } = await collectWarnings({ priorities: { high: { postDelay: 100 }, 1: { postDelay: 50 } } });
		expect(warnings).toEqual([
			{
				type: "invalid-priority",
				message: expect.stringContaining("'high'"),
				option: "priorities",
				key: "high",
				priority: null
			}
		]);
		expect(queue.getPriorityConfigurations()).toEqual({ 1: expect.objectContaining({ postDelay: 50 }) });
		queue.destroy();
	});

	test("a non-integer key that parseInt truncates warns and keeps the truncated priority", async () => {
		const { queue, warnings } = await collectWarnings({ priorities: { "2.5": { postDelay: 25 } } });
		expect(warnings).toEqual([expect.objectContaining({ type: "invalid-priority", option: "priorities", key: "2.5", priority: 2 })]);
		expect(warnings[0].message).toContain("priority 2");
		expect(queue.getPriorityConfig(2).postDelay).toBe(25);
		queue.destroy();
	});

	test("the deprecated delays option is validated the same way", async () => {
		const { queue, warnings } = await collectWarnings({ delays: { low: 10, 3: 30 } });
		expect(warnings).toEqual([expect.objectContaining({ type: "invalid-priority", option: "delays", key: "low", priority: null })]);
		expect(queue.getPriorityConfig(3).postDelay).toBe(30);
		queue.destroy();
	});

	test("integer keys, including negative ones, produce no invalid-priority warning", async () => {
		const { queue, warnings } = await collectWarnings({
			priorities: { 0: { postDelay: 1 }, 10: { postDelay: 2 }, "-1": { postDelay: 3 } }
		});
		expect(warnings).toEqual([]);
		expect(queue.getPriorityConfig(-1).postDelay).toBe(3);
		queue.destroy();
	});

	test("a key with a null config is skipped without a warning", async () => {
		const { queue, warnings } = await collectWarnings({ priorities: { 1: null } });
		expect(warnings).toEqual([]);
		queue.destroy();
	});
});
