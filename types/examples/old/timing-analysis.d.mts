/**
 *
 *	@Project: @cldmv/holdmytask
 *	@Filename: /examples/old/timing-analysis.mjs
 *	@Date: 2025-11-12T17:17:47-08:00 (1762996667)
 *	@Author: Nate Corcoran <CLDMV>
 *	@Email: <Shinrai@users.noreply.github.com>
 *	-----
 *	@Last modified by: Nate Corcoran <CLDMV> (Shinrai@users.noreply.github.com)
 *	@Last modified time: 2026-10-02T12:20:26-07:00 (1790968826)
 *	-----
 *	@Copyright: Copyright (c) 2013-2026 Catalyzed Motivation Inc. All rights reserved.
 *
 */
/**
 * Detailed Analysis of Coalescing Timing Issues
 *
 * This test demonstrates the fundamental timing problem with coalescing:
 * Info requests get coalesced and executed before all the volume commands they're supposed to reflect.
 */
import { DeviceController } from "./device-simulation.mjs";
/**
 * Enhanced controller that logs detailed timing information
 */
declare class TimingAnalysisController extends DeviceController {
    commandCounter: number;
    timingLog: any[];
    constructor(device: any, queueOptions?: {});
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
declare class ReferenceCountingController extends DeviceController {
    pendingVolumeCommands: Map<any, any>;
    commandCounter: number;
    constructor(device: any, queueOptions?: {});
    volumeUp(amount?: number): Promise<{
        commandId: number;
        volumeResult: any;
        infoResult: any;
        expectedVolume: any;
        reportedVolume: any;
        accurate: boolean;
    }>;
}
declare function analyzeTimingIssues(): Promise<void>;
export { TimingAnalysisController, ReferenceCountingController, analyzeTimingIssues };
//# sourceMappingURL=timing-analysis.d.mts.map