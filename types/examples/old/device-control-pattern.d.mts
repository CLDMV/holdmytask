/**
 * Example: Device Control Pattern with Coalescing
 *
 * This demonstrates how to handle rapid user input (volume commands)
 * that trigger update info commands, ensuring final state consistency.
 */
import { EventEmitter } from "events";
declare class DeviceController extends EventEmitter {
	queue: any;
	deviceState: {
		volume: number;
		lastUpdated: number;
	};
	pendingVolumeChanges: Map<any, any>;
	constructor();
	/**
	 * User command: Volume Up
	 * This accumulates changes and triggers coalesced update
	 */
	volumeUp(amount?: number): Promise<any>;
	/**
	 * The actual device update task that gets executed (coalesced)
	 * This applies ALL accumulated changes at once
	 */
	updateDeviceInfo(coalescingKey: any): Promise<{
		volume: number;
		lastUpdated: number;
	}>;
	/**
	 * Update system state after device change
	 */
	updateSystemState(): void;
	/**
	 * Emit events for state changes
	 */
	emitStateChange(oldVolume: any, newVolume: any): void;
	/**
	 * Get current device state
	 */
	getState(): {
		volume: number;
		lastUpdated: number;
	};
	destroy(): void;
}
declare function demonstrateDeviceControl(): Promise<void>;
declare class AdvancedDeviceController extends DeviceController {
	volumeUp(amount?: number): Promise<any>;
}
export { DeviceController, AdvancedDeviceController, demonstrateDeviceControl };
//# sourceMappingURL=device-control-pattern.d.mts.map
