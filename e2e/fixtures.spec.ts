import { test } from "./fixtures";

// These specs check the error guard itself. Each one is expected to fail.

test("a console error fails the test", async ({ page }) => {
  test.fail();
  await page.goto("/");
  await page.evaluate(() => console.error("logged on purpose"));
});

test("an uncaught page error fails the test", async ({ page }) => {
  test.fail();
  await page.goto("/");
  await Promise.all([
    page.waitForEvent("pageerror"),
    page.evaluate(() => {
      setTimeout(() => {
        throw new Error("thrown on purpose");
      });
    }),
  ]);
});

test("an allowed error does not fail the test", async ({
  page,
  allowError,
}) => {
  allowError("logged on purpose");
  await page.goto("/");
  await page.evaluate(() => console.error("logged on purpose"));
});
