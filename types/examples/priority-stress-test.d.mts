/**
 *
 *	@Project: @cldmv/holdmytask
 *	@Filename: /examples/priority-stress-test.mjs
 *	@Date: 2025-11-12T17:17:47-08:00 (1762996667)
 *	@Author: Nate Corcoran <CLDMV>
 *	@Email: <Shinrai@users.noreply.github.com>
 *	-----
 *	@Last modified by: Nate Corcoran <CLDMV> (Shinrai@users.noreply.github.com)
 *	@Last modified time: 2026-10-02T12:20:27-07:00 (1790968827)
 *	-----
 *	@Copyright: Copyright (c) 2013-2026 Catalyzed Motivation Inc. All rights reserved.
 *
 */
/**
 * Volume system with realistic timing
 */
declare class RealisticVolumeSystem {
    volume: number;
    commandCount: number;
    updateCount: number;
    log: any[];
    constructor(initialVolume?: number);
    executeVolumeCommand(change: any, commandId: any): Promise<{
        commandId: any;
        oldVolume: number;
        newVolume: number;
        change: number;
        executionTime: number;
        processingTime: number;
    }>;
    executeUpdateCommand(updateId: any): Promise<{
        updateId: any;
        volume: number;
        timestamp: number;
        totalCommands: number;
        totalUpdates: number;
        processingTime: number;
    }>;
    getState(): {
        currentVolume: number;
        totalCommands: number;
        totalUpdates: number;
    };
    getLog(): any[];
    clearLog(): void;
}
/**
 * Realistic volume controller with proper priorities and delays
 */
declare class PriorityVolumeController {
    volumeSystem: any;
    queue: any;
    commandCounter: number;
    constructor(volumeSystem: any, queueOptions?: {});
    /**
     * Volume up with realistic "fire and forget" pattern
     * REAL-WORLD PATTERN: Volume task enqueues update task AFTER completing volume change
     */
    volumeUp(amount?: number, options?: {}): any;
    destroy(): void;
}
/**
 * Stress test scenarios
 */
declare function runPriorityStressTests(): Promise<{
    scenario: string;
    totalDuration: number;
    accurateCommands: any;
    totalCommands: number;
    accuracyRate: number;
    finalVolume: number;
    expectedVolume: number;
    volumeCommandsExecuted: number;
    updateCommandsExecuted: number;
    coalescingEfficiency: number;
    averageCommandDuration: number;
}[]>;
export { RealisticVolumeSystem, PriorityVolumeController, runPriorityStressTests };
//# sourceMappingURL=priority-stress-test.d.mts.map