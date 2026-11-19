import type { Locator, Page } from "@playwright/test";

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

/** How opaque an element inside a button looks, its own and its wrappers' opacity together. */
const shownOpacity = (locator: Locator) =>
  locator.evaluate((element) => {
    let opacity = 1;
    for (
      let node: Element | null = element;
      node && node.tagName !== "BUTTON";
      node = node.parentElement
    ) {
      opacity *= Number(getComputedStyle(node).opacity);
    }
    return opacity;
  });

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

test("Save takes the saving look while the page waits for its scripts, after a moment", async ({
  page,
}) => {
  // Animations stand still until the test lets them run, so the first check
  // sees the page as first painted, however slow the machine is.
  const cdp = await page.context().newCDPSession(page);
  await cdp.send("Animation.enable");
  await cdp.send("Animation.setPlaybackRate", { playbackRate: 0 });
  const release = await holdScripts(page);
  await page.goto("/tasks/new", { waitUntil: "domcontentloaded" });

  const save = page.getByRole("button", { name: "Create task", exact: true });
  const label = save.getByText("Create task");
  const spinner = save.locator("[data-slot=spinner]");
  await expect(save).toBeDisabled();
  await expect.poll(() => shownOpacity(label)).toBe(1);
  await expect.poll(() => shownOpacity(spinner)).toBe(0);

  await cdp.send("Animation.setPlaybackRate", { playbackRate: 1 });
  await expect.poll(() => shownOpacity(spinner)).toBe(1);
  await expect.poll(() => shownOpacity(label)).toBe(0);
  await expect(save).toBeDisabled();

  release();

  await expect(save).toBeEnabled();
  await expect(spinner).toHaveCount(0);
  await expect.poll(() => shownOpacity(label)).toBe(1);
});
