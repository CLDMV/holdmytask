#!/usr/bin/env node
/**
 *
 *	@Project: @cldmv/holdmytask
 *	@Filename: /examples/enhanced-coalescing-test.mjs
 *	@Date: 2025-11-13T11:24:44-08:00 (1763061884)
 *	@Author: Nate Corcoran <CLDMV>
 *	@Email: <Shinrai@users.noreply.github.com>
 *	-----
 *	@Last modified by: Nate Corcoran <CLDMV> (Shinrai@users.noreply.github.com)
 *	@Last modified time: 2026-10-02T12:20:21-07:00 (1790968821)
 *	-----
 *	@Copyright: Copyright (c) 2013-2026 Catalyzed Motivation Inc. All rights reserved.
 *
 */

/**
 * Enhanced Coalescing Configuration Test
 *
 * This example demonstrates the new comprehensive configuration system:
 * - Priority defaults for delay and start times
 * - Enhanced coalescing with per-key delay, start, windowDuration, and maxDelay
 * - Backward compatibility with legacy options
 */

import { HoldMyTaskQueue } from "../src/hold-my-task.mjs";

console.log("🚀 Enhanced Coalescing & Priority Configuration Test\n");

// Create queue with comprehensive configuration
const queue = new HoldMyTaskQueue({
	concurrency: 2,
	delays: { 1: 200, 2: 100 }, // Legacy delay system still works
	priorities: {
		1: { delay: 150, start: 0 }, // High priority: 150ms delay, immediate start
		2: { delay: 100, start: 25 }, // Medium priority: 100ms delay, 25ms start delay
		3: { delay: 50, start: 50 } // Low priority: 50ms delay, 50ms start delay
	},
	coalescing: {
		defaults: {
			windowDuration: 100,
			maxDelay: 1000,
			delay: 75, // Default completion delay for coalescing tasks
			start: 10, // Default start delay for coalescing tasks
			multipleCallbacks: false,
			resolveAllPromises: true
		},
		keys: {
			"ui.update": {
				windowDuration: 50, // Fast UI updates
				maxDelay: 200,
				delay: 25, // Short completion delay
				start: 0 // Immediate start
			},
			"api.batch": {
				windowDuration: 500, // Slower API batching
				maxDelay: 2000,
				delay: 200, // Longer completion delay
				start: 100, // Delayed start
				resolveAllPromises: false
			}
		}
	}
});

console.log("📋 Priority configurations:");
const priorityConfigs = queue.getPriorityConfigurations();
Object.entries(priorityConfigs).forEach(([priority, config]) => {
	console.log(`  Priority ${priority}: ${config.delay || "no"}ms delay, ${config.start || "no"}ms start delay`);
});

console.log("\n📋 Initial coalescing configurations:");
const configs = queue.getCoalescingConfigurations();
Object.entries(configs).forEach(([key, config]) => {
	console.log(
		`  ${key}: ${config.windowDuration}ms window, ${config.maxDelay}ms max delay, ${config.delay || "no"}ms delay, ${config.start || "no"}ms start`
	);
});

// Test backward compatibility with flat options
const legacyQueue = new HoldMyTaskQueue({
	concurrency: 1,
	coalescingWindowDuration: 200,
	coalescingMaxDelay: 1500
});

console.log("\n🔄 Legacy flat options still work:");
console.log(`  Window Duration: ${legacyQueue.options.coalescing.defaults.windowDuration}ms`);
console.log(`  Max Delay: ${legacyQueue.options.coalescing.defaults.maxDelay}ms`);

// Test dynamic configurations
console.log("\n⚙️ Adding dynamic configurations...");

// Add priority configuration
queue.configurePriority(4, {
	delay: 300,
	start: 75
});

// Add coalescing key configuration with full options
queue.configureCoalescingKey("data.sync", {
	windowDuration: 1000,
	maxDelay: 5000,
	delay: 150,
	start: 50,
	multipleCallbacks: true
});

console.log("\n📋 Updated priority configurations:");
const updatedPriorityConfigs = queue.getPriorityConfigurations();
Object.entries(updatedPriorityConfigs).forEach(([priority, config]) => {
	console.log(`  Priority ${priority}: ${config.delay || "no"}ms delay, ${config.start || "no"}ms start delay`);
});

console.log("\n📋 Updated coalescing configurations:");
const updatedConfigs = queue.getCoalescingConfigurations();
Object.entries(updatedConfigs).forEach(([key, config]) => {
	console.log(
		`  ${key}: ${config.windowDuration}ms window, ${config.maxDelay}ms max delay, ${config.delay || "no"}ms delay, ${config.start || "no"}ms start`
	);
});

// Test coalescing behavior with different keys
let uiCallCount = 0;
let apiCallCount = 0;
let dataCallCount = 0;

console.log("\n🎯 Testing coalescing behavior...");

// Schedule multiple UI updates (should coalesce quickly)
for (let i = 0; i < 5; i++) {
	queue.add({
		coalescingKey: "ui.update",
		task: () => {
			uiCallCount++;
			console.log(`  UI Update executed (call ${uiCallCount})`);
			return `ui-result-${uiCallCount}`;
		}
	});
}

// Schedule API batches (should coalesce with longer window)
for (let i = 0; i < 3; i++) {
	queue.add({
		coalescingKey: "api.batch",
		task: () => {
			apiCallCount++;
			console.log(`  API Batch executed (call ${apiCallCount})`);
			return `api-result-${apiCallCount}`;
		}
	});
}

// Schedule data sync (should use dynamic configuration)
for (let i = 0; i < 4; i++) {
	queue.add({
		coalescingKey: "data.sync",
		task: () => {
			dataCallCount++;
			console.log(`  Data Sync executed (call ${dataCallCount})`);
			return `data-result-${dataCallCount}`;
		}
	});
}

// Test priority defaults (task without coalescing key)
queue.add({
	priority: 4, // Uses our dynamic priority config
	task: () => {
		console.log("  Priority 4 task (uses priority defaults)");
		return "priority-4-result";
	}
});

// Test task-level overrides
queue.add({
	coalescingKey: "ui.update",
	coalescingWindowDuration: 300, // Override key config
	delay: 100, // Override all delay configs
	start: 25, // Override start config
	task: () => {
		console.log("  UI Update with custom timing overrides");
		return "custom-ui-result";
	}
});

// Test configuration hierarchy
queue.add({
	coalescingKey: "api.batch",
	priority: 1, // Priority 1 has delay: 150, start: 0
	// Should use: api.batch key config for coalescing, priority 1 config for fallbacks
	task: () => {
		console.log("  API Batch with priority 1 (configuration hierarchy test)");
		return "hierarchy-test-result";
	}
});

// Wait for all tasks to complete
setTimeout(() => {
	console.log("\n📊 Final Results:");
	console.log(`  UI Updates executed: ${uiCallCount} times`);
	console.log(`  API Batches executed: ${apiCallCount} times`);
	console.log(`  Data Syncs executed: ${dataCallCount} times`);
	console.log("\n✅ Enhanced coalescing configuration test completed successfully!");

	queue.shutdown();
}, 6000);
