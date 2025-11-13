/**
 * Proper Coalescing Test: Volume Commands with Updates
 *
 * Tests 5 volume increase commands, each with:
 * - Volume command (immediate execution)
 * - Update command (coalesced with key "volume.up")
 *
 * Uses proper queue timing controls instead of device simulation.
 */

import { HoldMyTask } from "../../index.mjs";

/**
 * Simple volume system that tracks state
 */
class VolumeSystem {
	constructor(initialVolume = 50) {
		this.volume = initialVolume;
		this.commandCount = 0;
		this.updateCount = 0;
		this.log = [];
	}

	/**
	 * Execute a volume command (changes the actual volume)
	 */
	async executeVolumeCommand(change, commandId) {
		this.commandCount++;
		const startTime = Date.now();

		this.log.push(`📱 [CMD-${commandId}] Volume command: ${change > 0 ? "+" : ""}${change}`);

		// Volume command execution (just changes state, no artificial delay)
		const oldVolume = this.volume;
		this.volume = Math.max(0, Math.min(100, this.volume + change));

		const endTime = Date.now();
		this.log.push(`🔊 [CMD-${commandId}] Volume: ${oldVolume} → ${this.volume} (${endTime - startTime}ms)`);

		return {
			commandId,
			oldVolume,
			newVolume: this.volume,
			change: this.volume - oldVolume,
			executionTime: endTime - startTime
		};
	}

	/**
	 * Execute an update command (reports current state)
	 */
	async executeUpdateCommand(updateId) {
		this.updateCount++;
		const startTime = Date.now();

		this.log.push(`📊 [UPD-${updateId}] Update command`);

		// Update command execution (just reads state, no artificial delay)
		const info = {
			updateId,
			volume: this.volume,
			timestamp: Date.now(),
			totalCommands: this.commandCount,
			totalUpdates: this.updateCount
		};

		const endTime = Date.now();
		this.log.push(`📋 [UPD-${updateId}] Update: volume=${this.volume} (${endTime - startTime}ms)`);

		return info;
	}

	getState() {
		return {
			currentVolume: this.volume,
			totalCommands: this.commandCount,
			totalUpdates: this.updateCount
		};
	}

	getLog() {
		return [...this.log];
	}

	clearLog() {
		this.log = [];
	}
}

/**
 * Controller that implements volume commands with coalesced updates
 */
class VolumeController {
	constructor(volumeSystem, queueOptions = {}) {
		this.volumeSystem = volumeSystem;
		this.queue = new HoldMyTask({
			smartScheduling: true,
			concurrency: 1,
			coalescingWindowDuration: 200, // 200ms coalescing window
			coalescingMaxDelay: 1000, // Max 1000ms delay
			...queueOptions
		});
		this.commandCounter = 0;
	}

	/**
	 * Volume up command with coalesced update
	 */
	async volumeUp(amount = 1, options = {}) {
		const commandId = ++this.commandCounter;
		const userActionTime = Date.now();

		console.log(`🎮 [USER-${commandId}] Volume up +${amount} at ${userActionTime}`);

		// 1. Volume command (immediate execution)
		const volumeTaskOptions = {
			start: options.volumeStart || 0, // When volume command should start
			delay: options.volumeDelay || 0, // Delay after volume completion
			metadata: { type: "volume-command", commandId }
		};

		console.log(
			`   📤 Volume Task: start=${volumeTaskOptions.start}ms, delay=${volumeTaskOptions.delay}ms, timestamp=${volumeTaskOptions.timestamp || "calculated"}`
		);

		const volumePromise = this.queue.enqueue(async () => {
			const execStart = Date.now();
			console.log(`🔄 [USER-${commandId}] Volume command executing (${execStart - userActionTime}ms from user)`);

			const result = await this.volumeSystem.executeVolumeCommand(amount, commandId);

			const execEnd = Date.now();
			console.log(`✅ [USER-${commandId}] Volume command complete (${execEnd - userActionTime}ms total)`);

			return result;
		}, volumeTaskOptions);

		// 2. Update command (coalesced with "volume.up" key)
		const updateTaskOptions = {
			start: options.updateStart || 0, // When update command should start
			delay: options.updateDelay || 0, // Delay after update completion
			coalescingKey: "volume.up", // Coalescing key
			metadata: { type: "update-command", commandId }
		};

		console.log(
			`   📤 Update Task: start=${updateTaskOptions.start}ms, delay=${updateTaskOptions.delay}ms, timestamp=${updateTaskOptions.timestamp || "calculated"}, coalescingKey='${updateTaskOptions.coalescingKey}'`
		);

		const updatePromise = this.queue.enqueue(async () => {
			const execStart = Date.now();
			console.log(`📊 [USER-${commandId}] Update command executing (${execStart - userActionTime}ms from user)`);

			const result = await this.volumeSystem.executeUpdateCommand(commandId);

			const execEnd = Date.now();
			console.log(`📋 [USER-${commandId}] Update command complete (${execEnd - userActionTime}ms total), volume=${result.volume}`);

			return result;
		}, updateTaskOptions);

		// Wait for both operations
		const [volumeResult, updateResult] = await Promise.all([volumePromise, updatePromise]);

		const endTime = Date.now();
		const finalSystemState = this.volumeSystem.getState();

		const result = {
			commandId,
			userActionTime,
			endTime,
			totalDuration: endTime - userActionTime,
			volumeResult,
			updateResult,
			systemVolumeAtEnd: finalSystemState.currentVolume,
			updateReportsVolume: updateResult.volume,
			isAccurate: finalSystemState.currentVolume === updateResult.volume,
			options
		};

		const status = result.isAccurate ? "✅" : "❌";
		console.log(
			`🏁 [USER-${commandId}] COMPLETE ${status}: expected=${result.systemVolumeAtEnd}, reported=${result.updateReportsVolume}, duration=${result.totalDuration}ms\n`
		);

		return result;
	}

	destroy() {
		this.queue.destroy();
	}
}

/**
 * Test different timing scenarios
 */
async function testVolumeCoalescing() {
	console.log("🧪 PROPER COALESCING TEST: Volume Commands with Updates");
	console.log("=".repeat(80));
	console.log('5 volume up commands, each with coalesced update (key: "volume.up")');
	console.log("Expected: All updates should report accurate final volume\n");

	const scenarios = [
		{
			name: "Immediate Commands",
			description: "All commands execute immediately",
			options: {}
		},
		{
			name: "Staggered Volume Commands",
			description: "Volume commands start at different times",
			getOptions: (i) => ({ volumeStart: i * 50 }) // 0ms, 50ms, 100ms, 150ms, 200ms
		},
		{
			name: "Delayed Updates",
			description: "Updates start after volume commands complete",
			options: { updateStart: 100 } // All updates start 100ms from now
		},
		{
			name: "Complex Timing",
			description: "Volume commands staggered, updates delayed with spacing",
			getOptions: (i) => ({
				volumeStart: i * 30, // Volume: 0ms, 30ms, 60ms, 90ms, 120ms
				updateStart: 150, // Updates: all start at 150ms
				updateDelay: 50 // 50ms delay after each update
			})
		}
	];

	const results = [];

	for (const scenario of scenarios) {
		console.log(`\n🔬 SCENARIO: ${scenario.name}`);
		console.log(`📝 ${scenario.description}`);
		console.log("=".repeat(50));

		// Show the timing parameters for this scenario
		console.log("⏱️  TIMING PARAMETERS:");
		if (scenario.getOptions) {
			for (let i = 0; i < 5; i++) {
				const options = scenario.getOptions(i);
				console.log(
					`   Command ${i + 1}: volumeStart=${options.volumeStart || 0}ms, updateStart=${options.updateStart || 0}ms, updateDelay=${options.updateDelay || 0}ms`
				);
			}
		} else {
			const options = scenario.options;
			console.log(
				`   All Commands: volumeStart=${options.volumeStart || 0}ms, updateStart=${options.updateStart || 0}ms, updateDelay=${options.updateDelay || 0}ms`
			);
		}
		console.log("");

		const volumeSystem = new VolumeSystem(50);
		const controller = new VolumeController(volumeSystem);

		const startTime = Date.now();

		// Send 5 volume up commands rapidly
		const promises = [];
		for (let i = 1; i <= 5; i++) {
			const options = scenario.getOptions ? scenario.getOptions(i - 1) : scenario.options;
			const promise = controller.volumeUp(1, options);
			promises.push(promise);

			// Small delay between user actions (15ms)
			if (i < 5) await new Promise((resolve) => setTimeout(resolve, 15));
		}

		console.log("\n⏳ Waiting for all commands to complete...\n");
		const commandResults = await Promise.all(promises);

		const endTime = Date.now();
		const finalState = volumeSystem.getState();

		// Analysis
		const accurateResults = commandResults.filter((r) => r.isAccurate);
		const scenarioResult = {
			scenario: scenario.name,
			totalDuration: endTime - startTime,
			accurateCommands: accurateResults.length,
			totalCommands: 5,
			accuracyRate: (accurateResults.length / 5) * 100,
			finalVolume: finalState.currentVolume,
			expectedVolume: 55, // 50 + 5
			volumeCommandsExecuted: finalState.totalCommands,
			updateCommandsExecuted: finalState.totalUpdates,
			coalescingEfficiency: ((5 - finalState.totalUpdates) / 5) * 100
		};

		results.push(scenarioResult);

		console.log(`📊 SCENARIO RESULTS:`);
		console.log(`   Accuracy: ${scenarioResult.accuracyRate}% (${scenarioResult.accurateCommands}/5)`);
		console.log(`   Final Volume: ${scenarioResult.finalVolume} (expected: ${scenarioResult.expectedVolume})`);
		console.log(`   Volume Commands: ${scenarioResult.volumeCommandsExecuted}`);
		console.log(
			`   Update Commands: ${scenarioResult.updateCommandsExecuted} (${scenarioResult.coalescingEfficiency}% saved by coalescing)`
		);
		console.log(`   Total Duration: ${scenarioResult.totalDuration}ms`);

		// Analysis of what worked and what didn't
		if (scenarioResult.accuracyRate === 100 && scenarioResult.coalescingEfficiency > 0) {
			console.log(`   ✅ PERFECT: High accuracy + coalescing efficiency`);
		} else if (scenarioResult.accuracyRate === 100) {
			console.log(`   ✅ GOOD: Perfect accuracy but no coalescing (tasks executed too quickly)`);
		} else {
			console.log(`   ❌ PROBLEM: Race condition - updates executed before their volume commands`);
		}

		// Show individual command results
		commandResults.forEach((result, i) => {
			const status = result.isAccurate ? "✅" : "❌";
			console.log(
				`   Command ${i + 1} ${status}: ${result.totalDuration}ms, expected=${scenarioResult.finalVolume}, got=${result.updateReportsVolume}`
			);
		});

		controller.destroy();

		// Delay between scenarios
		await new Promise((resolve) => setTimeout(resolve, 100));
	}

	console.log("\n📈 OVERALL ANALYSIS:");
	console.log("=".repeat(80));

	results.forEach((result) => {
		const status = result.accuracyRate === 100 ? "✅ PERFECT" : result.accuracyRate >= 80 ? "⚠️  GOOD" : "❌ POOR";
		console.log(
			`${result.scenario.padEnd(25)} | ${result.accuracyRate.toFixed(1).padStart(5)}% | ${result.coalescingEfficiency.toFixed(1).padStart(5)}% saved | ${status}`
		);
	});

	// Identify best and worst scenarios
	const bestScenario = results.reduce((best, current) => (current.accuracyRate > best.accuracyRate ? current : best));
	const worstScenario = results.reduce((worst, current) => (current.accuracyRate < worst.accuracyRate ? current : worst));

	console.log(`\n🏆 Best Scenario: ${bestScenario.scenario} (${bestScenario.accuracyRate}% accuracy)`);
	console.log(`⚠️  Worst Scenario: ${worstScenario.scenario} (${worstScenario.accuracyRate}% accuracy)`);

	return results;
}

export { VolumeSystem, VolumeController, testVolumeCoalescing };
