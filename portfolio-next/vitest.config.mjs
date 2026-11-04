import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  // les composants du projet sont en .js avec du JSX
  oxc: { lang: "jsx", include: /\.(js|jsx)$/ },
  test: {
    environment: "jsdom",
    setupFiles: ["./tests/setup.js"],
    include: ["tests/**/*.test.{js,jsx}"],
    globals: false,
  },
});
