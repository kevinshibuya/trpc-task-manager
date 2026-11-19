import type { Page, Request } from "@playwright/test";

import { expect, test } from "./fixtures";

// Other specs create tasks on the same server, so nothing here asserts an
// exact total. The server starts with 50 sample tasks and pages hold 20.
const PAGE_SIZE = 20;
const SAMPLE_TASK_COUNT = 50;
const END_OF_LIST = "You have reached the end of the list.";

/** The cursor a `task.list` request asks for, or `undefined` for another call. */
function listCursor(request: Request): string | null | undefined {
  const url = new URL(request.url());
  if (!url.pathname.endsWith("/task.list")) return undefined;
  // httpBatchLink sends the input of each call in the batch, keyed by its
  // index and wrapped by superjson.
  const input = JSON.parse(url.searchParams.get("input") ?? "{}") as Record<
    string,
    { json?: { cursor?: string | null } }
  >;
  return input["0"]?.json?.cursor ?? null;
}

/** Records every `task.list` request the page sends, by its cursor. */
function recordListRequests(page: Page) {
  const cursors: (string | null)[] = [];
  page.on("request", (request) => {
    const cursor = listCursor(request);
    if (cursor !== undefined) cursors.push(cursor);
  });
  return cursors;
}

async function scrollToEnd(page: Page) {
  await page.evaluate(() =>
    window.scrollTo(0, document.documentElement.scrollHeight),
  );
}

const rows = (page: Page) =>
  page.getByRole("list", { name: "Tasks" }).getByRole("listitem");

test("scrolling to the end of the list loads more tasks", async ({ page }) => {
  await page.goto("/");
  await expect(rows(page)).toHaveCount(PAGE_SIZE);

  await scrollToEnd(page);

  await expect.poll(() => rows(page).count()).toBeGreaterThan(PAGE_SIZE);
});

test("scrolling until the end loads every task once and then stops", async ({
  page,
}) => {
  const cursors = recordListRequests(page);
  await page.goto("/");
  const endOfList = page.getByText(END_OF_LIST);

  await expect(async () => {
    await scrollToEnd(page);
    await expect(endOfList).toBeVisible({ timeout: 1_000 });
  }).toPass({ timeout: 20_000 });

  const count = await rows(page).count();
  expect(count).toBeGreaterThanOrEqual(SAMPLE_TASK_COUNT);

  // Sample titles repeat, so a task is told apart by its title and the
  // moment it was created.
  const keys = await rows(page).evaluateAll((items) =>
    items.map(
      (item) =>
        `${item.querySelector("[data-slot=item-title]")?.textContent}@${item
          .querySelector("time")
          ?.getAttribute("datetime")}`,
    ),
  );
  expect(new Set(keys).size).toBe(keys.length);

  // Once the list is over, scrolling asks for nothing more.
  const requestsAtEnd = cursors.length;
  await page.evaluate(() => window.scrollTo(0, 0));
  await scrollToEnd(page);
  await page.waitForTimeout(1_000);
  expect(cursors).toHaveLength(requestsAtEnd);
  await expect(rows(page)).toHaveCount(count);
});

test("the browser does not fetch the first page the server rendered", async ({
  page,
}) => {
  const cursors = recordListRequests(page);
  await page.goto("/");
  await expect(rows(page)).toHaveCount(PAGE_SIZE);

  await scrollToEnd(page);
  await expect.poll(() => rows(page).count()).toBeGreaterThan(PAGE_SIZE);
  await page.waitForLoadState("networkidle");

  expect(cursors.length).toBeGreaterThan(0);
  expect(cursors).not.toContain(null);
});

test("a page that fails to load offers a retry and keeps the tasks shown", async ({
  page,
  allowError,
}) => {
  // The aborted request below is the failure this test causes on purpose.
  allowError("net::ERR_FAILED");
  await page.goto("/");
  await expect(rows(page)).toHaveCount(PAGE_SIZE);

  const failedCursors: (string | null)[] = [];
  await page.route("**/api/trpc/task.list?**", async (route) => {
    failedCursors.push(listCursor(route.request()) ?? null);
    await route.abort("failed");
  });
  await scrollToEnd(page);

  const alert = page.getByRole("alert").filter({ hasText: /try again/i });
  await expect(alert).toBeVisible();
  await expect(rows(page)).toHaveCount(PAGE_SIZE);

  await page.unrouteAll();
  const retried = page.waitForRequest(
    (request) => listCursor(request) === failedCursors[0],
  );
  await alert.getByRole("button", { name: "Retry" }).click();
  await retried;

  await expect.poll(() => rows(page).count()).toBeGreaterThan(PAGE_SIZE);
  await expect(alert).toBeHidden();
});
