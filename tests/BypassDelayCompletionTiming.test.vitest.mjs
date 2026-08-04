import { test, expect, describe } from "vitest";
import { HoldMyTask } from "../src/hold-my-task.mjs";

// Isolated from HoldMyTask.test.vitest.mjs: this test hangs until the 30s Vitest
// timeout on the `lts/*` CI matrix job specifically (never on the explicit 20/22/24
// jobs running the identical Node binary), and never reproduces locally even under
// CPU throttling. Splitting it into its own file removes it from the tail end of a
// 72-test file where ~30 prior HoldMyTask instances are never destroy()'d, to check
// whether accumulated per-instance timer/state leakage from earlier tests in the same
// file is a factor.
describe.each([
	{ smartScheduling: true, mode: "Smart Scheduling" },
	{ smartScheduling: false, mode: "Traditional Polling" }
])("HoldMyTask with $mode", ({ smartScheduling }) => {
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

		// Task 2: Same priority but bypasses the delay from task1
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

		await new Promise((resolve) => q.once("drain", resolve));

		try {
			expect(results).toEqual(["task1", "task2", "task3"]); // Normal priority order, task2 bypasses task1's delay

			// Task2 bypasses task1's delay (should start immediately after task1)
			const task1ToTask2Gap = timestamps[1] - timestamps[0];
			expect(task1ToTask2Gap).toBeLessThan(100);

			// Task3 waits for task2's completion delay (200ms since task2 is priority 1)
			const task2ToTask3Gap = timestamps[2] - timestamps[1];
			expect(task2ToTask3Gap).toBeGreaterThan(150);
		} finally {
			q.destroy();
		}
	});
});
