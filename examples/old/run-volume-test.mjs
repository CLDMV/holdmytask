/**
 *	@Project: @cldmv/holdmytask
 *	@Filename: /examples/old/run-volume-test.mjs
 *	@Date: 2025-11-12 10:12:57 -08:00 (1762971177)
 *	@Author: Nate Hyson <CLDMV>
 *	@Email: <Shinrai@users.noreply.github.com>
 *	-----
 *	@Last modified by: Nate Hyson <CLDMV> (Shinrai@users.noreply.github.com)
 *	@Last modified time: 2025-11-12 10:13:20 -08:00 (1762971200)
 *	-----
 *	@Copyright: Copyright (c) 2013-2025 Catalyzed Motivation Inc. All rights reserved.
 */

/**
 * Runner for the proper volume coalescing test
 */

import { testVolumeCoalescing } from "../volume-coalescing-test.mjs";

async function runTest() {
	try {
		console.log("Starting proper volume coalescing test...\n");

		const results = await testVolumeCoalescing();

		console.log("\n🎯 TEST COMPLETED SUCCESSFULLY");
		console.log(`Tested ${results.length} scenarios with proper queue timing controls`);

		// Summary stats
		const totalAccuracy = results.reduce((sum, r) => sum + r.accuracyRate, 0) / results.length;
		const totalCoalescingEfficiency = results.reduce((sum, r) => sum + r.coalescingEfficiency, 0) / results.length;

		console.log(`Average Accuracy: ${totalAccuracy.toFixed(1)}%`);
		console.log(`Average Coalescing Efficiency: ${totalCoalescingEfficiency.toFixed(1)}%`);

		process.exit(0);
	} catch (error) {
		console.error("❌ Test failed:", error);
		process.exit(1);
	}
}

runTest();
