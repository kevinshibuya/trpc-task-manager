/**
 * What belongs in a browser spec: behaviour only a running application can
 * show. Server rendering, hydration, navigation, scrolling, and the whole path
 * from a click to the server and back. Rules, contracts and form validation
 * are tested faster at their own seams, with Vitest.
 *
 * The isolation rule. Every spec runs against one shared server, which starts
 * with the default sample tasks. So a spec only changes tasks it created
 * itself, never edits or deletes a sample task, and never asserts a total over
 * the whole store.
 *
 * Specs import `test` and `expect` from `./e2e/fixtures`, which fails a test
 * when the page logs a console error or throws an uncaught page error.
 */
import { defineConfig, devices } from "@playwright/test";

// Not 3000, so the suite never collides with a dev server on the default port.
const port = Number(process.env.E2E_PORT ?? 3100);
const baseURL = `http://localhost:${port}`;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL,
    trace: "retain-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        headless: true,
        launchOptions: { args: ["--mute-audio"] },
      },
    },
  ],
  // The production build, started by the suite and stopped when it ends.
  // `pnpm build` runs first. A server already listening on the port is an
  // error, never reused, so the specs always run against this build.
  webServer: {
    command: `pnpm start --port ${port}`,
    url: baseURL,
    reuseExistingServer: false,
    timeout: 60_000,
  },
});
