/**
 * Analysis: The Coalescing Race Condition Problem
 *
 * This demonstrates the fundamental issue with coalescing in queue systems:
 * The queue doesn't know what the consuming module is doing, and the consuming
 * module doesn't know when coalescing will trigger.
 */

import { HoldMyTask } from "../../index.mjs";

// PROBLEMATIC IMPLEMENTATION (from previous example)
class ProblematicDeviceController {
	constructor() {
		this.queue = new HoldMyTask({
			smartScheduling: true,
			concurrency: 1,
			coalescingWindowDuration: 100,
			coalescingMaxDelay: 500
		});

		this.deviceState = { volume: 50 };
		// ❌ RACE CONDITION: This shared state gets corrupted by concurrent access
		this.pendingVolumeChanges = new Map();
	}

	async volumeUp(amount = 1) {
		const coalescingKey = "volume-update";
		// ❌ PROBLEM: Multiple rapid calls overwrite each other
		const currentPending = this.pendingVolumeChanges.get(coalescingKey) || 0;
		const newPending = currentPending + amount;
		this.pendingVolumeChanges.set(coalescingKey, newPending);

		return this.queue.enqueue(() => this.updateDeviceInfo(coalescingKey), { coalescingKey });
	}

	async updateDeviceInfo(coalescingKey) {
		// ❌ PROBLEM: By the time this runs, pendingVolumeChanges might have been
		// overwritten by a new coalescing group that started after this one
		const totalChange = this.pendingVolumeChanges.get(coalescingKey) || 0;
		console.log(`❌ Applying change: +${totalChange} (but we lost some!)`);

		this.deviceState.volume += totalChange;
		this.pendingVolumeChanges.delete(coalescingKey);

		return { ...this.deviceState };
	}
}

// SOLUTION 1: Task-Specific Accumulation
class TaskAccumulatingController {
	constructor() {
		this.queue = new HoldMyTask({
			smartScheduling: true,
			concurrency: 1,
			coalescingWindowDuration: 100,
			coalescingMaxDelay: 500
		});

		this.deviceState = { volume: 50 };
		this.volumeChangeSeq = 0; // Sequence number for tracking
	}

	async volumeUp(amount = 1) {
		const changeId = ++this.volumeChangeSeq;
		const coalescingKey = "volume-update";

		console.log(`📢 Volume up +${amount} (changeId: ${changeId})`);

		// ✅ SOLUTION: Pass the change amount directly to the task
		// Each coalescing group accumulates its own changes
		return this.queue.enqueue(() => this.updateDeviceInfo(amount), {
			coalescingKey,
			metadata: { changeId, amount }
		});
	}

	async updateDeviceInfo(thisTaskAmount) {
		// ✅ The coalescing system should handle accumulation
		// But currently it doesn't - this is a limitation!
		console.log(`✅ Applying change: +${thisTaskAmount} (but this is wrong for coalescing!)`);

		this.deviceState.volume += thisTaskAmount;
		return { ...this.deviceState };
	}
}

// SOLUTION 2: No Coalescing - Let the Queue Handle It
class QueueOnlyController {
	constructor() {
		this.queue = new HoldMyTask({
			smartScheduling: true,
			concurrency: 1 // Process one at a time naturally
			// ✅ No coalescing - just fast queuing with smart scheduling
		});

		this.deviceState = { volume: 50 };
	}

	async volumeUp(amount = 1) {
		console.log(`📢 Volume up +${amount} (queued individually)`);

		// ✅ Each command is its own task - no coalescing complexity
		return this.queue.enqueue(async () => {
			console.log(`🔄 Processing individual volume change: +${amount}`);

			// Simulate device update
			await new Promise((resolve) => setTimeout(resolve, 10));

			this.deviceState.volume += amount;
			console.log(`✅ Volume: ${this.deviceState.volume}`);

			return { ...this.deviceState };
		});
	}
}

// SOLUTION 3: External State Management
class ExternalStateController {
	constructor() {
		this.queue = new HoldMyTask({
			smartScheduling: true,
			concurrency: 1
		});

		// ✅ Consuming module manages optimistic state
		this.optimisticVolume = 50;
		this.confirmedVolume = 50;
		this.pendingConfirmations = 0;
	}

	async volumeUp(amount = 1) {
		// ✅ Optimistic update happens immediately
		this.optimisticVolume += amount;
		this.pendingConfirmations++;

		console.log(`📢 Volume up +${amount} (optimistic: ${this.optimisticVolume}, confirmed: ${this.confirmedVolume})`);

		// ✅ Queue individual confirmation tasks (no coalescing needed)
		const confirmationPromise = this.queue.enqueue(async () => {
			console.log(`🔄 Confirming volume change: +${amount}`);

			// Simulate device communication
			await new Promise((resolve) => setTimeout(resolve, 20));

			this.confirmedVolume += amount;
			this.pendingConfirmations--;

			console.log(`✅ Confirmed volume: ${this.confirmedVolume} (pending: ${this.pendingConfirmations})`);

			return {
				optimistic: this.optimisticVolume,
				confirmed: this.confirmedVolume,
				pending: this.pendingConfirmations
			};
		});

		// ✅ Return optimistic state immediately, confirmation happens async
		return {
			optimistic: this.optimisticVolume,
			confirmed: this.confirmedVolume,
			pending: this.pendingConfirmations,
			confirmation: confirmationPromise
		};
	}
}

// Test all approaches
async function analyzeApproaches() {
	console.log("🔍 ANALYSIS: Coalescing Race Condition Problem\n");

	console.log("❌ PROBLEMATIC APPROACH:");
	const problematic = new ProblematicDeviceController();

	// Rapid commands that will cause race condition
	const promises1 = [];
	for (let i = 1; i <= 5; i++) {
		promises1.push(problematic.volumeUp(1));
		if (i < 5) await new Promise((resolve) => setTimeout(resolve, 10));
	}

	const results1 = await Promise.all(promises1);
	console.log(`Expected final volume: 55, Actual: ${results1[0].volume}\n`);

	console.log("✅ SOLUTION 2: Queue-Only Approach (No Coalescing):");
	const queueOnly = new QueueOnlyController();

	const promises2 = [];
	for (let i = 1; i <= 5; i++) {
		promises2.push(queueOnly.volumeUp(1));
	}

	const results2 = await Promise.all(promises2);
	console.log(`Expected final volume: 55, Actual: ${results2[4].volume}\n`);

	console.log("✅ SOLUTION 3: External State Management:");
	const external = new ExternalStateController();

	console.log("Rapid volume commands with optimistic updates:");
	for (let i = 1; i <= 5; i++) {
		const result = external.volumeUp(1);
		console.log(`  Command ${i}: Optimistic=${result.optimistic}, Confirmed=${result.confirmed}, Pending=${result.pending}`);
		if (i < 5) await new Promise((resolve) => setTimeout(resolve, 5));
	}

	// Wait for all confirmations
	await new Promise((resolve) => setTimeout(resolve, 200));
	console.log(`Final state: Optimistic=${external.optimisticVolume}, Confirmed=${external.confirmedVolume}\n`);

	// Cleanup
	problematic.queue.destroy();
	queueOnly.queue.destroy();
	external.queue.destroy();
}

export { analyzeApproaches };
