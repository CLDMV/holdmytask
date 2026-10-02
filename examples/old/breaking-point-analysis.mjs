/**
 *
 *	@Project: @cldmv/holdmytask
 *	@Filename: /examples/old/breaking-point-analysis.mjs
 *	@Date: 2025-11-12T17:17:47-08:00 (1762996667)
 *	@Author: Nate Corcoran <CLDMV>
 *	@Email: <Shinrai@users.noreply.github.com>
 *	-----
 *	@Last modified by: Nate Corcoran <CLDMV> (Shinrai@users.noreply.github.com)
 *	@Last modified time: 2026-10-02T12:20:22-07:00 (1790968822)
 *	-----
 *	@Copyright: Copyright (c) 2013-2026 Catalyzed Motivation Inc. All rights reserved.
 *
 */

/**
 * Comprehensive Timing Test: Find the Breaking Point
 *
 * This test systematically varies device command delays to find exactly
 * when the coalescing race condition becomes a problem.
 */

import { HoldMyTask } from "../../index.mjs";

/**
 * Device with configurable delays
 */
class ConfigurableDelayDevice {
	constructor(initialVolume = 50, commandDelay = 30, infoDelay = 20) {
		this.volume = initialVolume;
		this.commandCount = 0;
		this.infoRequestCount = 0;
		this.commandDelay = commandDelay;
		this.infoDelay = infoDelay;

		console.log(`🔌 Device: volume=${this.volume}, commandDelay=${commandDelay}ms, infoDelay=${infoDelay}ms`);
	}

	async volumeCommand(change) {
		this.commandCount++;
		const commandId = this.commandCount;
		const startTime = Date.now();

		console.log(`📱 [CMD-${commandId}] Device received volume command: ${change > 0 ? "+" : ""}${change} at ${startTime}`);

		// Configurable device processing delay
		await new Promise((resolve) => setTimeout(resolve, this.commandDelay));

		const oldVolume = this.volume;
		this.volume = Math.max(0, Math.min(100, this.volume + change));
		const endTime = Date.now();

		console.log(`🔊 [CMD-${commandId}] Device processed: ${oldVolume} → ${this.volume} at ${endTime} (took ${endTime - startTime}ms)`);

		return {
			commandId,
			oldVolume,
			newVolume: this.volume,
			change: this.volume - oldVolume,
			processingTime: endTime - startTime
		};
	}

	async getInfo() {
		this.infoRequestCount++;
		const requestId = this.infoRequestCount;
		const startTime = Date.now();

		console.log(`📊 [INFO-${requestId}] Device received info request at ${startTime}`);

		// Configurable device query delay
		await new Promise((resolve) => setTimeout(resolve, this.infoDelay));

		const endTime = Date.now();
		const info = {
			requestId,
			volume: this.volume,
			timestamp: endTime,
			totalCommands: this.commandCount,
			totalInfoRequests: this.infoRequestCount,
			processingTime: endTime - startTime
		};

		console.log(`📋 [INFO-${requestId}] Device responded: volume=${this.volume} at ${endTime} (took ${endTime - startTime}ms)`);

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
 * Controller for timing tests
 */
class TimingTestController {
	constructor(device, coalescingWindowDuration = 100) {
		this.device = device;
		this.coalescingWindowDuration = coalescingWindowDuration;
		this.queue = new HoldMyTask({
			smartScheduling: true,
			concurrency: 1,
			coalescingWindowDuration,
			coalescingMaxDelay: coalescingWindowDuration * 5,
			coalescingMultipleCallbacks: false,
			coalescingResolveAllPromises: true
		});
		this.commandCounter = 0;
		this.results = [];
	}

	async volumeUp(amount = 1) {
		const commandId = ++this.commandCounter;
		const userActionTime = Date.now();

		console.log(`🎮 [USER-${commandId}] Volume up +${amount} at ${userActionTime}`);

		// Volume command (no coalescing)
		const volumePromise = this.queue.enqueue(async () => {
			const execStart = Date.now();
			console.log(`🔄 [USER-${commandId}] Volume command queued→executing: ${execStart - userActionTime}ms delay`);
			const result = await this.device.volumeCommand(amount);
			const execEnd = Date.now();
			console.log(`✅ [USER-${commandId}] Volume command complete: total ${execEnd - userActionTime}ms`);
			return { ...result, queueDelay: execStart - userActionTime, totalTime: execEnd - userActionTime };
		});

		// Info request (WITH coalescing)
		const infoPromise = this.queue.enqueue(
			async () => {
				const execStart = Date.now();
				console.log(`📊 [USER-${commandId}] Info request queued→executing: ${execStart - userActionTime}ms delay`);
				const result = await this.device.getInfo();
				const execEnd = Date.now();
				console.log(`📋 [USER-${commandId}] Info request complete: total ${execEnd - userActionTime}ms, volume=${result.volume}`);
				return { ...result, queueDelay: execStart - userActionTime, totalTime: execEnd - userActionTime };
			},
			{
				coalescingKey: "device-info-update"
			}
		);

		const [volumeResult, infoResult] = await Promise.all([volumePromise, infoPromise]);
		const completionTime = Date.now();

		const result = {
			commandId,
			userActionTime,
			completionTime,
			totalDuration: completionTime - userActionTime,
			volumeResult,
			infoResult,
			deviceVolumeAtCompletion: this.device.getStats().currentVolume,
			infoReportsVolume: infoResult.volume,
			isAccurate: this.device.getStats().currentVolume === infoResult.volume,
			timingData: {
				volumeQueueDelay: volumeResult.queueDelay,
				volumeProcessingTime: volumeResult.processingTime,
				infoQueueDelay: infoResult.queueDelay,
				infoProcessingTime: infoResult.processingTime
			}
		};

		this.results.push(result);

		const status = result.isAccurate ? "✅" : "❌";
		console.log(
			`🏁 [USER-${commandId}] COMPLETE ${status}: expected=${result.deviceVolumeAtCompletion}, reported=${result.infoReportsVolume}, total=${result.totalDuration}ms`
		);
		console.log("");

		return result;
	}

	getResults() {
		return {
			results: this.results,
			deviceStats: this.device.getStats(),
			coalescingWindowDuration: this.coalescingWindowDuration
		};
	}

	destroy() {
		this.queue.destroy();
	}
}

/**
 * Test different device delays to find the breaking point
 */
async function findBreakingPoint() {
	console.log("🔬 FINDING THE BREAKING POINT: Device Delay vs Coalescing Window\n");

	const testConfigurations = [
		// Format: [deviceCommandDelay, coalescingWindow, description]
		[10, 100, "Fast device (10ms), Standard coalescing (100ms)"],
		[50, 100, "Medium device (50ms), Standard coalescing (100ms)"],
		[100, 100, "Slow device (100ms), Standard coalescing (100ms)"],
		[150, 100, "Very slow device (150ms), Standard coalescing (100ms)"],
		[200, 100, "Ultra slow device (200ms), Standard coalescing (100ms)"],
		[300, 100, "Extremely slow device (300ms), Standard coalescing (100ms)"],
		[500, 100, "Realistic device (500ms), Standard coalescing (100ms)"],

		// Test different coalescing windows with realistic device
		[500, 50, "Realistic device (500ms), Fast coalescing (50ms)"],
		[500, 200, "Realistic device (500ms), Slow coalescing (200ms)"],
		[500, 600, "Realistic device (500ms), Very slow coalescing (600ms)"],
		[500, 1000, "Realistic device (500ms), Ultra slow coalescing (1000ms)"]
	];

	const summaryResults = [];

	for (const [commandDelay, coalescingWindow, description] of testConfigurations) {
		console.log(`🧪 Testing: ${description}`);
		console.log("=".repeat(80));

		const device = new ConfigurableDelayDevice(50, commandDelay, 20);
		const controller = new TimingTestController(device, coalescingWindow);

		// Send 3 rapid commands with 15ms between user actions
		const promises = [];
		for (let i = 1; i <= 3; i++) {
			const promise = controller.volumeUp(1);
			promises.push(promise);
			if (i < 3) await new Promise((resolve) => setTimeout(resolve, 15));
		}

		const results = await Promise.all(promises);
		const summary = controller.getResults();

		// Calculate statistics
		const accurateCommands = results.filter((r) => r.isAccurate).length;
		const inaccurateCommands = 3 - accurateCommands;
		const maxDuration = Math.max(...results.map((r) => r.totalDuration));
		const avgDuration = results.reduce((sum, r) => sum + r.totalDuration, 0) / results.length;

		const testResult = {
			description,
			commandDelay,
			coalescingWindow,
			accurateCommands,
			inaccurateCommands,
			accuracyRate: (accurateCommands / 3) * 100,
			maxDuration,
			avgDuration,
			deviceCommands: summary.deviceStats.totalCommands,
			deviceInfoRequests: summary.deviceStats.totalInfoRequests,
			coalescingEfficiency: ((3 - summary.deviceStats.totalInfoRequests) / 3) * 100
		};

		summaryResults.push(testResult);

		console.log(`📊 RESULTS: ${accurateCommands}/3 accurate (${testResult.accuracyRate.toFixed(1)}%)`);
		console.log(`⏱️  TIMING: max=${maxDuration}ms, avg=${avgDuration.toFixed(1)}ms`);
		console.log(`🔄 DEVICE: ${summary.deviceStats.totalCommands} commands, ${summary.deviceStats.totalInfoRequests} info requests`);
		console.log(`⚡ EFFICIENCY: ${testResult.coalescingEfficiency.toFixed(1)}% info requests saved`);
		console.log("");

		controller.destroy();

		// Add delay between tests
		await new Promise((resolve) => setTimeout(resolve, 100));
	}

	console.log("\n📈 BREAKING POINT ANALYSIS:");
	console.log("=".repeat(100));
	console.log("| Device Delay | Coalescing Window | Accuracy | Efficiency | Status |");
	console.log("|--------------|-------------------|----------|------------|--------|");

	summaryResults.forEach((result) => {
		const status = result.accuracyRate === 100 ? "✅ SAFE" : result.accuracyRate >= 66.7 ? "⚠️  RISKY" : "❌ BROKEN";
		console.log(
			`| ${result.commandDelay.toString().padEnd(12)} | ${result.coalescingWindow.toString().padEnd(17)} | ${result.accuracyRate.toFixed(1).padEnd(8)}% | ${result.coalescingEfficiency.toFixed(1).padEnd(10)}% | ${status.padEnd(6)} |`
		);
	});

	console.log("\n🎯 KEY FINDINGS:");
	const brokenConfigs = summaryResults.filter((r) => r.accuracyRate < 100);
	const firstBroken = brokenConfigs[0];

	if (firstBroken) {
		console.log(
			`❌ Race condition first appears at: ${firstBroken.commandDelay}ms device delay with ${firstBroken.coalescingWindow}ms coalescing window`
		);
		console.log(
			`📏 Critical ratio: Device delay ${firstBroken.commandDelay >= firstBroken.coalescingWindow ? "≥" : "<"} Coalescing window`
		);
	} else {
		console.log("✅ No race conditions detected in tested configurations");
	}

	const safestConfig = summaryResults
		.filter((r) => r.accuracyRate === 100)
		.sort((a, b) => b.coalescingEfficiency - a.coalescingEfficiency)[0];
	if (safestConfig) {
		console.log(
			`🏆 Best safe configuration: ${safestConfig.commandDelay}ms device delay with ${safestConfig.coalescingWindow}ms coalescing window`
		);
		console.log(`   Achieves ${safestConfig.coalescingEfficiency.toFixed(1)}% efficiency with 100% accuracy`);
	}

	return summaryResults;
}

export { ConfigurableDelayDevice, TimingTestController, findBreakingPoint };
