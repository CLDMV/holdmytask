/**
 * Priority Stress Test: Real-world Volume Commands with Priority Delays
 *
 * Tests realistic scenarios where:
 * - Volume commands are high priority user actions with 100ms base delay
 * - Update commands are low priority internal actions with 500ms base delay + 500ms start delay
 * - Simulates real user input patterns with varying delays
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
	executeVolumeCommand(
		change: any,
		commandId: any
	): Promise<{
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
declare function runPriorityStressTests(): Promise<
	{
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
	}[]
>;
export { RealisticVolumeSystem, PriorityVolumeController, runPriorityStressTests };
//# sourceMappingURL=priority-stress-test.d.mts.map
