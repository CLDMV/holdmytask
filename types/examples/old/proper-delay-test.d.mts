export class SimpleDevice {
    constructor(initialVolume?: number);
    volume: number;
    commandCount: number;
    infoRequestCount: number;
    volumeCommand(change: any): Promise<{
        commandId: number;
        oldVolume: number;
        newVolume: number;
        change: number;
    }>;
    getInfo(): Promise<{
        requestId: number;
        volume: number;
        timestamp: number;
        totalCommands: number;
        totalInfoRequests: number;
    }>;
    getStats(): {
        currentVolume: number;
        totalCommands: number;
        totalInfoRequests: number;
    };
}
/**
 * Controller using proper queue delays
 */
export class ProperDelayController {
    constructor(device: any);
    device: any;
    queue: HoldMyTask;
    commandCounter: number;
    volumeUp(amount?: number): Promise<{
        commandId: number;
        startTime: number;
        endTime: number;
        duration: number;
        volumeResult: any;
        infoResult: any;
        deviceVolumeAtEnd: any;
        infoReportsVolume: any;
        isAccurate: boolean;
    }>;
    getQueueInfo(): {
        pendingCount: any;
        runningCount: any;
        completedCount: any;
    };
    destroy(): void;
}
/**
 * Test the proper delay scenario
 */
export function testProperDelays(): Promise<{
    totalAccurate: number;
    totalTests: number;
    accuracyRate: number;
    deviceCommands: number;
    deviceInfoRequests: number;
    finalVolume: number;
}>;
import { HoldMyTask } from "../../index.mjs";
//# sourceMappingURL=proper-delay-test.d.mts.map