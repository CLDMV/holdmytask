/**
 *	@Project: @cldmv/holdmytask
 *	@Filename: /index.cjs
 *	@Date: 2025-11-08 14:04:10 -08:00 (1762639450)
 *	@Author: Nate Hyson <CLDMV>
 *	@Email: <Shinrai@users.noreply.github.com>
 *	-----
 *	@Last modified by: Nate Hyson <CLDMV> (Shinrai@users.noreply.github.com)
 *	@Last modified time: 2025-11-09 16:22:18 -08:00 (1762734138)
 *	-----
 *	@Copyright: Copyright (c) 2013-2025 Catalyzed Motivation Inc. All rights reserved.
 */

/**
 * CommonJS entry point for holdmytask
 *
 * This file provides CommonJS (require) support for the holdmytask library.
 * It imports and re-exports the main HoldMyTask class from the ESM module.
 *
 * @module holdmytask
 */

const { createRequire } = require("module");
const requireESM = createRequire(__filename);

const { HoldMyTask } = requireESM("./index.mjs");

module.exports = { HoldMyTask };
module.exports.HoldMyTask = HoldMyTask;
