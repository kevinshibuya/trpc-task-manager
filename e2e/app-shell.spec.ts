import { expect, test } from "./fixtures";

test("the home page shows the header", async ({ page }) => {
  await page.goto("/");

  const header = page.getByRole("banner");
  await expect(
    header.getByRole("link", { name: "Task manager" }),
  ).toBeVisible();
  await expect(
    header.getByRole("button", { name: "Toggle theme" }),
  ).toBeVisible();
});

test.describe("with a dark system theme", () => {
  test.use({ colorScheme: "dark" });

  test("the theme follows the system until switched, and the choice survives a reload", async ({
    page,
  }) => {
    const html = page.locator("html");
    await page.goto("/");
    await expect(html).toHaveClass(/\bdark\b/);

    await page.getByRole("button", { name: "Toggle theme" }).click();
    await expect(html).toHaveClass(/\blight\b/);

    await page.reload();
    await expect(html).toHaveClass(/\blight\b/);
  });
});

test("the theme toggle switches the theme inside a view transition", async ({
  page,
}) => {
  // Records the theme class as it stands once the transition's update is
  // done, which is what the new snapshot of the page shows.
  await page.addInitScript(() => {
    const start = document.startViewTransition.bind(document);
    const classes: string[] = [];
    Object.assign(window, { classesAfterUpdate: classes });
    document.startViewTransition = (update) =>
      start(async () => {
        if (typeof update === "function") await update();
        classes.push(document.documentElement.className);
      });
  });
  const html = page.locator("html");
  await page.goto("/");
  await expect(html).toHaveClass(/\blight\b/);

  await page.getByRole("button", { name: "Toggle theme" }).click();

  await expect(html).toHaveClass(/\bdark\b/);
  const classesAfterUpdate = await page.evaluate(
    () =>
      (window as unknown as { classesAfterUpdate: string[] })
        .classesAfterUpdate,
  );
  expect(classesAfterUpdate).toHaveLength(1);
  expect(classesAfterUpdate[0]).toMatch(/\bdark\b/);
});

test("an unknown address shows the not found page with a link home", async ({
  page,
  allowError,
}) => {
  // The browser logs the 404 response of the document itself.
  allowError("404");

  const response = await page.goto("/no-such-page");
  expect(response?.status()).toBe(404);
  await expect(page.getByText("Page not found")).toBeVisible();

  await page.getByRole("link", { name: "Back to the home page" }).click();
  await expect(page).toHaveURL("/");
  await expect(page.getByRole("list", { name: "Tasks" })).toBeVisible();
});
