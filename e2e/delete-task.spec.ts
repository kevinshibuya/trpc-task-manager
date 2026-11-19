import type { APIRequestContext, Page } from "@playwright/test";

import { expect, test } from "./fixtures";

// Other specs share the server, so each run deletes a task only it created.
const uniqueTitle = (label: string) =>
  `${label} by the browser spec ${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

// The batch link puts the procedure names in the path: `/api/trpc/task.delete?batch=1`.
const DELETE_REQUEST = /\/api\/trpc\/[^?]*task\.delete/;
const LIST_REQUEST = /\/api\/trpc\/[^?]*task\.list/;

async function createTask(
  request: APIRequestContext,
  title: string,
): Promise<void> {
  const response = await request.post("/api/trpc/task.create", {
    data: { json: { title } },
  });
  expect(response.status()).toBe(200);
}

/** A promise and the function that settles it, to hold a request back. */
function gate() {
  let open!: () => void;
  const opened = new Promise<void>((resolve) => (open = resolve));
  return { open, opened };
}

const taskRow = (page: Page, title: string) =>
  page
    .getByRole("list", { name: "Tasks" })
    .getByRole("listitem")
    .filter({ hasText: title });

async function openDeleteDialog(page: Page, title: string) {
  await page.getByRole("button", { name: `Delete ${title}` }).click();
  const dialog = page.getByRole("alertdialog");
  await expect(dialog).toContainText(title);
  return dialog;
}

test("cancelling the dialog leaves the task in the list", async ({
  page,
  request,
}) => {
  const title = uniqueTitle("Kept");
  await createTask(request, title);
  await page.goto("/");

  const dialog = await openDeleteDialog(page, title);
  await dialog.getByRole("button", { name: "Cancel" }).click();

  await expect(dialog).toBeHidden();
  await expect(taskRow(page, title)).toHaveCount(1);
  await page.reload();
  await expect(taskRow(page, title)).toHaveCount(1);
});

test("confirming removes the row while the request is pending, then confirms, and the task stays gone", async ({
  page,
  request,
}) => {
  const title = uniqueTitle("Deleted");
  await createTask(request, title);
  await page.goto("/");
  await expect(taskRow(page, title)).toHaveCount(1);

  const deleteResponse = gate();
  await page.route(DELETE_REQUEST, async (route) => {
    await deleteResponse.opened;
    await route.continue();
  });

  const dialog = await openDeleteDialog(page, title);
  await dialog.getByRole("button", { name: "Delete", exact: true }).click();

  // The request is still held, so only the cache can have removed the row.
  await expect(taskRow(page, title)).toHaveCount(0);

  deleteResponse.open();
  await expect(page.getByText("Task deleted.")).toBeVisible();
  await page.waitForLoadState("networkidle");

  await page.reload();
  await expect(page.getByRole("list", { name: "Tasks" })).toBeVisible();
  await expect(taskRow(page, title)).toHaveCount(0);
});

test("a failed delete brings the row back with an error before the list is fetched again", async ({
  page,
  request,
  allowError,
}) => {
  // The browser logs the request this test aborts.
  allowError(/ERR_FAILED/);
  const title = uniqueTitle("Restored");
  await createTask(request, title);
  await page.goto("/");
  await expect(taskRow(page, title)).toHaveCount(1);

  await page.route(DELETE_REQUEST, (route) => route.abort());
  const listRequested = gate();
  const listResponse = gate();
  await page.route(LIST_REQUEST, async (route) => {
    listRequested.open();
    await listResponse.opened;
    await route.continue();
  });

  const dialog = await openDeleteDialog(page, title);
  await dialog.getByRole("button", { name: "Delete", exact: true }).click();

  // The revalidation has started and its answer is held back, so the row can
  // only come from the cache the failed delete restored.
  await listRequested.opened;
  await expect(taskRow(page, title)).toHaveCount(1);
  await expect(page.getByText("The task could not be deleted.")).toBeVisible();
  await expect(page.getByText(/server could not be reached/)).toBeVisible();

  listResponse.open();
  await page.waitForLoadState("networkidle");
  await page.reload();
  await expect(taskRow(page, title)).toHaveCount(1);
});
