/**
 *
 *	@Project: @cldmv/holdmytask
 *	@Filename: /examples/old/test-proper-delays.mjs
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

import { testProperDelays } from "./proper-delay-test.mjs";

console.log("🎯 PROPER DELAY TEST");
console.log("Testing delays AFTER task completion vs device processing delays\n");

testProperDelays()
	.then((result) => {
		console.log("\n🎯 SUMMARY:");
		console.log(`Accuracy: ${result.accuracyRate}% (${result.totalAccurate}/${result.totalTests})`);
		console.log(`Device operations: ${result.deviceCommands} commands, ${result.deviceInfoRequests} info requests`);
		console.log(`Final volume: ${result.finalVolume}`);

		if (result.accuracyRate === 100) {
			console.log("✅ SUCCESS: Proper delays fixed the race condition!");
		} else {
			console.log("❌ ISSUE: Race condition still exists with proper delays");
		}
	})
	.catch(console.error);
