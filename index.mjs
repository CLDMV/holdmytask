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

export { HoldMyTask } from "@cldmv/holdmytask/main";
