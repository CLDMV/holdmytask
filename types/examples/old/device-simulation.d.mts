/**
 *
 *	@Project: @cldmv/holdmytask
 *	@Filename: /examples/old/device-simulation.mjs
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
import { EventEmitter } from "events";
/**
 * Simulated device that tracks its own state
 */
declare class PseudoDevice {
	volume: number;
	commandCount: number;
	infoRequestCount: number;
	constructor(initialVolume?: number);
	/**
	 * Device receives a volume change command
	 */
	volumeCommand(change: any): Promise<{
		commandId: number;
		oldVolume: number;
		newVolume: number;
		change: number;
	}>;
	/**
	 * Device responds to info request
	 */
	getInfo(): Promise<{
		requestId: number;
		volume: number;
		timestamp: number;
		totalCommands: number;
		totalInfoRequests: number;
	}>;
	/**
	 * Get device stats
	 */
	getStats(): {
		currentVolume: number;
		totalCommands: number;
		totalInfoRequests: number;
	};
}
/**
 * Controller that uses the queue system to communicate with the device
 */
declare class DeviceController extends EventEmitter {
	device: any;
	queue: any;
	optimisticVolume: any;
	pendingChanges: number;
	constructor(device: any, queueOptions?: {});
	/**
	 * User calls volumeUp - this should update device and then get fresh info
	 */
	volumeUp(amount?: number): Promise<{
		volumeCommand: any;
		deviceInfo: any;
		optimisticVolume: any;
		pendingChanges: number;
	}>;
	/**
	 * Get current state
	 */
	getState(): {
		optimisticVolume: any;
		pendingChanges: number;
		deviceStats: any;
	};
	destroy(): void;
}
/**
 * Test scenario: Rapid volume commands
 */
declare function testRapidVolumeCommands(): Promise<{
	expectedVolume: number;
	actualVolume: number;
	totalCommands: number;
	totalInfoRequests: number;
	success: boolean;
}>;
/**
 * Test different coalescing configurations
 */
declare function testCoalescingConfigurations(): Promise<void>;
export { PseudoDevice, DeviceController, testRapidVolumeCommands, testCoalescingConfigurations };
//# sourceMappingURL=device-simulation.d.mts.map
