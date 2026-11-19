import { expect, test } from "./fixtures";

// The newest of the sample tasks the server starts with
// (src/server/tasks/sample-tasks.ts).
const NEWEST_SAMPLE_TITLE = "Water the plants";

test("the first response holds the tasks inside the list markup", async ({
  request,
  browser,
}) => {
  const response = await request.get("/");
  expect(response.status()).toBe(200);

  // With the scripts gone, a title that only sits in the serialized query
  // cache no longer counts. It has to be in the rendered markup.
  const html = (await response.text()).replace(
    /<script\b[^>]*>[\s\S]*?<\/script>/gi,
    "",
  );
  const context = await browser.newContext({ javaScriptEnabled: false });
  try {
    const page = await context.newPage();
    await page.setContent(html);
    const list = page.getByRole("list", { name: "Tasks" });
    await expect(list.getByText(NEWEST_SAMPLE_TITLE).first()).toBeAttached();
  } finally {
    await context.close();
  }
});

test("the first response is rendered for the request, not a static page", async ({
  request,
}) => {
  const response = await request.get("/");

  // A statically rendered page is sent with `s-maxage`, never `no-store`.
  expect(response.headers()["cache-control"]).toContain("no-store");
});

test("the list hydrates with no console error and no page error", async ({
  page,
}) => {
  await page.goto("/");

  const list = page.getByRole("list", { name: "Tasks" });
  await expect(list.getByText(NEWEST_SAMPLE_TITLE).first()).toBeVisible();
  await expect(list.getByRole("listitem").first()).toContainText(
    /\d{4}/, // the creation date
  );
  // Gives hydration and any request it starts the time to finish, so the
  // error guard sees what they log.
  await page.waitForLoadState("networkidle");
});
