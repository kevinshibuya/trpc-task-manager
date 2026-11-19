/**
 * The testing rule. Each behaviour is tested at the one seam that can show it:
 *
 * - The task rules (trimming, length limits, ordering, pagination, "not
 *   found") are tested on the task service over a fresh in-memory repository,
 *   with no tRPC and no Next.js.
 * - The contract (procedures, error codes, what crosses the wire) is tested on
 *   the tRPC router, through an in-process caller or a `Request` sent to the
 *   fetch adapter, with no HTTP server.
 * - The form (validation messages, a single submit, pending state, server
 *   field errors) is tested by rendering it in a test DOM.
 *
 * Every test starts from its own empty repository with sample data off, so
 * the order of tests never matters. What only a running browser can show
 * belongs in a Playwright spec under `e2e/`, not here.
 */
import { fileURLToPath } from "node:url";

import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  test: {
    environment: "jsdom",
    include: ["src/**/*.test.{ts,tsx}"],
    setupFiles: ["./vitest.setup.ts"],
  },
});
