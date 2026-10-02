/**
 *
 *	@Project: @cldmv/holdmytask
 *	@Filename: /examples/old/run-volume-test.mjs
 *	@Date: 2025-11-12T10:12:57-08:00 (1762971177)
 *	@Author: Nate Corcoran <CLDMV>
 *	@Email: <Shinrai@users.noreply.github.com>
 *	-----
 *	@Last modified by: Nate Corcoran <CLDMV> (Shinrai@users.noreply.github.com)
 *	@Last modified time: 2026-10-02T12:20:23-07:00 (1790968823)
 *	-----
 *	@Copyright: Copyright (c) 2013-2026 Catalyzed Motivation Inc. All rights reserved.
 *
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
