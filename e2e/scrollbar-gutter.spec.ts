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
