/**
 * Simple volume system that tracks state
 */
export class VolumeSystem {
    constructor(initialVolume?: number);
    volume: number;
    commandCount: number;
    updateCount: number;
    log: any[];
    /**
     * Execute a volume command (changes the actual volume)
     */
    executeVolumeCommand(change: any, commandId: any): Promise<{
        commandId: any;
        oldVolume: number;
        newVolume: number;
        change: number;
        executionTime: number;
    }>;
    /**
     * Execute an update command (reports current state)
     */
    executeUpdateCommand(updateId: any): Promise<{
        updateId: any;
        volume: number;
        timestamp: number;
        totalCommands: number;
        totalUpdates: number;
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
 * Controller that implements volume commands with coalesced updates
 */
export class VolumeController {
    constructor(volumeSystem: any, queueOptions?: {});
    volumeSystem: any;
    queue: HoldMyTask;
    commandCounter: number;
    /**
     * Volume up command with coalesced update
     */
    volumeUp(amount?: number, options?: {}): Promise<{
        commandId: number;
        userActionTime: number;
        endTime: number;
        totalDuration: number;
        volumeResult: any;
        updateResult: any;
        systemVolumeAtEnd: any;
        updateReportsVolume: any;
        isAccurate: boolean;
        options: {};
    }>;
    destroy(): void;
}
/**
 * Test different timing scenarios
 */
export function testVolumeCoalescing(): Promise<{
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
}[]>;
import { HoldMyTask } from "../../index.mjs";
//# sourceMappingURL=volume-coalescing-test.d.mts.map