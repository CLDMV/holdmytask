/**
 *
 *	@Project: @cldmv/holdmytask
 *	@Filename: /examples/old/breaking-point-analysis.mjs
 *	@Date: 2025-11-12T17:17:47-08:00 (1762996667)
 *	@Author: Nate Corcoran <CLDMV>
 *	@Email: <Shinrai@users.noreply.github.com>
 *	-----
 *	@Last modified by: Nate Corcoran <CLDMV> (Shinrai@users.noreply.github.com)
 *	@Last modified time: 2026-10-02T12:20:22-07:00 (1790968822)
 *	-----
 *	@Copyright: Copyright (c) 2013-2026 Catalyzed Motivation Inc. All rights reserved.
 *
 */
/**
 * Device with configurable delays
 */
declare class ConfigurableDelayDevice {
	volume: number;
	commandCount: number;
	infoRequestCount: number;
	commandDelay: number;
	infoDelay: number;
	constructor(initialVolume?: number, commandDelay?: number, infoDelay?: number);
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
declare class TimingTestController {
	device: any;
	coalescingWindowDuration: number;
	queue: any;
	commandCounter: number;
	results: any[];
	constructor(device: any, coalescingWindowDuration?: number);
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
declare function findBreakingPoint(): Promise<
	{
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
	}[]
>;
export { ConfigurableDelayDevice, TimingTestController, findBreakingPoint };
//# sourceMappingURL=breaking-point-analysis.d.mts.map
