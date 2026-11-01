/**
 * Enhanced controller that logs detailed timing information
 */
export class TimingAnalysisController extends DeviceController {
    commandCounter: number;
    timingLog: any[];
    volumeUp(amount?: number): Promise<{
        commandId: number;
        startTime: number;
        endTime: number;
        totalDuration: number;
        volumeCommand: any;
        infoResult: any;
        expectedVolume: any;
        reportedVolume: any;
    }>;
    getTimingAnalysis(): {
        timingLog: any[];
        deviceStats: any;
    };
}
/**
 * Test with reference counting approach
 */
export class ReferenceCountingController extends DeviceController {
    pendingVolumeCommands: Map<any, any>;
    commandCounter: number;
    volumeUp(amount?: number): Promise<{
        commandId: number;
        volumeResult: any;
        infoResult: any;
        expectedVolume: any;
        reportedVolume: any;
        accurate: boolean;
    }>;
}
export function analyzeTimingIssues(): Promise<void>;
import { DeviceController } from "./device-simulation.mjs";
//# sourceMappingURL=timing-analysis.d.mts.map