/**
 *	@Project: @cldmv/holdmytask
 *	@Filename: /tests/EnhancedConfiguration.vest.mjs
 *	@Date: 2025-01-23
 *	@Author: Nate Hyson <CLDMV>
 *	@Email: <Shinrai@users.noreply.github.com>
 *	-----
 *	@Copyright: Copyright (c) 2013-2025 Catalyzed Motivation Inc. All rights reserved.
 */

import { test, expect, describe, vi } from "vitest";
import { HoldMyTask } from "../src/hold-my-task.mjs";

describe("Enhanced Configuration System", () => {
	describe("Priority Configuration", () => {
		test("should accept priority configuration in constructor", () => {
			const hmt = new HoldMyTask({
				priorities: {
					10: { delay: 100 },
					5: { delay: 300 },
					1: { delay: 700 }
				}
			});

			const config = hmt.getPriorityConfigurations();
			expect(config[10].delay).toBe(100);
			expect(config[5].delay).toBe(300);
			expect(config[1].delay).toBe(700);
		});
		test("should merge with default priorities", () => {
			const hmt = new HoldMyTask({
				priorities: {
					0: { delay: 100 }, // Configure default priority
					99: { delay: 50 }
				}
			});

			const config = hmt.getPriorityConfigurations();
			expect(config[99].delay).toBe(50);
			expect(config[0].delay).toBe(100); // default should still exist
		});

		test("should configure priorities at runtime", () => {
			const hmt = new HoldMyTask();

			hmt.configurePriority(10, { delay: 25 });

			const config = hmt.getPriorityConfigurations();
			expect(config[10].delay).toBe(25);
		});

		test("should update existing priority configuration", () => {
			const hmt = new HoldMyTask();

			hmt.configurePriority(0, { delay: 150 });

			const config = hmt.getPriorityConfigurations();
			expect(config[0].delay).toBe(150);
		});
	});

	describe("Enhanced Coalescing Configuration", () => {
		test("should accept coalescing defaults in constructor", () => {
			const hmt = new HoldMyTask({
				coalescing: {
					defaults: {
						windowDuration: 200,
						maxDelay: 500,
						delay: 150,
						start: false
					}
				}
			});

			// Test with a test key to get defaults applied
			const config = hmt.getCoalescingConfig("test-key");
			expect(config.windowDuration).toBe(200);
			expect(config.maxDelay).toBe(500);
			expect(config.delay).toBe(150);
			expect(config.start).toBe(false);
		});

		test("should accept per-key coalescing configuration", () => {
			const hmt = new HoldMyTask({
				coalescing: {
					defaults: {
						windowDuration: 100,
						maxDelay: 300
					},
					keys: {
						"api-calls": {
							windowDuration: 250,
							maxDelay: 600,
							delay: 200
						},
						"database": {
							windowDuration: 150,
							maxDelay: 400
						}
					}
				}
			});

			const apiCallsConfig = hmt.getCoalescingConfig("api-calls");
			expect(apiCallsConfig.windowDuration).toBe(250);
			expect(apiCallsConfig.maxDelay).toBe(600);
			expect(apiCallsConfig.delay).toBe(200);

			const databaseConfig = hmt.getCoalescingConfig("database");
			expect(databaseConfig.windowDuration).toBe(150);
			expect(databaseConfig.maxDelay).toBe(400);
		});

		test("should configure coalescing keys at runtime", () => {
			const hmt = new HoldMyTask();

			hmt.configureCoalescingKey("network", {
				windowDuration: 300,
				maxDelay: 800,
				delay: 250,
				start: true
			});

			const networkConfig = hmt.getCoalescingConfig("network");
			expect(networkConfig.windowDuration).toBe(300);
			expect(networkConfig.maxDelay).toBe(800);
			expect(networkConfig.delay).toBe(250);
			expect(networkConfig.start).toBe(true);
		});

		test("should update existing coalescing key configuration", () => {
			const hmt = new HoldMyTask({
				coalescing: {
					defaults: {
						windowDuration: 200,
						maxDelay: 1000
					},
					keys: {
						"test-key": {
							windowDuration: 100,
							maxDelay: 200
						}
					}
				}
			});

			hmt.configureCoalescingKey("test-key", {
				windowDuration: 150,
				delay: 75
			});

			const testKeyConfig = hmt.getCoalescingConfig("test-key");
			expect(testKeyConfig.windowDuration).toBe(150);
			expect(testKeyConfig.maxDelay).toBe(200); // preserved
			expect(testKeyConfig.delay).toBe(75);
		});
	});

	describe("Legacy Delay Transformation", () => {
		test("should transform legacy delays to priorities", () => {
			const hmt = new HoldMyTask({
				delays: {
					10: 50,
					5: 150,
					1: 300
				}
			});

			const config = hmt.getPriorityConfigurations();
			expect(config[10].delay).toBe(50);
			expect(config[5].delay).toBe(150);
			expect(config[1].delay).toBe(300);
		});

		test("should handle mixed legacy and new configuration", () => {
			const hmt = new HoldMyTask({
				delays: {
					8: 250
				},
				priorities: {
					9: { delay: 75 }
				}
			});

			const config = hmt.getPriorityConfigurations();
			expect(config[8]).toBeDefined();
			expect(config[8].delay).toBe(250);
			expect(config[9]).toBeDefined();
			expect(config[9].delay).toBe(75);
		});

		test("should prioritize new format over legacy when conflicting", () => {
			const hmt = new HoldMyTask({
				delays: {
					0: 200
				},
				priorities: {
					0: { delay: 100 }
				}
			});

			const config = hmt.getPriorityConfigurations();
			expect(config[0].delay).toBe(100); // new format wins
		});
	});

	describe("Configuration Hierarchy", () => {
		test("should use task options over coalescing key config", async () => {
			const hmt = new HoldMyTask({
				coalescing: {
					defaults: {
						start: 200
					},
					keys: {
						"test": {
							start: 150
						}
					}
				}
			});

			let executed = false;
			hmt.enqueue(
				() => {
					executed = true;
				},
				{ start: 75, coalescingKey: "test" }
			);

			// Should use task option start delay (75) over key config (150) or default (200)
			// Task should wait 75ms before executing
			await new Promise((resolve) => setTimeout(resolve, 50));
			expect(executed).toBe(false);

			await new Promise((resolve) => setTimeout(resolve, 50)); // total 100ms
			expect(executed).toBe(true);
		});

		test("should use coalescing key config over defaults", async () => {
			const hmt = new HoldMyTask({
				coalescing: {
					defaults: {
						start: 200
					},
					keys: {
						"test": {
							start: 100
						}
					}
				}
			});

			let executed = false;
			hmt.enqueue(
				() => {
					executed = true;
				},
				{ coalescingKey: "test" }
			);

			// Should use key config start delay (100) over default (200)
			await new Promise((resolve) => setTimeout(resolve, 75));
			expect(executed).toBe(false);

			await new Promise((resolve) => setTimeout(resolve, 50)); // total 125ms
			expect(executed).toBe(true);
		});

		test("should use priority defaults over coalescing defaults", async () => {
			const hmt = new HoldMyTask({
				priorities: {
					5: { start: 150 }
				},
				coalescing: {
					defaults: {
						start: 300
					}
				}
			});
			let executed = false;
			hmt.enqueue(
				() => {
					executed = true;
				},
				{ priority: 5, coalescingKey: "test" }
			);

			// Should use priority start delay (150) over coalescing default (300)
			await new Promise((resolve) => setTimeout(resolve, 100));
			expect(executed).toBe(false);

			await new Promise((resolve) => setTimeout(resolve, 75)); // total 175ms
			expect(executed).toBe(true);
		});
	});

	describe("Shutdown Alias", () => {
		test("should have shutdown method that calls destroy", () => {
			const hmt = new HoldMyTask();
			const destroySpy = vi.spyOn(hmt, "destroy");

			hmt.shutdown();

			expect(destroySpy).toHaveBeenCalled();
		});

		test("should return destroy result from shutdown", () => {
			const hmt = new HoldMyTask();
			const mockResult = { cleaned: true };
			vi.spyOn(hmt, "destroy").mockReturnValue(mockResult);

			const result = hmt.shutdown();

			expect(result).toEqual(mockResult);
		});
	});

	describe("Configuration Validation", () => {
		test("should handle invalid priority configuration gracefully", () => {
			expect(() => {
				new HoldMyTask({
					priorities: {
						invalid: "not an object"
					}
				});
			}).not.toThrow();
		});

		test("should handle invalid coalescing configuration gracefully", () => {
			expect(() => {
				new HoldMyTask({
					coalescing: {
						keys: {
							invalid: "not an object"
						}
					}
				});
			}).not.toThrow();
		});

		test("should preserve valid settings when invalid ones are provided", () => {
			const hmt = new HoldMyTask({
				priorities: {
					5: { delay: 100 },
					invalid: "not an object"
				}
			});

			const config = hmt.getPriorityConfigurations();
			expect(config[5].delay).toBe(100);
		});
	});

	describe("Dynamic Configuration", () => {
		test("should affect future tasks after priority reconfiguration", async () => {
			const hmt = new HoldMyTask();

			// Initial configuration
			hmt.configurePriority(5, { start: 100 });

			// Verify initial configuration is applied
			const initialConfig = hmt.getPriorityConfig(5);
			expect(initialConfig.start).toBe(100);

			// Reconfigure priority
			hmt.configurePriority(5, { start: 50, delay: 25 });

			// Verify configuration was updated
			const updatedConfig = hmt.getPriorityConfig(5);
			expect(updatedConfig.start).toBe(50);
			expect(updatedConfig.delay).toBe(25);

			// Cleanup
			hmt.destroy();
		});

		test("should affect future tasks after coalescing key reconfiguration", async () => {
			const hmt = new HoldMyTask();

			// Initial configuration
			hmt.configureCoalescingKey("api", { start: 100, delay: 50 });

			// Verify initial configuration is applied
			const initialConfig = hmt.getCoalescingConfig("api");
			expect(initialConfig.start).toBe(100);
			expect(initialConfig.delay).toBe(50);

			// Reconfigure coalescing key
			hmt.configureCoalescingKey("api", { start: 25, delay: 10 });

			// Verify configuration was updated
			const updatedConfig = hmt.getCoalescingConfig("api");
			expect(updatedConfig.start).toBe(25);
			expect(updatedConfig.delay).toBe(10);

			// Cleanup
			hmt.destroy();
		});
	});

	describe("New Property Names", () => {
		test("should accept new startDelay and postDelay properties in priorities", () => {
			const hmt = new HoldMyTask({
				priorities: {
					10: { postDelay: 150, startDelay: 25 },
					5: { postDelay: 200, startDelay: 50 }
				}
			});

			const config10 = hmt.getPriorityConfig(10);
			expect(config10.postDelay).toBe(150);
			expect(config10.startDelay).toBe(25);
			// Should also provide backwards compatible names
			expect(config10.delay).toBe(150);
			expect(config10.start).toBe(25);

			const config5 = hmt.getPriorityConfig(5);
			expect(config5.postDelay).toBe(200);
			expect(config5.startDelay).toBe(50);
			// Should also provide backwards compatible names
			expect(config5.delay).toBe(200);
			expect(config5.start).toBe(50);

			hmt.destroy();
		});

		test("should accept new property names in coalescing configuration", () => {
			const hmt = new HoldMyTask({
				coalescing: {
					defaults: {
						postDelay: 75,
						startDelay: 30
					},
					keys: {
						"test-key": {
							postDelay: 100,
							startDelay: 15
						}
					}
				}
			});

			const defaultConfig = hmt.getCoalescingConfig("unknown-key");
			expect(defaultConfig.postDelay).toBe(75);
			expect(defaultConfig.startDelay).toBe(30);
			// Should also provide backwards compatible names
			expect(defaultConfig.delay).toBe(75);
			expect(defaultConfig.start).toBe(30);

			const keyConfig = hmt.getCoalescingConfig("test-key");
			expect(keyConfig.postDelay).toBe(100);
			expect(keyConfig.startDelay).toBe(15);
			// Should also provide backwards compatible names
			expect(keyConfig.delay).toBe(100);
			expect(keyConfig.start).toBe(15);

			hmt.destroy();
		});

		test("should accept new property names in configuration methods", () => {
			const hmt = new HoldMyTask();

			// Test configurePriority with new names
			hmt.configurePriority(7, { postDelay: 125, startDelay: 35 });
			const priorityConfig = hmt.getPriorityConfig(7);
			expect(priorityConfig.postDelay).toBe(125);
			expect(priorityConfig.startDelay).toBe(35);
			// Should also provide backwards compatible names
			expect(priorityConfig.delay).toBe(125);
			expect(priorityConfig.start).toBe(35);

			// Test configureCoalescingKey with new names
			hmt.configureCoalescingKey("new-key", { postDelay: 80, startDelay: 20 });
			const coalescingConfig = hmt.getCoalescingConfig("new-key");
			expect(coalescingConfig.postDelay).toBe(80);
			expect(coalescingConfig.startDelay).toBe(20);
			// Should also provide backwards compatible names
			expect(coalescingConfig.delay).toBe(80);
			expect(coalescingConfig.start).toBe(20);

			hmt.destroy();
		});

		test("should prioritize new property names over old ones when both are provided", () => {
			const hmt = new HoldMyTask({
				priorities: {
					8: {
						delay: 100,
						start: 25, // old names
						postDelay: 150,
						startDelay: 40 // new names should win
					}
				}
			});

			const config = hmt.getPriorityConfig(8);
			expect(config.postDelay).toBe(150); // new name wins
			expect(config.startDelay).toBe(40); // new name wins
			// Backwards compatible names should return the same values
			expect(config.delay).toBe(150);
			expect(config.start).toBe(40);

			hmt.destroy();
		});

		test("emits warning events for deprecated options", async () => {
			const warnings = [];

			const queue = new HoldMyTask({
				maxQueue: 5,
				delays: { 1: 100, 2: 200 }, // Deprecated
				coalescingWindowDuration: 300, // Deprecated
				coalescingMaxDelay: 2000, // Deprecated
				coalescingMultipleCallbacks: false, // Deprecated
				coalescingResolveAllPromises: true, // Deprecated
				priorities: {
					3: { delay: 150, start: 25 } // Deprecated property names
				}
			});

			// Collect warning events
			queue.on("warning", (warning) => {
				warnings.push(warning);
			});

			// Wait for warning events to be emitted
			await new Promise((resolve) => setTimeout(resolve, 50));

			// Should have warnings for deprecated options
			expect(warnings.length).toBeGreaterThan(0);

			// Check that warning has expected structure
			const delayWarning = warnings.find((w) => w.deprecated === "delays");
			expect(delayWarning).toBeTruthy();
			expect(delayWarning.type).toBe("deprecation");
			expect(delayWarning.message).toContain("deprecated");
			expect(delayWarning.replacement).toBe("priorities");

			// Check for coalescing deprecation warnings
			const coalescingWarnings = warnings.filter((w) => w.deprecated.startsWith("coalescing"));
			expect(coalescingWarnings.length).toBeGreaterThan(0);

			// Check for property name deprecation warnings
			const propertyWarnings = warnings.filter((w) => w.deprecated === "delay" || w.deprecated === "start");
			expect(propertyWarnings.length).toBe(2);

			queue.destroy();
		});
	});
});
