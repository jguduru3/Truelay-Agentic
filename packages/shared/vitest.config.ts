import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // Tests run under a fixed one-word product name so fixtures and expected
    // text do not depend on the deployment's APP_PRODUCT_NAME. See doc/BRANDING.md.
    env: { APP_PRODUCT_NAME: "Papyrus", VITE_APP_PRODUCT_NAME: "Papyrus" },
    include: ["src/**/*.test.ts"],
  },
});
