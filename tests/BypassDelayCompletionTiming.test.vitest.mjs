import { test, expect, describe, vi } from "vitest";
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

// Regression test for the scheduler deadlock fixed alongside the test above:
// _scheduleNextTick() only derived its next wake time from pendingHeap and
// nextAvailableTime. Called at the exact moment nextAvailableTime had just
// expired (a narrow race against schedulerTick's own timing), with pendingHeap
// empty, nextTime fell through to Infinity - arming a ~24.8-day setTimeout and
// stranding any task already sitting in readyHeap forever. Traditional Polling
// only: Smart Scheduling uses a different scheduleSmartTimeout()/runScheduler()
// path unaffected by this bug. Uses the constructor's injectable `now` option to
// force the exact race deterministically instead of racing real wall-clock time.
test("a readyHeap task is not stranded when its delay has just expired (regression)", async () => {
	let fakeNow = Date.now();
	const q = new HoldMyTask({
		concurrency: 1,
		delays: { 1: 50 },
		smartScheduling: false,
		now: () => fakeNow
	});
	const results = [];

	q.enqueue(
		() => "task1",
		(err, r) => results.push(r),
		{ priority: 1 }
	);
	q.enqueue(
		() => "task2",
		(err, r) => results.push(r),
		{ priority: 1 }
	);

	// Wait for task1 to actually run and complete (real time - the default poll
	// tick is 25ms, so this needs to clear a few real ticks; the queue's own delay
	// bookkeeping uses the injected now(), not real time).
	await new Promise((resolve) => setTimeout(resolve, 120));

	try {
		// task2 should now be sitting in readyHeap, blocked by task1's post-completion delay.
		expect(q.readyHeap.size()).toBe(1);
		expect(q.pendingHeap.size()).toBe(0);
		expect(q.nextAvailableTime).toBeGreaterThan(0);

		// Simulate wall-clock time crossing nextAvailableTime right before the
		// scheduler gets a chance to recheck it - the exact race window that caused
		// the deadlock.
		fakeNow = q.nextAvailableTime + 1;

		const setTimeoutSpy = vi.spyOn(global, "setTimeout");
		let armedCalls;
		try {
			q._scheduleNextTick();
		} finally {
			// Capture the recorded calls BEFORE restoring, and restore in finally so the
			// global spy never leaks into later tests even if _scheduleNextTick throws.
			armedCalls = setTimeoutSpy.mock.calls.slice();
			setTimeoutSpy.mockRestore();
		}

		if (armedCalls.length > 0) {
			const armedDelay = armedCalls.at(-1)[1];
			// Before the fix this was ~2147483647 (the 24.8-day fallback), stranding
			// task2 forever. After the fix it must be an imminent recheck.
			expect(armedDelay).toBeLessThan(1000);
		} else {
			// Took the interval branch instead - also an imminent recheck, also fine.
			expect(q.intervalId).toBeTruthy();
		}
	} finally {
		q.destroy();
	}
});
