import type { Page } from "@playwright/test";

import { expect, test } from "./fixtures";

// The server starts with 50 sample tasks and pages hold 20, so the first page
// always has another after it.
const PAGE_SIZE = 20;

/**
 * Holds back the page's JavaScript until `release` is called, so the page
 * stays as the server rendered it, the way a slow connection shows it. The
 * stylesheets still load.
 */
async function holdScripts(page: Page) {
  let release!: () => void;
  const released = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route("**/_next/static/chunks/**", async (route) => {
    await released;
    await route.continue();
  });
  return release;
}

const rows = (page: Page) =>
  page.getByRole("list", { name: "Tasks" }).getByRole("listitem");

test("the list ends with skeleton rows before hydration, and the next page replaces them after", async ({
  page,
}) => {
  const release = await holdScripts(page);
  await page.goto("/", { waitUntil: "domcontentloaded" });

  await expect(rows(page)).toHaveCount(PAGE_SIZE);
  const skeletons = page.locator("main [data-slot=skeleton]");
  await expect(skeletons.first()).toBeAttached();
  await page.evaluate(() =>
    window.scrollTo(0, document.documentElement.scrollHeight),
  );
  await expect(skeletons.last()).toBeInViewport();

  release();

  await expect.poll(() => rows(page).count()).toBeGreaterThan(PAGE_SIZE);
});

test.describe("in a viewport shorter than the skeleton rows", () => {
  test.use({ viewport: { width: 1280, height: 200 } });

  test("scrolling to the end before hydration still loads the next page", async ({
    page,
  }) => {
    const release = await holdScripts(page);
    await page.goto("/", { waitUntil: "domcontentloaded" });

    await expect(rows(page)).toHaveCount(PAGE_SIZE);
    await page.evaluate(() =>
      window.scrollTo(0, document.documentElement.scrollHeight),
    );
    await expect(
      page.locator("main [data-slot=skeleton]").last(),
    ).toBeInViewport();

    release();

    await expect.poll(() => rows(page).count()).toBeGreaterThan(PAGE_SIZE);
  });
});

test("Save is disabled until the form has hydrated", async ({ page }) => {
  const release = await holdScripts(page);
  await page.goto("/tasks/new", { waitUntil: "domcontentloaded" });

  const save = page.getByRole("button", { name: "Create task" });
  await expect(save).toBeDisabled();

  release();

  await expect(save).toBeEnabled();
});
