/**
 * Test with Proper Queue Delays
 *
 * This tests the scenario you described:
 * - Volume commands with 100ms delay (after completion)
 * - Info requests with 500ms delay (after completion)
 * - This should allow 2 volume updates to complete before info request
 */
declare class SimpleDevice {
    volume: number;
    commandCount: number;
    infoRequestCount: number;
    constructor(initialVolume?: number);
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
declare class ProperDelayController {
    device: any;
    queue: any;
    commandCounter: number;
    constructor(device: any);
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
declare function testProperDelays(): Promise<{
    totalAccurate: number;
    totalTests: number;
    accuracyRate: number;
    deviceCommands: number;
    deviceInfoRequests: number;
    finalVolume: number;
}>;
export { SimpleDevice, ProperDelayController, testProperDelays };
//# sourceMappingURL=proper-delay-test.d.mts.map