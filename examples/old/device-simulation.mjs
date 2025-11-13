/**
 * Pseudo Device System for Testing Coalescing Behavior
 *
 * This simulates a real device that:
 * 1. Has its own internal state (volume level)
 * 2. Responds to volume up/down commands
 * 3. Responds to info requests with current state
 * 4. Has realistic communication delays
 */

import { HoldMyTask } from "../../index.mjs";
import { EventEmitter } from "events";

/**
 * Simulated device that tracks its own state
 */
class PseudoDevice {
	constructor(initialVolume = 50) {
		this.volume = initialVolume;
		this.commandCount = 0;
		this.infoRequestCount = 0;

		console.log(`🔌 Device initialized with volume: ${this.volume}`);
	}

	/**
	 * Device receives a volume change command
	 */
	async volumeCommand(change) {
		this.commandCount++;
		const commandId = this.commandCount;

		console.log(`📱 Device received volume command #${commandId}: ${change > 0 ? "+" : ""}${change}`);

		// Simulate device processing delay
		await new Promise((resolve) => setTimeout(resolve, 30));

		const oldVolume = this.volume;
		this.volume = Math.max(0, Math.min(100, this.volume + change));

		console.log(`🔊 Device processed command #${commandId}: ${oldVolume} → ${this.volume}`);

		return {
			commandId,
			oldVolume,
			newVolume: this.volume,
			change: this.volume - oldVolume
		};
	}

	/**
	 * Device responds to info request
	 */
	async getInfo() {
		this.infoRequestCount++;
		const requestId = this.infoRequestCount;

		console.log(`📊 Device received info request #${requestId}`);

		// Simulate device query delay
		await new Promise((resolve) => setTimeout(resolve, 20));

		const info = {
			requestId,
			volume: this.volume,
			timestamp: Date.now(),
			totalCommands: this.commandCount,
			totalInfoRequests: this.infoRequestCount
		};

		console.log(`📋 Device responded to info request #${requestId}: volume=${this.volume}`);

		return info;
	}

	/**
	 * Get device stats
	 */
	getStats() {
		return {
			currentVolume: this.volume,
			totalCommands: this.commandCount,
			totalInfoRequests: this.infoRequestCount
		};
	}
}

/**
 * Controller that uses the queue system to communicate with the device
 */
class DeviceController extends EventEmitter {
	constructor(device, queueOptions = {}) {
		super();
		this.device = device;
		this.queue = new HoldMyTask({
			smartScheduling: true,
			concurrency: 1,
			coalescingWindowDuration: 100,
			coalescingMaxDelay: 500,
			coalescingMultipleCallbacks: false,
			coalescingResolveAllPromises: true,
			...queueOptions
		});

		// Track what we think the volume should be (optimistic)
		this.optimisticVolume = device.volume;
		this.pendingChanges = 0;
	}

	/**
	 * User calls volumeUp - this should update device and then get fresh info
	 */
	async volumeUp(amount = 1) {
		// Optimistic update
		this.optimisticVolume += amount;
		this.pendingChanges++;

		console.log(`🎮 User: Volume up +${amount} (optimistic: ${this.optimisticVolume}, pending: ${this.pendingChanges})`);

		// Step 1: Send volume command to device
		const volumePromise = this.queue.enqueue(() => this.device.volumeCommand(amount), {
			metadata: { type: "volume-command", amount }
		});

		// Step 2: Get updated info after volume change (with coalescing)
		const infoPromise = this.queue.enqueue(() => this.device.getInfo(), {
			coalescingKey: "device-info-update",
			metadata: { type: "info-request" }
		});

		// Wait for both operations
		const [volumeResult, infoResult] = await Promise.all([volumePromise, infoPromise]);

		this.pendingChanges--;

		// Update our tracking based on actual device state
		this.optimisticVolume = infoResult.volume;

		console.log(
			`✅ User command complete: device=${infoResult.volume}, optimistic=${this.optimisticVolume}, pending=${this.pendingChanges}`
		);

		this.emit("volumeChanged", {
			volumeCommand: volumeResult,
			deviceInfo: infoResult,
			optimisticVolume: this.optimisticVolume,
			pendingChanges: this.pendingChanges
		});

		return {
			volumeCommand: volumeResult,
			deviceInfo: infoResult,
			optimisticVolume: this.optimisticVolume,
			pendingChanges: this.pendingChanges
		};
	}

	/**
	 * Get current state
	 */
	getState() {
		return {
			optimisticVolume: this.optimisticVolume,
			pendingChanges: this.pendingChanges,
			deviceStats: this.device.getStats()
		};
	}

	destroy() {
		this.queue.destroy();
	}
}

/**
 * Test scenario: Rapid volume commands
 */
async function testRapidVolumeCommands() {
	console.log("🧪 TEST: Rapid Volume Commands with Device Simulation\n");

	// Create pseudo device and controller
	const device = new PseudoDevice(50);
	const controller = new DeviceController(device);

	// Listen for events
	controller.on("volumeChanged", (data) => {
		console.log(`🔔 Event: Volume changed, device reports: ${data.deviceInfo.volume}`);
	});

	console.log(`📊 Initial state: ${JSON.stringify(controller.getState())}\n`);

	console.log("🚀 Sending 5 rapid volume up commands...\n");

	// Send 5 rapid volume up commands
	const promises = [];
	for (let i = 1; i <= 5; i++) {
		const promise = controller.volumeUp(1);
		promises.push(
			promise.then((result) => ({
				command: i,
				result
			}))
		);

		// Small delay between user commands
		if (i < 5) await new Promise((resolve) => setTimeout(resolve, 15));
	}

	// Wait for all commands to complete
	console.log("\n⏳ Waiting for all commands to complete...\n");
	const results = await Promise.all(promises);

	console.log("\n📊 RESULTS:");
	console.log("=".repeat(50));

	results.forEach(({ command, result }) => {
		console.log(`Command ${command}:`);
		console.log(`  Volume Command: ${result.volumeCommand.oldVolume} → ${result.volumeCommand.newVolume}`);
		console.log(`  Info Request: device reports volume = ${result.deviceInfo.volume}`);
		console.log(`  Controller state: optimistic=${result.optimisticVolume}, pending=${result.pendingChanges}`);
		console.log("");
	});

	const finalState = controller.getState();
	const deviceStats = device.getStats();

	console.log("📈 FINAL ANALYSIS:");
	console.log("=".repeat(50));
	console.log(`Expected final volume: 55 (50 + 5×1)`);
	console.log(`Actual device volume: ${deviceStats.currentVolume}`);
	console.log(`Controller optimistic: ${finalState.optimisticVolume}`);
	console.log(`Total device volume commands: ${deviceStats.totalCommands}`);
	console.log(`Total device info requests: ${deviceStats.totalInfoRequests}`);
	console.log(`Commands coalesced: ${5 - deviceStats.totalCommands} volume, ${5 - deviceStats.totalInfoRequests} info`);

	// Test edge case: command after coalescing window
	console.log("\n🧪 Edge case: Command after coalescing window...");
	await new Promise((resolve) => setTimeout(resolve, 200));

	const lateResult = await controller.volumeUp(2);
	console.log(`Late command result: device volume = ${lateResult.deviceInfo.volume}`);

	const finalDeviceStats = device.getStats();
	console.log(`\n🎯 Final device volume: ${finalDeviceStats.currentVolume}`);
	console.log(`Total device interactions: ${finalDeviceStats.totalCommands} commands, ${finalDeviceStats.totalInfoRequests} info requests`);

	controller.destroy();

	return {
		expectedVolume: 57, // 50 + 5 + 2
		actualVolume: finalDeviceStats.currentVolume,
		totalCommands: finalDeviceStats.totalCommands,
		totalInfoRequests: finalDeviceStats.totalInfoRequests,
		success: finalDeviceStats.currentVolume === 57
	};
}

/**
 * Test different coalescing configurations
 */
async function testCoalescingConfigurations() {
	console.log("\n\n🔬 TEST: Different Coalescing Configurations\n");

	const configurations = [
		{
			name: "No Coalescing",
			options: { coalescingWindowDuration: 0 }
		},
		{
			name: "Short Window (50ms)",
			options: { coalescingWindowDuration: 50 }
		},
		{
			name: "Long Window (200ms)",
			options: { coalescingWindowDuration: 200 }
		}
	];

	for (const config of configurations) {
		console.log(`\n🧪 Testing: ${config.name}`);
		console.log("-".repeat(30));

		const device = new PseudoDevice(50);
		const controller = new DeviceController(device, config.options);

		// Send 3 rapid commands
		const promises = [];
		for (let i = 1; i <= 3; i++) {
			promises.push(controller.volumeUp(1));
			if (i < 3) await new Promise((resolve) => setTimeout(resolve, 10));
		}

		await Promise.all(promises);

		const stats = device.getStats();
		console.log(`  Expected volume: 53, Actual: ${stats.currentVolume}`);
		console.log(`  Device commands: ${stats.totalCommands}, Info requests: ${stats.totalInfoRequests}`);
		console.log(`  Efficiency: ${(((3 - stats.totalInfoRequests) / 3) * 100).toFixed(1)}% info requests saved`);

		controller.destroy();
	}
}

export { PseudoDevice, DeviceController, testRapidVolumeCommands, testCoalescingConfigurations };
