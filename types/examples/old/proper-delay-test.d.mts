/**
 *
 *	@Project: @cldmv/holdmytask
 *	@Filename: /examples/old/proper-delay-test.mjs
 *	@Date: 2025-11-12T17:17:47-08:00 (1762996667)
 *	@Author: Nate Corcoran <CLDMV>
 *	@Email: <Shinrai@users.noreply.github.com>
 *	-----
 *	@Last modified by: Nate Corcoran <CLDMV> (Shinrai@users.noreply.github.com)
 *	@Last modified time: 2026-10-02T12:20:23-07:00 (1790968823)
 *	-----
 *	@Copyright: Copyright (c) 2013-2026 Catalyzed Motivation Inc. All rights reserved.
 *
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
