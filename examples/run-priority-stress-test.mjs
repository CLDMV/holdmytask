/**
 * Runner for Priority Stress Test
 */

import { runPriorityStressTests } from "./priority-stress-test.mjs";

async function runTest() {
	try {
		console.log("🚀 Starting Priority Stress Test...\n");

		const results = await runPriorityStressTests();

		console.log("\n🎯 STRESS TEST COMPLETED");
		console.log(`Tested ${results.length} scenarios with realistic priority delays and user input patterns`);

		// Determine if system passed stress test
		const avgAccuracy = results.reduce((sum, r) => sum + r.accuracyRate, 0) / results.length;
		const avgCoalescing = results.reduce((sum, r) => sum + r.coalescingEfficiency, 0) / results.length;

		if (avgAccuracy >= 95 && avgCoalescing >= 50) {
			console.log("🏆 VERDICT: System handles realistic workloads excellently");
			process.exit(0);
		} else if (avgAccuracy >= 90) {
			console.log("✅ VERDICT: System performs well, minor optimizations possible");
			process.exit(0);
		} else {
			console.log("⚠️  VERDICT: System needs timing configuration adjustments");
			process.exit(1);
		}
	} catch (error) {
		console.error("❌ Stress test failed:", error);
		process.exit(1);
	}
}

runTest();
