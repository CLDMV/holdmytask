/**
 * Simulated device that tracks its own state
 */
export class PseudoDevice {
    constructor(initialVolume?: number);
    volume: number;
    commandCount: number;
    infoRequestCount: number;
    /**
     * Device receives a volume change command
     */
    volumeCommand(change: any): Promise<{
        commandId: number;
        oldVolume: number;
        newVolume: number;
        change: number;
    }>;
    /**
     * Device responds to info request
     */
    getInfo(): Promise<{
        requestId: number;
        volume: number;
        timestamp: number;
        totalCommands: number;
        totalInfoRequests: number;
    }>;
    /**
     * Get device stats
     */
    getStats(): {
        currentVolume: number;
        totalCommands: number;
        totalInfoRequests: number;
    };
}
/**
 * Controller that uses the queue system to communicate with the device
 */
export class DeviceController extends EventEmitter<[never]> {
    constructor(device: any, queueOptions?: {});
    device: any;
    queue: HoldMyTask;
    optimisticVolume: any;
    pendingChanges: number;
    /**
     * User calls volumeUp - this should update device and then get fresh info
     */
    volumeUp(amount?: number): Promise<{
        volumeCommand: any;
        deviceInfo: any;
        optimisticVolume: any;
        pendingChanges: number;
    }>;
    /**
     * Get current state
     */
    getState(): {
        optimisticVolume: any;
        pendingChanges: number;
        deviceStats: any;
    };
    destroy(): void;
}
/**
 * Test scenario: Rapid volume commands
 */
export function testRapidVolumeCommands(): Promise<{
    expectedVolume: number;
    actualVolume: number;
    totalCommands: number;
    totalInfoRequests: number;
    success: boolean;
}>;
/**
 * Test different coalescing configurations
 */
export function testCoalescingConfigurations(): Promise<void>;
import { EventEmitter } from "events";
import { HoldMyTask } from "../../index.mjs";
//# sourceMappingURL=device-simulation.d.mts.map