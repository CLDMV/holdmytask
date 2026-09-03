/**
 * Pseudo Device System for Testing Coalescing Behavior
 *
 * This simulates a real device that:
 * 1. Has its own internal state (volume level)
 * 2. Responds to volume up/down commands
 * 3. Responds to info requests with current state
 * 4. Has realistic communication delays
 */
import { EventEmitter } from "events";
/**
 * Simulated device that tracks its own state
 */
declare class PseudoDevice {
    volume: number;
    commandCount: number;
    infoRequestCount: number;
    constructor(initialVolume?: number);
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
declare class DeviceController extends EventEmitter {
    device: any;
    queue: any;
    optimisticVolume: any;
    pendingChanges: number;
    constructor(device: any, queueOptions?: {});
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
declare function testRapidVolumeCommands(): Promise<{
    expectedVolume: number;
    actualVolume: number;
    totalCommands: number;
    totalInfoRequests: number;
    success: boolean;
}>;
/**
 * Test different coalescing configurations
 */
declare function testCoalescingConfigurations(): Promise<void>;
export { PseudoDevice, DeviceController, testRapidVolumeCommands, testCoalescingConfigurations };
//# sourceMappingURL=device-simulation.d.mts.map