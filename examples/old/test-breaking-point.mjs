import { findBreakingPoint } from "./breaking-point-analysis.mjs";

console.log("🎯 BREAKING POINT ANALYSIS");
console.log("Finding exactly when coalescing timing becomes problematic...\n");

findBreakingPoint().catch(console.error);
