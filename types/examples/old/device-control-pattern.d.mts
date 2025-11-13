export class DeviceController extends EventEmitter<[never]> {
    constructor();
    queue: HoldMyTask;
    deviceState: {
        volume: number;
        lastUpdated: number;
    };
    pendingVolumeChanges: Map<any, any>;
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
export class AdvancedDeviceController extends DeviceController {
}
export function demonstrateDeviceControl(): Promise<void>;
import { EventEmitter } from "events";
import { HoldMyTask } from "../../index.mjs";
//# sourceMappingURL=device-control-pattern.d.mts.map