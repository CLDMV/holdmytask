import { defineConfig } from "vitest/config";

export default defineConfig({
	test: {
		include: ["tests/**/*.vest.{js,mjs,cjs}"],
		exclude: ["node_modules"],
		environment: "node",
		globals: true
	}
});
