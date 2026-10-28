import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL(".", import.meta.url)) },
  },
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    // Never let a test reach real services
    env: {
      FIREBASE_SERVICE_ACCOUNT: "",
      PAYSTACK_SECRET_KEY: "sk_test_unit",
      RESEND_API_KEY: "re_test_unit",
    },
  },
});
