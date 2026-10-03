/**
 *
 *	@Project: @cldmv/holdmytask
 *	@Filename: /examples/old/device-control-pattern.mjs
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