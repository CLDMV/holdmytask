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
