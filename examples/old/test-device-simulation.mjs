/**
 *
 *	@Project: @cldmv/holdmytask
 *	@Filename: /examples/old/test-device-simulation.mjs
 *	@Date: 2025-11-12T17:17:47-08:00 (1762996667)
 *	@Author: Nate Corcoran <CLDMV>
 *	@Email: <Shinrai@users.noreply.github.com>
 *	-----
 *	@Last modified by: Nate Corcoran <CLDMV> (Shinrai@users.noreply.github.com)
 *	@Last modified time: 2026-10-02T12:20:25-07:00 (1790968825)
 *	-----
 *	@Copyright: Copyright (c) 2013-2026 Catalyzed Motivation Inc. All rights reserved.
 *
 */

import { testRapidVolumeCommands, testCoalescingConfigurations } from "./device-simulation.mjs";

async function runTests() {
	console.log("🎮 DEVICE SIMULATION TESTS");
	console.log("=".repeat(60));

	try {
		const result = await testRapidVolumeCommands();

		if (result.success) {
			console.log("✅ Test PASSED: Device state is consistent");
		} else {
			console.log("❌ Test FAILED: Device state inconsistency detected");
			console.log(`Expected: ${result.expectedVolume}, Got: ${result.actualVolume}`);
		}

		await testCoalescingConfigurations();
	} catch (error) {
		console.error("❌ Test failed with error:", error);
	}
}

runTests();
