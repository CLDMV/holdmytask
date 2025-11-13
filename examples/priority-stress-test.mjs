/**
 * Priority Stress Test: Real-world Volume Commands with Priority Delays
 *
 * Tests realistic scenarios where:
 * - Volume commands are high priority user actions with 100ms base delay
 * - Update commands are low priority internal actions with 500ms base delay + 500ms start delay
 * - Simulates real user input patterns with varying delays
 */

import { HoldMyTask } from "../index.mjs";

/**
 * Priority levels for real-world scenarios
 */
const PRIORITIES = {
	USER_ACTION: 1, // High priority - volume commands
	INTERNAL: 5 // Low priority - update commands
};

/**
 * Real-world base delays (minimum processing time)
 */
const BASE_DELAYS = {
	USER_ACTION: 100, // 100ms minimum for user commands
	INTERNAL: 500 // 500ms minimum for internal updates
};

/**
 * Volume system with realistic timing
 */
class RealisticVolumeSystem {
	constructor(initialVolume = 50) {
		this.volume = initialVolume;
		this.commandCount = 0;
		this.updateCount = 0;
		this.log = [];
	}

	async executeVolumeCommand(change, commandId) {
		this.commandCount++;
		const startTime = Date.now();

		this.log.push(`🎚️ [VOL-${commandId}] Processing volume change: ${change > 0 ? "+" : ""}${change}`);

		// Simulate realistic volume processing time (200-1000ms)
		const processingTime = 200 + Math.random() * 800; // 200-1000ms
		await new Promise((resolve) => setTimeout(resolve, processingTime));

		const oldVolume = this.volume;
		this.volume = Math.max(0, Math.min(100, this.volume + change));

		const endTime = Date.now();
		this.log.push(
			`🔊 [VOL-${commandId}] Volume: ${oldVolume} → ${this.volume} (${endTime - startTime}ms, processing: ${processingTime.toFixed(0)}ms)`
		);

		return {
			commandId,
			oldVolume,
			newVolume: this.volume,
			change: this.volume - oldVolume,
			executionTime: endTime - startTime,
			processingTime: processingTime
		};
	}

	async executeUpdateCommand(updateId) {
		this.updateCount++;
		const startTime = Date.now();

		this.log.push(`📊 [UPD-${updateId}] Processing system update`);

		// Simulate realistic update processing time (200-2000ms)
		const processingTime = 200 + Math.random() * 1800; // 200-2000ms
		await new Promise((resolve) => setTimeout(resolve, processingTime));

		const info = {
			updateId,
			volume: this.volume,
			timestamp: Date.now(),
			totalCommands: this.commandCount,
			totalUpdates: this.updateCount,
			processingTime: processingTime
		};

		const endTime = Date.now();
		this.log.push(
			`📋 [UPD-${updateId}] Update complete: volume=${this.volume} (${endTime - startTime}ms, processing: ${processingTime.toFixed(0)}ms)`
		);

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
 * Realistic volume controller with proper priorities and delays
 */
class PriorityVolumeController {
	constructor(volumeSystem, queueOptions = {}) {
		this.volumeSystem = volumeSystem;
		this.queue = new HoldMyTask({
			smartScheduling: true,
			concurrency: 2, // Allow volume and update tasks to run concurrently
			coalescingWindowDuration: 200,
			coalescingMaxDelay: 1000,
			...queueOptions
		});
		this.commandCounter = 0;
	}

	/**
	 * Volume up with realistic "fire and forget" pattern
	 * REAL-WORLD PATTERN: Volume task enqueues update task AFTER completing volume change
	 */
	volumeUp(amount = 1, options = {}) {
		const commandId = ++this.commandCounter;
		const userActionTime = Date.now();

		console.log(`🎮 [USER-${commandId}] Volume up +${amount} triggered at ${userActionTime} (fire and forget)`);

		// High priority volume command with base delay
		const volumeTaskOptions = {
			start: options.volumeStart || 0,
			delay: BASE_DELAYS.USER_ACTION, // 100ms base delay for user actions
			priority: PRIORITIES.USER_ACTION, // High priority
			timestamp: options.volumeTimestamp, // Use timestamp if provided
			metadata: { type: "volume-command", commandId, priority: "HIGH" }
		};

		console.log(
			`   📤 HIGH PRIORITY Volume Task: start=${volumeTaskOptions.start}ms, delay=${volumeTaskOptions.delay}ms, priority=${volumeTaskOptions.priority}`
		);

		// Fire and forget - return promise immediately but don't await
		const volumePromise = this.queue.enqueue(async () => {
			const execStart = Date.now();
			console.log(`🔄 [USER-${commandId}] HIGH PRIORITY Volume executing (${execStart - userActionTime}ms from trigger)`);

			const volumeResult = await this.volumeSystem.executeVolumeCommand(amount, commandId);

			const execEnd = Date.now();
			console.log(`✅ [USER-${commandId}] Volume complete (${execEnd - userActionTime}ms total)`);

			// AFTER volume completes, enqueue the update task from WITHIN the volume task
			console.log(`   📤 LOW PRIORITY Update Task (FROM WITHIN volume task): coalescingKey='volume.update'`);

			// DON'T await the update promise - just enqueue it and let it run independently
			const updatePromise = this.queue.enqueue(
				async () => {
					const updateStart = Date.now();
					console.log(`📊 [USER-${commandId}] LOW PRIORITY Update executing (${updateStart - userActionTime}ms from original trigger)`);

					const updateResult = await this.volumeSystem.executeUpdateCommand(commandId);

					const updateEnd = Date.now();
					console.log(`📋 [USER-${commandId}] Update complete (${updateEnd - userActionTime}ms total), volume=${updateResult.volume}`);

					return updateResult;
				},
				{
					start: options.updateStart || 0, // Start immediately after volume completes
					delay: BASE_DELAYS.INTERNAL, // 500ms base delay for internal actions
					priority: PRIORITIES.INTERNAL, // Low priority
					coalescingKey: "volume.update", // Enable coalescing with other updates
					timestamp: options.updateTimestamp, // Use timestamp if provided
					metadata: { type: "update-command", commandId, priority: "LOW" }
				}
			);

			// Store the update promise for testing but don't await it here
			// This prevents deadlock with concurrency: 1
			return { volumeResult, updatePromise };
		}, volumeTaskOptions);

		// Return the promise but consumer doesn't need to await it
		// For testing, we'll track it to verify the pattern works
		return volumePromise.then(async ({ volumeResult, updatePromise }) => {
			// Now await the update promise separately (after volume task has completed and freed up concurrency slot)
			const updateResult = await updatePromise;

			const endTime = Date.now();
			const finalSystemState = this.volumeSystem.getState();

			return {
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
		});
	}

	destroy() {
		this.queue.destroy();
	}
}

/**
 * Stress test scenarios
 */
async function runPriorityStressTests() {
	console.log("🧪 PRIORITY STRESS TEST: Real-world Volume Commands");
	console.log("=".repeat(80));
	console.log("FIRE-AND-FORGET PATTERN: Volume tasks enqueue update tasks FROM WITHIN");
	console.log("📋 HIGH PRIORITY: Volume commands (priority=1, delay=100ms)");
	console.log("📋 LOW PRIORITY: Update commands (priority=5, delay=500ms, enqueued FROM volume task)");
	console.log("🎯 Goal: 100% accuracy + coalescing of update commands\n");

	const scenarios = [
		{
			name: "Rapid Fire Commands",
			description: "5 volume commands sent rapidly - each volume completes before triggering its update",
			async execute() {
				const volumeSystem = new RealisticVolumeSystem(50);
				const controller = new PriorityVolumeController(volumeSystem);

				console.log("⚡ Sending 5 rapid volume up commands...\n");

				const promises = [];
				const startTime = Date.now();

				// Send all 5 commands rapidly
				for (let i = 1; i <= 5; i++) {
					const promise = controller.volumeUp(1);
					promises.push(promise);
				}

				console.log("⏳ Waiting for all commands to complete...\n");
				const results = await Promise.all(promises);

				const endTime = Date.now();
				const finalState = volumeSystem.getState();

				controller.destroy();

				return {
					results,
					totalDuration: endTime - startTime,
					finalState,
					scenario: "rapid-fire"
				};
			}
		},
		{
			name: "Realistic User Input",
			description: "5 volume commands with 25-100ms delays between triggers - realistic sequential pattern",
			async execute() {
				const volumeSystem = new RealisticVolumeSystem(50);
				const controller = new PriorityVolumeController(volumeSystem);

				console.log("👤 Simulating realistic user input pattern...\n");

				const promises = [];
				const startTime = Date.now();

				// Send commands with realistic user timing
				for (let i = 1; i <= 5; i++) {
					const promise = controller.volumeUp(1);
					promises.push(promise);

					// Random delay between 25-100ms (realistic user input speed)
					if (i < 5) {
						const delay = 25 + Math.random() * 75; // 25-100ms
						console.log(`⏱️  User delay: ${delay.toFixed(1)}ms before next command\n`);
						await new Promise((resolve) => setTimeout(resolve, delay));
					}
				}

				console.log("⏳ Waiting for all commands to complete...\n");
				const results = await Promise.all(promises);

				const endTime = Date.now();
				const finalState = volumeSystem.getState();

				controller.destroy();

				return {
					results,
					totalDuration: endTime - startTime,
					finalState,
					scenario: "realistic-user"
				};
			}
		},
		{
			name: "Timestamp Override Test",
			description: "5 volume commands with explicit timestamp scheduling (500ms delay)",
			async execute() {
				const volumeSystem = new RealisticVolumeSystem(50);
				const controller = new PriorityVolumeController(volumeSystem);

				console.log("🕐 Testing explicit timestamp override (500ms delay)...\n");

				const promises = [];
				const startTime = Date.now();
				const scheduleTime = startTime + 500; // Schedule all for 500ms from now

				// Send commands with explicit timestamp
				for (let i = 1; i <= 5; i++) {
					const promise = controller.volumeUp(1, {
						updateTimestamp: scheduleTime + 500 // Updates 500ms after volume commands
					});
					promises.push(promise);
				}

				console.log("⏳ Waiting for all commands to complete...\n");
				const results = await Promise.all(promises);

				const endTime = Date.now();
				const finalState = volumeSystem.getState();

				controller.destroy();

				return {
					results,
					totalDuration: endTime - startTime,
					finalState,
					scenario: "timestamp-override"
				};
			}
		}
	];

	const allResults = [];

	for (const scenario of scenarios) {
		console.log(`\n🔬 SCENARIO: ${scenario.name}`);
		console.log(`📝 ${scenario.description}`);
		console.log("=".repeat(50));

		const scenarioResult = await scenario.execute();

		// Analysis
		const accurateResults = scenarioResult.results.filter((r) => r.isAccurate);
		const analysis = {
			scenario: scenario.name,
			totalDuration: scenarioResult.totalDuration,
			accurateCommands: accurateResults.length,
			totalCommands: 5,
			accuracyRate: (accurateResults.length / 5) * 100,
			finalVolume: scenarioResult.finalState.currentVolume,
			expectedVolume: 55, // 50 + 5
			volumeCommandsExecuted: scenarioResult.finalState.totalCommands,
			updateCommandsExecuted: scenarioResult.finalState.totalUpdates,
			coalescingEfficiency: ((5 - scenarioResult.finalState.totalUpdates) / 5) * 100,
			averageCommandDuration: scenarioResult.results.reduce((sum, r) => sum + r.totalDuration, 0) / 5
		};

		allResults.push(analysis);

		console.log(`📊 SCENARIO RESULTS:`);
		console.log(`   Accuracy: ${analysis.accuracyRate}% (${analysis.accurateCommands}/5)`);
		console.log(`   Final Volume: ${analysis.finalVolume} (expected: ${analysis.expectedVolume})`);
		console.log(`   Volume Commands: ${analysis.volumeCommandsExecuted}`);
		console.log(`   Update Commands: ${analysis.updateCommandsExecuted} (${analysis.coalescingEfficiency}% saved by coalescing)`);
		console.log(`   Total Duration: ${analysis.totalDuration}ms`);
		console.log(`   Average Command Duration: ${analysis.averageCommandDuration.toFixed(1)}ms`);

		// Analysis of what worked
		if (analysis.accuracyRate === 100 && analysis.coalescingEfficiency > 0) {
			console.log(`   ✅ PERFECT: High accuracy + coalescing efficiency`);
		} else if (analysis.accuracyRate === 100) {
			console.log(`   ✅ GOOD: Perfect accuracy but limited coalescing`);
		} else {
			console.log(`   ❌ ISSUES: Some commands had timing problems`);
		}

		// Show individual results
		scenarioResult.results.forEach((result, i) => {
			const status = result.isAccurate ? "✅" : "❌";
			console.log(
				`   Command ${i + 1} ${status}: ${result.totalDuration}ms, expected=${analysis.finalVolume}, got=${result.updateReportsVolume}`
			);
		});

		// Delay between scenarios
		await new Promise((resolve) => setTimeout(resolve, 200));
	}

	console.log("\n📈 OVERALL STRESS TEST ANALYSIS:");
	console.log("=".repeat(100));
	console.log("Scenario                  | Accuracy | Updates (Ran/Queued) | Coalescing | Avg Duration | Status");
	console.log("-".repeat(100));

	allResults.forEach((result) => {
		const status =
			result.accuracyRate === 100 && result.coalescingEfficiency > 50
				? "🎯 EXCELLENT"
				: result.accuracyRate === 100
					? "✅ GOOD"
					: "⚠️  NEEDS WORK";
		const updatesRan = result.updateCommandsExecuted;
		const updatesQueued = 5; // Always 5 commands queued
		const coalescingSaved = result.coalescingEfficiency.toFixed(1);

		console.log(
			`${result.scenario.padEnd(25)} | ${result.accuracyRate.toFixed(1).padStart(7)}% | ${updatesRan.toString().padStart(3)}/${updatesQueued.toString().padStart(7)} | ${coalescingSaved.padStart(9)}% | ${result.averageCommandDuration.toFixed(0).padStart(11)}ms | ${status}`
		);
	});

	// Summary statistics
	const avgAccuracy = allResults.reduce((sum, r) => sum + r.accuracyRate, 0) / allResults.length;
	const avgCoalescing = allResults.reduce((sum, r) => sum + r.coalescingEfficiency, 0) / allResults.length;
	const avgDuration = allResults.reduce((sum, r) => sum + r.averageCommandDuration, 0) / allResults.length;

	console.log(`\n🎯 SUMMARY:`);
	console.log(`   Average Accuracy: ${avgAccuracy.toFixed(1)}%`);
	console.log(`   Average Coalescing Efficiency: ${avgCoalescing.toFixed(1)}%`);
	console.log(`   Average Command Duration: ${avgDuration.toFixed(1)}ms`);

	if (avgAccuracy >= 95 && avgCoalescing >= 50) {
		console.log(`   🏆 SYSTEM PERFORMANCE: EXCELLENT - Ready for production`);
	} else if (avgAccuracy >= 90 && avgCoalescing >= 30) {
		console.log(`   ✅ SYSTEM PERFORMANCE: GOOD - Minor tuning recommended`);
	} else {
		console.log(`   ⚠️  SYSTEM PERFORMANCE: NEEDS WORK - Review timing configuration`);
	}

	return allResults;
}

export { RealisticVolumeSystem, PriorityVolumeController, runPriorityStressTests };
