/**
 * Device with configurable delays
 */
export class ConfigurableDelayDevice {
    constructor(initialVolume?: number, commandDelay?: number, infoDelay?: number);
    volume: number;
    commandCount: number;
    infoRequestCount: number;
    commandDelay: number;
    infoDelay: number;
    volumeCommand(change: any): Promise<{
        commandId: number;
        oldVolume: number;
        newVolume: number;
        change: number;
        processingTime: number;
    }>;
    getInfo(): Promise<{
        requestId: number;
        volume: number;
        timestamp: number;
        totalCommands: number;
        totalInfoRequests: number;
        processingTime: number;
    }>;
    getStats(): {
        currentVolume: number;
        totalCommands: number;
        totalInfoRequests: number;
    };
}
/**
 * Controller for timing tests
 */
export class TimingTestController {
    constructor(device: any, coalescingWindowDuration?: number);
    device: any;
    coalescingWindowDuration: number;
    queue: HoldMyTask;
    commandCounter: number;
    results: any[];
    volumeUp(amount?: number): Promise<{
        commandId: number;
        userActionTime: number;
        completionTime: number;
        totalDuration: number;
        volumeResult: any;
        infoResult: any;
        deviceVolumeAtCompletion: any;
        infoReportsVolume: any;
        isAccurate: boolean;
        timingData: {
            volumeQueueDelay: any;
            volumeProcessingTime: any;
            infoQueueDelay: any;
            infoProcessingTime: any;
        };
    }>;
    getResults(): {
        results: any[];
        deviceStats: any;
        coalescingWindowDuration: number;
    };
    destroy(): void;
}
/**
 * Test different device delays to find the breaking point
 */
export function findBreakingPoint(): Promise<{
    description: string | number;
    commandDelay: string | number;
    coalescingWindow: string | number;
    accurateCommands: number;
    inaccurateCommands: number;
    accuracyRate: number;
    maxDuration: number;
    avgDuration: number;
    deviceCommands: any;
    deviceInfoRequests: any;
    coalescingEfficiency: number;
}[]>;
import { HoldMyTask } from "../../index.mjs";
//# sourceMappingURL=breaking-point-analysis.d.mts.map