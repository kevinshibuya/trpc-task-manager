import type { APIRequestContext } from "@playwright/test";

import { expect, test } from "./fixtures";

// Other specs share the server, so each run edits a task only it created.
const uniqueTitle = (label: string) =>
  `${label} by the browser spec ${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

async function createTask(
  request: APIRequestContext,
  input: { title: string; description?: string },
): Promise<string> {
  const response = await request.post("/api/trpc/task.create", {
    data: { json: input },
  });
  expect(response.status()).toBe(200);
  const body = await response.json();
  return body.result.data.json.id;
}

test("the edit link opens the form with the task's values, already in the first response", async ({
  page,
  request,
  browser,
}) => {
  const title = uniqueTitle("Edited");
  const id = await createTask(request, {
    title,
    description: "Written before the edit.",
  });

  // With the scripts gone and JavaScript off, only the rendered markup counts.
  const response = await request.get(`/tasks/${id}/edit`);
  expect(response.status()).toBe(200);
  const html = (await response.text()).replace(
    /<script\b[^>]*>[\s\S]*?<\/script>/gi,
    "",
  );
  const context = await browser.newContext({ javaScriptEnabled: false });
  try {
    const staticPage = await context.newPage();
    await staticPage.setContent(html);
    await expect(
      staticPage.getByRole("textbox", { name: "Title" }),
    ).toHaveValue(title);
    await expect(
      staticPage.getByRole("textbox", { name: /Description/ }),
    ).toHaveValue("Written before the edit.");
  } finally {
    await context.close();
  }

  await page.goto("/");
  await page.getByRole("link", { name: `Edit ${title}` }).click();

  await expect(page).toHaveURL(`/tasks/${id}/edit`);
  await expect(page.getByRole("textbox", { name: "Title" })).toHaveValue(title);
  await expect(page.getByRole("textbox", { name: /Description/ })).toHaveValue(
    "Written before the edit.",
  );
});

test("saving a new title returns to the list with a confirmation and the new title on the same task", async ({
  page,
  request,
}) => {
  const id = await createTask(request, { title: uniqueTitle("Before") });
  const newTitle = uniqueTitle("After");

  await page.goto(`/tasks/${id}/edit`);
  await page.getByRole("textbox", { name: "Title" }).fill(newTitle);
  await page.getByRole("button", { name: "Save changes" }).click();

  await expect(page).toHaveURL("/");
  await expect(page.getByText("Task updated.")).toBeVisible();
  const row = page
    .getByRole("list", { name: "Tasks" })
    .getByRole("listitem")
    .filter({ hasText: newTitle });
  await expect(row).toHaveCount(1);
  await expect(row.getByRole("link", { name: /^Edit/ })).toHaveAttribute(
    "href",
    `/tasks/${id}/edit`,
  );
  await page.waitForLoadState("networkidle");
});

test("the edit address of an unknown id answers 404 with the not found page", async ({
  page,
  allowError,
}) => {
  // The browser logs the 404 this test asks for.
  allowError(/404/);

  const response = await page.goto("/tasks/no-such-task/edit");

  expect(response?.status()).toBe(404);
  await expect(page.getByText("Page not found")).toBeVisible();
  await page.waitForLoadState("networkidle");
});
