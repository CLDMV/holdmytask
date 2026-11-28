/**
 *
 *	@Project: @cldmv/holdmytask
 *	@Filename: /src/index.cjs
 *	@Date: 2025-11-08T14:04:10-08:00 (1762639450)
 *	@Author: Nate Corcoran <CLDMV>
 *	@Email: <Shinrai@users.noreply.github.com>
 *	-----
 *	@Last modified by: Nate Corcoran <CLDMV> (Shinrai@users.noreply.github.com)
 *	@Last modified time: 2026-11-01T16:28:46-08:00 (1793579326)
 *	-----
 *	@Copyright: Copyright (c) 2013-2026 Catalyzed Motivation Inc. All rights reserved.
 *
 */

/**
 * @fileoverview CommonJS entry point: the generic CLDMV drop-in shim
 * (CLDMV/.github docs/conventions/package-layout.md).
 *
 * It returns what `import` gives. holdmytask exports several distinct values (the HoldMyTask
 * class and the create* factories), so `require("@cldmv/holdmytask")` is the module object
 * ({ default, HoldMyTask, createQueue, ... }), not the class. tsup's onSuccess copies this
 * file verbatim into dist/, where `./index.mjs` resolves to the built entry.
 * @module holdmytask/cjs-entry
 */
"use strict";

if (!process.features?.require_module) {
	const error = new Error(
		`@cldmv/holdmytask: require() needs Node.js ^20.19.0 or >=22.13.0 (this is ${process.version}). On older Node.js, load the package with import() instead.`
	);
	error.code = "ERR_REQUIRE_ESM";
	throw error;
}

// Same exports as `import`. One distinct exported value (aliases of it count once) comes back as that value,
// so require(x)(...) works; anything else comes back as the module object ({ default, ...named }).
const esm = require("./index.mjs");
const values = new Set(
	Object.keys(esm)
		.filter((key) => key !== "__esModule")
		.map((key) => esm[key])
);
module.exports = values.size === 1 ? values.values().next().value : esm;
