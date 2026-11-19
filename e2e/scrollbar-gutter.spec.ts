import type { Page } from "@playwright/test";

import { expect, test } from "./fixtures";

// Playwright hides scrollbars in headless Chromium. Shown, they take layout
// width the way they do on most desktop browsers, which is the case here.
test.use({
  launchOptions: {
    args: ["--mute-audio"],
    ignoreDefaultArgs: ["--hide-scrollbars"],
  },
});

test("the column stays put between a page that scrolls and one that does not", async ({
  page,
}) => {
  const columnX = async () => (await page.locator("main").boundingBox())?.x;
  await page.goto("/");
  await expect(page.getByRole("list", { name: "Tasks" })).toBeVisible();
  const scrolls = await page.evaluate(
    () => document.documentElement.scrollHeight > innerHeight,
  );
  expect(scrolls).toBe(true);
  // The scrollbar takes layout width here, so a column that ignored it would
  // sit elsewhere on a page without one.
  const scrollbarWidth = await page.evaluate(
    () => innerWidth - document.documentElement.clientWidth,
  );
  expect(scrollbarWidth).toBeGreaterThan(0);
  const onList = await columnX();

  await page.goto("/tasks/new");
  await expect(page.getByRole("textbox", { name: "Title" })).toBeVisible();
  const formScrolls = await page.evaluate(
    () => document.documentElement.scrollHeight > innerHeight,
  );
  expect(formScrolls).toBe(false);

  expect(await columnX()).toBe(onList);
});

/** The colour on screen at one point, read from a screenshot. */
async function colourAt(page: Page, x: number, y: number) {
  const shot = await page.screenshot({ clip: { x, y, width: 1, height: 1 } });
  return page.evaluate(
    async (src) => {
      const image = new Image();
      image.src = src;
      await image.decode();
      const canvas = new OffscreenCanvas(1, 1);
      const context = canvas.getContext("2d")!;
      context.drawImage(image, 0, 0);
      return Array.from(context.getImageData(0, 0, 1, 1).data.slice(0, 3));
    },
    `data:image/png;base64,${shot.toString("base64")}`,
  );
}

/** The page's own background, as the canvas would draw it. */
const pageColour = (page: Page) =>
  page.evaluate(() => {
    const context = new OffscreenCanvas(1, 1).getContext("2d")!;
    context.fillStyle = getComputedStyle(document.body).backgroundColor;
    context.fillRect(0, 0, 1, 1);
    return Array.from(context.getImageData(0, 0, 1, 1).data.slice(0, 3));
  });

for (const colorScheme of ["light", "dark"] as const) {
  test.describe(`in the ${colorScheme} theme`, () => {
    test.use({ colorScheme });

    test("the delete dialog's backdrop reaches the window's edge and the page behind stays put", async ({
      page,
    }) => {
      const columnX = async () => (await page.locator("main").boundingBox())?.x;
      await page.goto("/");
      await expect(page.getByRole("list", { name: "Tasks" })).toBeVisible();
      const before = await columnX();
      const { width } = page.viewportSize()!;

      // Opened and cancelled, so no sample task is deleted.
      await page
        .getByRole("button", { name: /^Delete/ })
        .first()
        .click();
      const dialog = page.getByRole("alertdialog");
      await expect(dialog).toBeVisible();
      // The backdrop fades in; its colour counts once the fade is over.
      await page.evaluate(() =>
        Promise.all(
          document
            .getAnimations()
            .filter((a) => a.effect?.getComputedTiming().endTime !== Infinity)
            .map((a) => a.finished),
        ),
      );

      // The scroll lock hides the scrollbar and keeps its gutter, where no
      // fixed element paints. What shows there must match the backdrop over
      // the empty page at the left edge.
      const gutter = await colourAt(page, width - 5, 400);
      const backdrop = await colourAt(page, 5, 400);
      expect(backdrop).not.toEqual(await pageColour(page));
      for (const [i, channel] of gutter.entries()) {
        expect(Math.abs(channel - backdrop[i])).toBeLessThanOrEqual(2);
      }
      expect(await columnX()).toBe(before);

      await dialog.getByRole("button", { name: "Cancel" }).click();
      await expect(dialog).toBeHidden();
      expect(await columnX()).toBe(before);
    });
  });
}
