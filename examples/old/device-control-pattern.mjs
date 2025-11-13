/**
 * Example: Device Control Pattern with Coalescing
 *
 * This demonstrates how to handle rapid user input (volume commands)
 * that trigger update info commands, ensuring final state consistency.
 */

import { HoldMyTask } from "../../index.mjs";
import { EventEmitter } from "events";

class DeviceController extends EventEmitter {
	constructor() {
		super();
		this.queue = new HoldMyTask({
			smartScheduling: true,
			concurrency: 1,
			coalescingWindowDuration: 100, // 100ms window
			coalescingMaxDelay: 500, // Max 500ms delay
			coalescingMultipleCallbacks: false, // Single callback mode
			coalescingResolveAllPromises: true // All promises resolve with same result
		});

		// Current device state
		this.deviceState = {
			volume: 50,
			lastUpdated: Date.now()
		};

		// Track pending volume changes that haven't been applied yet
		this.pendingVolumeChanges = new Map(); // coalescingKey -> accumulated change
	}

	/**
	 * User command: Volume Up
	 * This accumulates changes and triggers coalesced update
	 */
	async volumeUp(amount = 1) {
		const coalescingKey = "volume-update";
		const currentPending = this.pendingVolumeChanges.get(coalescingKey) || 0;
		const newPending = currentPending + amount;

		console.log(`📢 Volume up +${amount} (pending total: +${newPending})`);
		this.pendingVolumeChanges.set(coalescingKey, newPending);

		// Queue the update info task (will be coalesced)
		const promise = this.queue.enqueue(() => this.updateDeviceInfo(coalescingKey), {
			coalescingKey,
			metadata: {
				operation: "volume-update",
				pendingChange: newPending
			}
		});

		// All coalesced promises will resolve with the final device state
		return promise;
	}

	/**
	 * The actual device update task that gets executed (coalesced)
	 * This applies ALL accumulated changes at once
	 */
	async updateDeviceInfo(coalescingKey) {
		// Get the accumulated change amount
		const totalChange = this.pendingVolumeChanges.get(coalescingKey) || 0;

		if (totalChange === 0) {
			console.log("⚠️  No pending changes to apply");
			return this.deviceState;
		}

		console.log(`🔄 Executing update: applying total volume change of +${totalChange}`);

		// Simulate device communication delay
		await new Promise((resolve) => setTimeout(resolve, 50));

		// Apply the accumulated change
		const oldVolume = this.deviceState.volume;
		this.deviceState.volume = Math.max(0, Math.min(100, oldVolume + totalChange));
		this.deviceState.lastUpdated = Date.now();

		// Clear the pending changes since we've applied them
		this.pendingVolumeChanges.delete(coalescingKey);

		console.log(`✅ Volume updated: ${oldVolume} → ${this.deviceState.volume} (change: +${totalChange})`);

		// This is where you'd update system state and emit events
		this.updateSystemState();
		this.emitStateChange(oldVolume, this.deviceState.volume);

		return { ...this.deviceState };
	}

	/**
	 * Update system state after device change
	 */
	updateSystemState() {
		// This could update a database, cache, etc.
		console.log("📊 System state updated");
	}

	/**
	 * Emit events for state changes
	 */
	emitStateChange(oldVolume, newVolume) {
		this.emit("volumeChanged", {
			from: oldVolume,
			to: newVolume,
			timestamp: this.deviceState.lastUpdated
		});

		this.emit("deviceStateChanged", { ...this.deviceState });
	}

	/**
	 * Get current device state
	 */
	getState() {
		return { ...this.deviceState };
	}

	destroy() {
		this.queue.destroy();
	}
}

// Demonstration
async function demonstrateDeviceControl() {
	const device = new DeviceController();

	// Listen for events
	device.on("volumeChanged", (data) => {
		console.log(`🔊 Event: Volume changed from ${data.from} to ${data.to}`);
	});

	device.on("deviceStateChanged", (state) => {
		console.log(`📡 Event: Device state updated - Volume: ${state.volume}`);
	});

	console.log("🎮 Starting device control demo...\n");
	console.log(`Initial volume: ${device.getState().volume}\n`);

	// Simulate rapid user input - 5 volume up commands in quick succession
	console.log("📢 User rapidly presses volume up 5 times...");
	const promises = [];

	for (let i = 1; i <= 5; i++) {
		const promise = device.volumeUp(1);
		promises.push(
			promise.then((state) => ({
				command: i,
				finalVolume: state.volume
			}))
		);

		// Small delay between commands (user input speed)
		if (i < 5) await new Promise((resolve) => setTimeout(resolve, 20));
	}

	// Wait for all commands to complete
	console.log("\n⏳ Waiting for all commands to complete...\n");
	const results = await Promise.all(promises);

	console.log("\n📊 Results:");
	results.forEach((result) => {
		console.log(`  Command ${result.command}: Final volume = ${result.finalVolume}`);
	});

	console.log(`\n🎯 Final device state: Volume = ${device.getState().volume}`);

	// Demonstrate that the system handles the "missing update" concern
	console.log("\n🧪 Testing edge case: Volume command after coalescing...");
	await new Promise((resolve) => setTimeout(resolve, 200)); // Wait for coalescing window to close

	const lateCommand = await device.volumeUp(2);
	console.log(`📢 Late command result: Volume = ${lateCommand.volume}`);

	device.destroy();
}

// Alternative pattern: Using task results for post-processing
class AdvancedDeviceController extends DeviceController {
	async volumeUp(amount = 1) {
		const coalescingKey = "volume-update";
		const currentPending = this.pendingVolumeChanges.get(coalescingKey) || 0;
		const newPending = currentPending + amount;

		console.log(`📢 Volume up +${amount} (pending total: +${newPending})`);
		this.pendingVolumeChanges.set(coalescingKey, newPending);

		// Queue the update with post-processing
		const promise = this.queue.enqueue(() => this.updateDeviceInfo(coalescingKey), {
			coalescingKey,
			metadata: {
				operation: "volume-update",
				pendingChange: newPending
			}
		});

		// Handle post-processing in the promise chain
		return promise.then((deviceState) => {
			// This runs for EACH promise, but only after the coalesced task completes
			console.log(`🔗 Promise resolved for command with final volume: ${deviceState.volume}`);

			// You could do additional per-promise processing here
			// But be careful not to duplicate work that should only happen once

			return deviceState;
		});
	}
}

export { DeviceController, AdvancedDeviceController, demonstrateDeviceControl };
