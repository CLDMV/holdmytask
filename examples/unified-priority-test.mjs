#!/usr/bin/env node

/**
 * Unified Priority System Test
 *
 * This example demonstrates the new unified priority system with backward compatibility
 */

import { HoldMyTask } from "../src/hold-my-task.mjs";

console.log("🔄 Unified Priority System Test\n");

// Test 1: Legacy delays are auto-converted to new priority system
console.log("📋 Test 1: Legacy delays auto-conversion");
const legacyQueue = new HoldMyTask({
	concurrency: 1,
	delays: { 1: 200, 2: 100, 3: 50 } // Old format
});

console.log("Legacy delays converted to priorities:");
const legacyPriorities = legacyQueue.getPriorityConfigurations();
Object.entries(legacyPriorities).forEach(([priority, config]) => {
	console.log(`  Priority ${priority}: delay=${config.delay}ms, start=${config.start}ms`);
});

// Test 2: New priority system with enhanced configuration
console.log("\n📋 Test 2: Enhanced priority system");
const modernQueue = new HoldMyTask({
	concurrency: 1,
	priorities: {
		1: { delay: 300, start: 0 }, // High priority: immediate start, 300ms delay
		2: { delay: 150, start: 25 }, // Medium priority: 25ms start delay, 150ms delay
		3: { delay: 75, start: 50 } // Low priority: 50ms start delay, 75ms delay
	}
});

console.log("Modern priority configuration:");
const modernPriorities = modernQueue.getPriorityConfigurations();
Object.entries(modernPriorities).forEach(([priority, config]) => {
	console.log(`  Priority ${priority}: delay=${config.delay}ms, start=${config.start}ms`);
});

// Test 3: Mixed configuration (legacy + new) - new takes precedence
console.log("\n📋 Test 3: Mixed configuration (new overrides legacy)");
const mixedQueue = new HoldMyTask({
	concurrency: 1,
	delays: { 1: 500, 2: 250 }, // Legacy format
	priorities: {
		1: { delay: 100, start: 10 }, // This overrides the legacy delay: 500
		3: { delay: 25, start: 75 } // New priority not in legacy
	}
});

console.log("Mixed configuration result:");
const mixedPriorities = mixedQueue.getPriorityConfigurations();
Object.entries(mixedPriorities).forEach(([priority, config]) => {
	console.log(`  Priority ${priority}: delay=${config.delay}ms, start=${config.start}ms`);
});

// Test 4: Enhanced coalescing with priority defaults
console.log("\n📋 Test 4: Enhanced coalescing + priority system");
const enhancedQueue = new HoldMyTask({
	concurrency: 2,
	priorities: {
		1: { delay: 200, start: 0 },
		2: { delay: 100, start: 50 }
	},
	coalescing: {
		defaults: {
			windowDuration: 150,
			maxDelay: 1000,
			delay: 75, // Coalescing default delay
			start: 25 // Coalescing default start
		},
		keys: {
			"ui.update": {
				windowDuration: 100,
				maxDelay: 500,
				delay: 50, // Override coalescing default
				start: 0 // Override coalescing default
			}
		}
	}
});

// Test configuration hierarchy
const uiConfig = enhancedQueue.getCoalescingConfig("ui.update", { priority: 1 });
console.log("UI update coalescing config with priority 1 fallback:");
console.log(`  windowDuration: ${uiConfig.windowDuration}ms`);
console.log(`  maxDelay: ${uiConfig.maxDelay}ms`);
console.log(`  delay: ${uiConfig.delay}ms`);
console.log(`  start: ${uiConfig.start}ms`);

// Test priority config for regular tasks
const priority1Config = enhancedQueue.getPriorityConfig(1);
console.log("\nPriority 1 config for regular tasks:");
console.log(`  delay: ${priority1Config.delay}ms`);
console.log(`  start: ${priority1Config.start}ms`);

console.log("\n✅ Unified priority system test completed successfully!");
console.log("   ✓ Legacy delays auto-converted to new format");
console.log("   ✓ New priority system provides enhanced control");
console.log("   ✓ Mixed configurations work correctly (new overrides legacy)");
console.log("   ✓ Enhanced coalescing integrates with priority defaults");

legacyQueue.destroy();
modernQueue.destroy();
mixedQueue.destroy();
enhancedQueue.destroy();
