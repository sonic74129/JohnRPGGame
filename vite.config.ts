import { defineConfig } from "vitest/config";

export default defineConfig({
  base: process.env.VITE_BASE_PATH ?? "./",
  build: {
    target: "es2022",
    assetsInlineLimit: 0,
  },
  test: {
    fileParallelism: false,
  },
});
