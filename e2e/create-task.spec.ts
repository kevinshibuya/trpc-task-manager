import { expect, test } from "./fixtures";

// Other specs share the server, so each run creates a title nobody else uses.
const uniqueTitle = () =>
  `Created by the browser spec ${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

test("New task opens the form, which refuses an empty title and stays on the page", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByRole("banner")
    .getByRole("link", { name: "New task" })
    .click();

  await expect(page).toHaveURL("/tasks/new");
  const title = page.getByRole("textbox", { name: "Title" });
  await expect(title).toBeVisible();

  await page.getByRole("button", { name: "Create task" }).click();

  await expect(page.getByText("Enter a title.")).toBeVisible();
  await expect(title).toBeFocused();
  await expect(page).toHaveURL("/tasks/new");
});

test("creating a task returns to the list with a confirmation and the task first", async ({
  page,
  request,
}) => {
  const title = uniqueTitle();
  await page.goto("/tasks/new");

  await page.getByRole("textbox", { name: "Title" }).fill(title);
  await page
    .getByRole("textbox", { name: /Description/ })
    .fill("Made in a browser.");
  await page.getByRole("button", { name: "Create task" }).click();

  await expect(page).toHaveURL("/");
  await expect(page.getByText("Task created.")).toBeVisible();
  const firstRow = page
    .getByRole("list", { name: "Tasks" })
    .getByRole("listitem")
    .first();
  await expect(firstRow).toContainText(title);
  await page.waitForLoadState("networkidle");

  // A page built once, at build time, could not hold a task created now.
  const response = await request.get("/");
  expect(response.status()).toBe(200);
  expect(await response.text()).toContain(title);
});
