import type { APIRequestContext, Page } from "@playwright/test";

import { expect, test } from "./fixtures";

// Other specs share the server, so each run works on a task only it created.
const uniqueTitle = (label: string) =>
  `${label} by the layout spec ${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

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

/**
 * Records the text of the task list every time the DOM changes while it is on
 * the page, before the browser paints it. A list drawn from stale data and corrected a moment
 * later shows up here even when no frame happens to catch it.
 */
async function recordListText(page: Page) {
  await page.addInitScript(() => {
    const snapshots: string[] = [];
    Object.assign(window, { listSnapshots: snapshots });
    new MutationObserver(() => {
      const text = document.querySelector("[aria-label=Tasks]")?.textContent;
      if (text && text !== snapshots.at(-1)) snapshots.push(text);
    }).observe(document, {
      childList: true,
      subtree: true,
      characterData: true,
    });
  });
  return {
    clear: () =>
      page.evaluate(() => {
        (
          window as unknown as { listSnapshots: string[] }
        ).listSnapshots.length = 0;
      }),
    read: () =>
      page.evaluate(
        () => (window as unknown as { listSnapshots: string[] }).listSnapshots,
      ),
  };
}

/**
 * Waits until React has hydrated the list. A link clicked before that is a
 * full page load, which starts with an empty cache and so proves nothing.
 */
async function waitForHydratedList(page: Page) {
  await expect
    .poll(() =>
      page
        .getByRole("list", { name: "Tasks" })
        .evaluate((list) =>
          Object.keys(list).some((key) => key.startsWith("__reactFiber")),
        ),
    )
    .toBe(true);
}

test("after creating a task, the list's first render on return already holds it", async ({
  page,
}) => {
  const snapshots = await recordListText(page);
  const title = uniqueTitle("Created");
  // The list is in the browser's cache before the form opens.
  await page.goto("/");
  await waitForHydratedList(page);
  await page
    .getByRole("banner")
    .getByRole("link", { name: "New task" })
    .click();
  await page.getByRole("textbox", { name: "Title" }).fill(title);

  await snapshots.clear();
  await page.getByRole("button", { name: "Create task" }).click();
  await expect(page.getByText("Task created.")).toBeVisible();
  await expect(
    page.getByRole("listitem").filter({ hasText: title }),
  ).toHaveCount(1);
  await page.waitForLoadState("networkidle");

  const shown = await snapshots.read();
  expect(shown.length).toBeGreaterThan(0);
  // One entry per render of the list: whether it already held the change.
  expect(shown.map((text) => text.includes(title))).not.toContain(false);
});

test("after editing a task, the list's first render on return already shows the change", async ({
  page,
  request,
}) => {
  const snapshots = await recordListText(page);
  const title = uniqueTitle("Before");
  await createTask(request, { title });
  const description = uniqueTitle("A line added");
  await page.goto("/");
  await waitForHydratedList(page);
  await page.getByRole("link", { name: `Edit ${title}` }).click();
  await page.getByRole("textbox", { name: /Description/ }).fill(description);

  await snapshots.clear();
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page.getByText("Task updated.")).toBeVisible();
  await expect(page.getByText(description)).toBeVisible();
  await page.waitForLoadState("networkidle");

  const shown = await snapshots.read();
  expect(shown.length).toBeGreaterThan(0);
  // One entry per render of the list: whether it already held the change.
  expect(shown.map((text) => text.includes(description))).not.toContain(false);
});

test("Save keeps its width while saving, and Cancel does not move", async ({
  page,
}) => {
  let release!: () => void;
  const released = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route("**/api/trpc/task.create**", async (route) => {
    await released;
    await route.continue();
  });
  await page.goto("/tasks/new");
  const save = page.getByRole("button", { name: "Create task" });
  const cancel = page.getByRole("link", { name: "Cancel" });
  await expect(save).toBeEnabled();
  await page
    .getByRole("textbox", { name: "Title" })
    .fill(uniqueTitle("Saved slowly"));
  const saveBefore = await save.boundingBox();
  const cancelBefore = await cancel.boundingBox();

  await save.click();
  await expect(save).toBeDisabled();
  await expect(save.locator("[data-slot=spinner]")).toBeVisible();

  expect((await save.boundingBox())?.width).toBe(saveBefore?.width);
  expect((await cancel.boundingBox())?.x).toBe(cancelBefore?.x);
  // The label is still the button's name while the spinner covers it.
  await expect(save).toHaveAccessibleName(/Create task/);

  release();
  await expect(page).toHaveURL("/");
});
