/**
 *
 *	@Project: @cldmv/holdmytask
 *	@Filename: /examples/old/timing-analysis.mjs
 *	@Date: 2025-11-12T17:17:47-08:00 (1762996667)
 *	@Author: Nate Corcoran <CLDMV>
 *	@Email: <Shinrai@users.noreply.github.com>
 *	-----
 *	@Last modified by: Nate Corcoran <CLDMV> (Shinrai@users.noreply.github.com)
 *	@Last modified time: 2026-10-02T12:20:26-07:00 (1790968826)
 *	-----
 *	@Copyright: Copyright (c) 2013-2026 Catalyzed Motivation Inc. All rights reserved.
 *
 */

/**
 * Detailed Analysis of Coalescing Timing Issues
 *
 * This test demonstrates the fundamental timing problem with coalescing:
 * Info requests get coalesced and executed before all the volume commands they're supposed to reflect.
 */

import { PseudoDevice, DeviceController } from "./device-simulation.mjs";

/**
 * Enhanced controller that logs detailed timing information
 */
class TimingAnalysisController extends DeviceController {
	constructor(device, queueOptions = {}) {
		super(device, queueOptions);
		this.commandCounter = 0;
		this.timingLog = [];
	}

	async volumeUp(amount = 1) {
		const commandId = ++this.commandCounter;
		const startTime = Date.now();

		console.log(`🎮 [${commandId}] User: Volume up +${amount} at ${startTime}`);

		// Step 1: Send volume command (no coalescing)
		const volumePromise = this.queue.enqueue(
			async () => {
				const execTime = Date.now();
				console.log(`🔄 [${commandId}] Volume command executing at ${execTime} (delay: ${execTime - startTime}ms)`);
				const result = await this.device.volumeCommand(amount);
				console.log(`✅ [${commandId}] Volume command completed at ${Date.now()}`);
				return result;
			},
			{
				metadata: { type: "volume-command", commandId, amount }
			}
		);

		// Step 2: Get info (WITH coalescing) - this is where the problem occurs
		const infoPromise = this.queue.enqueue(
			async () => {
				const execTime = Date.now();
				console.log(`📊 [${commandId}] Info request executing at ${execTime} (delay: ${execTime - startTime}ms)`);
				const result = await this.device.getInfo();
				console.log(`📋 [${commandId}] Info request completed at ${Date.now()}: volume=${result.volume}`);
				return result;
			},
			{
				coalescingKey: "device-info-update",
				metadata: { type: "info-request", commandId }
			}
		);

		// Wait for both
		const [volumeResult, infoResult] = await Promise.all([volumePromise, infoPromise]);

		const endTime = Date.now();

		const timing = {
			commandId,
			startTime,
			endTime,
			totalDuration: endTime - startTime,
			volumeCommand: volumeResult,
			infoResult: infoResult,
			expectedVolume: this.device.getStats().currentVolume,
			reportedVolume: infoResult.volume
		};

		this.timingLog.push(timing);

		console.log(
			`🏁 [${commandId}] Command complete at ${endTime}: expected=${timing.expectedVolume}, reported=${timing.reportedVolume}, match=${timing.expectedVolume === timing.reportedVolume ? "✅" : "❌"}`
		);

		return timing;
	}

	getTimingAnalysis() {
		return {
			timingLog: this.timingLog,
			deviceStats: this.device.getStats()
		};
	}
}

/**
 * Test with reference counting approach
 */
class ReferenceCountingController extends DeviceController {
	constructor(device, queueOptions = {}) {
		super(device, queueOptions);
		this.pendingVolumeCommands = new Map(); // coalescingKey -> count
		this.commandCounter = 0;
	}

	async volumeUp(amount = 1) {
		const commandId = ++this.commandCounter;
		const coalescingKey = "device-info-update";

		// Track that we're adding another command that needs info
		const currentPending = this.pendingVolumeCommands.get(coalescingKey) || 0;
		this.pendingVolumeCommands.set(coalescingKey, currentPending + 1);

		console.log(`🎮 [${commandId}] Volume up +${amount} (pending commands for info: ${currentPending + 1})`);

		// Volume command (no coalescing)
		const volumePromise = this.queue.enqueue(async () => {
			console.log(`🔄 [${commandId}] Executing volume command`);
			const result = await this.device.volumeCommand(amount);

			// Decrement pending count when volume command completes
			const pending = this.pendingVolumeCommands.get(coalescingKey) || 0;
			this.pendingVolumeCommands.set(coalescingKey, pending - 1);
			console.log(`✅ [${commandId}] Volume command complete (remaining pending: ${pending - 1})`);

			return result;
		});

		// Info request with reference counting
		const infoPromise = this.queue.enqueue(
			async () => {
				const pendingCount = this.pendingVolumeCommands.get(coalescingKey) || 0;
				console.log(`📊 [${commandId}] Info request executing (pending commands: ${pendingCount})`);

				if (pendingCount > 0) {
					console.log(`⚠️  [${commandId}] WARNING: Info request running with ${pendingCount} pending volume commands!`);
				}

				const result = await this.device.getInfo();
				console.log(`📋 [${commandId}] Info result: volume=${result.volume}`);
				return result;
			},
			{
				coalescingKey,
				metadata: { type: "info-request", commandId }
			}
		);

		const [volumeResult, infoResult] = await Promise.all([volumePromise, infoPromise]);

		return {
			commandId,
			volumeResult,
			infoResult,
			expectedVolume: this.device.getStats().currentVolume,
			reportedVolume: infoResult.volume,
			accurate: this.device.getStats().currentVolume === infoResult.volume
		};
	}
}

async function analyzeTimingIssues() {
	console.log("🔬 TIMING ANALYSIS: Coalescing Race Conditions\n");

	// Test 1: Show the timing problem
	console.log("📊 Test 1: Timing Analysis");
	console.log("=".repeat(50));

	const device1 = new PseudoDevice(50);
	const controller1 = new TimingAnalysisController(device1, {
		coalescingWindowDuration: 100,
		coalescingMaxDelay: 200
	});

	// Send 3 rapid commands
	const results1 = [];
	for (let i = 1; i <= 3; i++) {
		const promise = controller1.volumeUp(1);
		results1.push(promise);
		if (i < 3) await new Promise((resolve) => setTimeout(resolve, 10));
	}

	const completed1 = await Promise.all(results1);
	const analysis1 = controller1.getTimingAnalysis();

	console.log("\n📈 TIMING ANALYSIS RESULTS:");
	completed1.forEach((result, i) => {
		const status = result.expectedVolume === result.reportedVolume ? "✅" : "❌";
		console.log(`  Command ${i + 1}: Expected ${result.expectedVolume}, Got ${result.reportedVolume} ${status}`);
	});

	console.log(
		`\n📊 Device Stats: ${analysis1.deviceStats.totalCommands} commands, ${analysis1.deviceStats.totalInfoRequests} info requests`
	);
	console.log(`🎯 Final Volume: ${analysis1.deviceStats.currentVolume}`);

	controller1.destroy();

	// Test 2: Reference counting approach
	console.log("\n\n📊 Test 2: Reference Counting Approach");
	console.log("=".repeat(50));

	const device2 = new PseudoDevice(50);
	const controller2 = new ReferenceCountingController(device2, {
		coalescingWindowDuration: 100,
		coalescingMaxDelay: 200
	});

	const results2 = [];
	for (let i = 1; i <= 3; i++) {
		const promise = controller2.volumeUp(1);
		results2.push(promise);
		if (i < 3) await new Promise((resolve) => setTimeout(resolve, 10));
	}

	const completed2 = await Promise.all(results2);

	console.log("\n📈 REFERENCE COUNTING RESULTS:");
	completed2.forEach((result, i) => {
		const status = result.accurate ? "✅" : "❌";
		console.log(`  Command ${i + 1}: Expected ${result.expectedVolume}, Got ${result.reportedVolume} ${status}`);
	});

	const finalStats2 = device2.getStats();
	console.log(`\n📊 Device Stats: ${finalStats2.totalCommands} commands, ${finalStats2.totalInfoRequests} info requests`);
	console.log(`🎯 Final Volume: ${finalStats2.currentVolume}`);

	controller2.destroy();
}

export { TimingAnalysisController, ReferenceCountingController, analyzeTimingIssues };
