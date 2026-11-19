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
  const onList = await columnX();

  await page.goto("/tasks/new");
  await expect(page.getByRole("textbox", { name: "Title" })).toBeVisible();

  expect(await columnX()).toBe(onList);
});
