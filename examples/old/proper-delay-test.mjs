/**
 *
 *	@Project: @cldmv/holdmytask
 *	@Filename: /examples/old/proper-delay-test.mjs
 *	@Date: 2025-11-12T17:17:47-08:00 (1762996667)
 *	@Author: Nate Corcoran <CLDMV>
 *	@Email: <Shinrai@users.noreply.github.com>
 *	-----
 *	@Last modified by: Nate Corcoran <CLDMV> (Shinrai@users.noreply.github.com)
 *	@Last modified time: 2026-10-02T12:20:23-07:00 (1790968823)
 *	-----
 *	@Copyright: Copyright (c) 2013-2026 Catalyzed Motivation Inc. All rights reserved.
 *
 */

/**
 * Test with Proper Queue Delays
 *
 * This tests the scenario you described:
 * - Volume commands with 100ms delay (after completion)
 * - Info requests with 500ms delay (after completion)
 * - This should allow 2 volume updates to complete before info request
 */

import { HoldMyTask } from "../../index.mjs";

class SimpleDevice {
	constructor(initialVolume = 50) {
		this.volume = initialVolume;
		this.commandCount = 0;
		this.infoRequestCount = 0;
	}

	async volumeCommand(change) {
		this.commandCount++;
		const commandId = this.commandCount;

		console.log(`📱 [CMD-${commandId}] Volume command: ${change > 0 ? "+" : ""}${change}`);

		// Fast device processing (10ms)
		await new Promise((resolve) => setTimeout(resolve, 10));

		const oldVolume = this.volume;
		this.volume = Math.max(0, Math.min(100, this.volume + change));

		console.log(`🔊 [CMD-${commandId}] Processed: ${oldVolume} → ${this.volume}`);

		return {
			commandId,
			oldVolume,
			newVolume: this.volume,
			change: this.volume - oldVolume
		};
	}

	async getInfo() {
		this.infoRequestCount++;
		const requestId = this.infoRequestCount;

		console.log(`📊 [INFO-${requestId}] Info request`);

		// Fast info query (5ms)
		await new Promise((resolve) => setTimeout(resolve, 5));

		const info = {
			requestId,
			volume: this.volume,
			timestamp: Date.now(),
			totalCommands: this.commandCount,
			totalInfoRequests: this.infoRequestCount
		};

		console.log(`📋 [INFO-${requestId}] Response: volume=${this.volume}`);

		return info;
	}

	getStats() {
		return {
			currentVolume: this.volume,
			totalCommands: this.commandCount,
			totalInfoRequests: this.infoRequestCount
		};
	}
}

/**
 * Controller using proper queue delays
 */
class ProperDelayController {
	constructor(device) {
		this.device = device;
		this.queue = new HoldMyTask({
			smartScheduling: true,
			concurrency: 1,
			coalescingWindowDuration: 500, // 500ms coalescing window
			delays: {
				0: 100, // Volume commands: 100ms delay after completion
				1: 500 // Info requests: 500ms delay after completion
			}
		});
		this.commandCounter = 0;
	}

	async volumeUp(amount = 1) {
		const commandId = ++this.commandCounter;
		const startTime = Date.now();

		console.log(`\n🎮 [USER-${commandId}] Volume up +${amount} at ${startTime}`);

		// Volume command with priority 0 (100ms delay after completion)
		const volumePromise = this.queue.enqueue(
			async () => {
				const execTime = Date.now();
				console.log(`🔄 [USER-${commandId}] Volume executing at ${execTime} (${execTime - startTime}ms from user action)`);
				const result = await this.device.volumeCommand(amount);
				const doneTime = Date.now();
				console.log(`✅ [USER-${commandId}] Volume complete at ${doneTime} (${doneTime - startTime}ms total)`);
				return result;
			},
			{
				priority: 0, // Uses 100ms delay
				metadata: { type: "volume-command", commandId }
			}
		);

		// Info request with priority 1 (500ms delay after completion) and coalescing
		const infoPromise = this.queue.enqueue(
			async () => {
				const execTime = Date.now();
				console.log(`📊 [USER-${commandId}] Info executing at ${execTime} (${execTime - startTime}ms from user action)`);
				const result = await this.device.getInfo();
				const doneTime = Date.now();
				console.log(`📋 [USER-${commandId}] Info complete at ${doneTime} (${doneTime - startTime}ms total), volume=${result.volume}`);
				return result;
			},
			{
				priority: 1, // Uses 500ms delay
				coalescingKey: "device-info-update",
				metadata: { type: "info-request", commandId }
			}
		);

		const [volumeResult, infoResult] = await Promise.all([volumePromise, infoPromise]);
		const endTime = Date.now();

		const result = {
			commandId,
			startTime,
			endTime,
			duration: endTime - startTime,
			volumeResult,
			infoResult,
			deviceVolumeAtEnd: this.device.getStats().currentVolume,
			infoReportsVolume: infoResult.volume,
			isAccurate: this.device.getStats().currentVolume === infoResult.volume
		};

		const status = result.isAccurate ? "✅" : "❌";
		console.log(
			`🏁 [USER-${commandId}] RESULT ${status}: expected=${result.deviceVolumeAtEnd}, reported=${result.infoReportsVolume}, duration=${result.duration}ms`
		);

		return result;
	}

	getQueueInfo() {
		return {
			pendingCount: this.queue.getPendingCount(),
			runningCount: this.queue.getRunningCount(),
			completedCount: this.queue.getCompletedCount()
		};
	}

	destroy() {
		this.queue.destroy();
	}
}

/**
 * Test the proper delay scenario
 */
async function testProperDelays() {
	console.log("🧪 TESTING PROPER QUEUE DELAYS");
	console.log("Volume commands: 100ms delay after completion");
	console.log("Info requests: 500ms delay after completion");
	console.log("Coalescing window: 500ms");
	console.log("Expected: 2 volume commands should complete before info request executes");
	console.log("=".repeat(80));

	const device = new SimpleDevice(50);
	const controller = new ProperDelayController(device);

	console.log(`📊 Initial: volume=${device.volume}`);

	// Send 3 rapid commands
	const promises = [];
	for (let i = 1; i <= 3; i++) {
		const promise = controller.volumeUp(1);
		promises.push(promise);

		// Small delay between user actions (15ms)
		if (i < 3) await new Promise((resolve) => setTimeout(resolve, 15));
	}

	console.log("\n⏳ Waiting for all commands to complete...\n");
	const results = await Promise.all(promises);

	console.log("\n📊 FINAL ANALYSIS:");
	console.log("=".repeat(80));

	const deviceStats = device.getStats();
	const accurateResults = results.filter((r) => r.isAccurate);

	console.log(`Expected final volume: 53 (50 + 3)`);
	console.log(`Actual device volume: ${deviceStats.currentVolume}`);
	console.log(`Accurate results: ${accurateResults.length}/3`);
	console.log(`Device commands executed: ${deviceStats.totalCommands}`);
	console.log(`Device info requests executed: ${deviceStats.totalInfoRequests}`);

	// Show timing breakdown for each command
	results.forEach((result, i) => {
		const status = result.isAccurate ? "✅" : "❌";
		console.log(
			`Command ${i + 1} ${status}: ${result.duration}ms total, expected=${deviceStats.currentVolume}, got=${result.infoReportsVolume}`
		);
	});

	const queueInfo = controller.getQueueInfo();
	console.log(
		`\nQueue final state: ${queueInfo.completedCount} completed, ${queueInfo.pendingCount} pending, ${queueInfo.runningCount} running`
	);

	controller.destroy();

	return {
		totalAccurate: accurateResults.length,
		totalTests: 3,
		accuracyRate: (accurateResults.length / 3) * 100,
		deviceCommands: deviceStats.totalCommands,
		deviceInfoRequests: deviceStats.totalInfoRequests,
		finalVolume: deviceStats.currentVolume
	};
}

export { SimpleDevice, ProperDelayController, testProperDelays };
