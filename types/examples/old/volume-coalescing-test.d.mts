/**
 * Proper Coalescing Test: Volume Commands with Updates
 *
 * Tests 5 volume increase commands, each with:
 * - Volume command (immediate execution)
 * - Update command (coalesced with key "volume.up")
 *
 * Uses proper queue timing controls instead of device simulation.
 */
/**
 * Simple volume system that tracks state
 */
declare class VolumeSystem {
    volume: number;
    commandCount: number;
    updateCount: number;
    log: any[];
    constructor(initialVolume?: number);
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
declare class VolumeController {
    volumeSystem: any;
    queue: any;
    commandCounter: number;
    constructor(volumeSystem: any, queueOptions?: {});
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
declare function testVolumeCoalescing(): Promise<{
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
export { VolumeSystem, VolumeController, testVolumeCoalescing };
//# sourceMappingURL=volume-coalescing-test.d.mts.map