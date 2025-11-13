/**
 *	@Project: @cldmv/holdmytask
 *	@Filename: /index.mjs
 *	@Date: 2025-11-08 14:04:10 -08:00 (1762639450)
 *	@Author: Nate Hyson <CLDMV>
 *	@Email: <Shinrai@users.noreply.github.com>
 *	-----
 *	@Last modified by: Nate Hyson <CLDMV> (Shinrai@users.noreply.github.com)
 *	@Last modified time: 2025-11-09 16:22:22 -08:00 (1762734142)
 *	-----
 *	@Copyright: Copyright (c) 2013-2025 Catalyzed Motivation Inc. All rights reserved.
 */

// Development environment check (must happen before holdmytask imports)
(async () => {
	try {
		await import("@cldmv/holdmytask/devcheck");
	} catch {
		// ignore
	}
})();

// Export everything from main module
export * from "@cldmv/holdmytask/main";

// Default export
export { HoldMyTask as default } from "@cldmv/holdmytask/main";

// Common queue system aliases
export { HoldMyTask as queue } from "@cldmv/holdmytask/main";
export { HoldMyTask as Queue } from "@cldmv/holdmytask/main";
export { HoldMyTask as TaskManager } from "@cldmv/holdmytask/main";
export { HoldMyTask as TaskQueue } from "@cldmv/holdmytask/main";
export { HoldMyTask as QueueManager } from "@cldmv/holdmytask/main";
export { HoldMyTask as TaskProcessor } from "@cldmv/holdmytask/main";
