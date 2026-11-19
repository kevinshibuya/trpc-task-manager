import { expect, test } from "./fixtures";

// Other specs share the server, so each run creates a title nobody else uses.
const uniqueTitle = () =>
  `Created by the browser spec ${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

test("New task opens the form, which refuses an empty title and stays on the page", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("main").getByRole("link", { name: "New task" }).click();

  await expect(page).toHaveURL("/tasks/new");
  const title = page.getByRole("textbox", { name: "Title" });
  await expect(title).toBeVisible();

  await page.getByRole("button", { name: "Create task" }).click();

  await expect(page.getByText("Enter a title.")).toBeVisible();
  await expect(title).toBeFocused();
  await expect(page).toHaveURL("/tasks/new");
});

test("a title over 120 characters shows its message as it is typed", async ({
  page,
}) => {
  await page.goto("/tasks/new");
  const save = page.getByRole("button", { name: "Create task" });
  await expect(save).toBeEnabled();

  await page.getByRole("textbox", { name: "Title" }).fill("a".repeat(150));

  await expect(
    page.getByText("The title can have at most 120 characters."),
  ).toBeVisible();
});

test("creating a task returns to the list with a confirmation and no older task above it", async ({
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
  const rows = page.getByRole("list", { name: "Tasks" }).getByRole("listitem");
  await expect(rows.filter({ hasText: title })).toHaveCount(1);

  // Other specs create tasks on the same server, so a task created a moment
  // later can sit above this one. Newest first means no row above it is older.
  const shown = await rows.evaluateAll((items) =>
    items.map((item) => ({
      title: item.querySelector("[data-slot=item-title]")?.textContent,
      createdAt: item.querySelector("time")?.getAttribute("datetime") ?? "",
    })),
  );
  const index = shown.findIndex((row) => row.title === title);
  expect(index).not.toBe(-1);
  const olderAbove = shown
    .slice(0, index)
    .filter((row) => row.createdAt < shown[index].createdAt);
  expect(olderAbove).toEqual([]);
  await page.waitForLoadState("networkidle");

  // A page built once, at build time, could not hold a task created now.
  const response = await request.get("/");
  expect(response.status()).toBe(200);
  expect(await response.text()).toContain(title);
});
