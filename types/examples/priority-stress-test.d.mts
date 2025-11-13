/**
 * Volume system with realistic timing
 */
export class RealisticVolumeSystem {
    constructor(initialVolume?: number);
    volume: number;
    commandCount: number;
    updateCount: number;
    log: any[];
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
export class PriorityVolumeController {
    constructor(volumeSystem: any, queueOptions?: {});
    volumeSystem: any;
    queue: HoldMyTask;
    commandCounter: number;
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
export function runPriorityStressTests(): Promise<{
    scenario: string;
    totalDuration: number;
    accurateCommands: number;
    totalCommands: number;
    accuracyRate: number;
    finalVolume: number;
    expectedVolume: number;
    volumeCommandsExecuted: number;
    updateCommandsExecuted: number;
    coalescingEfficiency: number;
    averageCommandDuration: number;
}[]>;
import { HoldMyTask } from "../index.mjs";
//# sourceMappingURL=priority-stress-test.d.mts.map