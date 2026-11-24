import path from "path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      lexical: path.resolve(__dirname, "./node_modules/lexical/dist/Lexical.mjs"),
    },
  },
  test: {
    // Tests run under a fixed one-word product name so fixtures and expected
    // text do not depend on the deployment's APP_PRODUCT_NAME. See doc/BRANDING.md.
    env: {
      APP_PRODUCT_NAME: "Papyrus",
      VITE_APP_PRODUCT_NAME: "Papyrus",
      VITE_APP_DOCS_URL: "https://docs.example.test",
      VITE_APP_FEEDBACK_URL: "https://example.test/feedback",
      VITE_APP_PRIVACY_URL: "https://example.test/privacy",
      VITE_APP_TERMS_URL: "https://example.test/terms",
      VITE_APP_WEBSITE_URL: "https://example.test",
      VITE_APP_SOURCE_URL: "https://github.com/example/app",
    },
    environment: "node",
    css: { include: [/motion-tokens\.css/] },
    setupFiles: ["./vitest.setup.ts"],
  },
});
