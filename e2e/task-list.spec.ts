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

test.describe("for a viewer in another time zone than the server", () => {
  // The server runs in UTC (playwright.config.ts).
  const VIEWER_TIME_ZONE = "Pacific/Auckland";
  test.use({ timezoneId: VIEWER_TIME_ZONE });

  test("the server renders the creation date in UTC", async ({ request }) => {
    const html = await (await request.get("/")).text();

    const firstDate = /<time\b[^>]*>([\s\S]*?)<\/time>/
      .exec(html)?.[1]
      .replace(/<!--[\s\S]*?-->/g, "");
    expect(firstDate).toMatch(/\d{4}.* UTC$/);
  });

  test("the list hydrates with no console error, then shows the date in the viewer's zone", async ({
    page,
  }) => {
    await page.goto("/");

    const list = page.getByRole("list", { name: "Tasks" });
    await expect(list.getByText(NEWEST_SAMPLE_TITLE).first()).toBeVisible();

    const date = list.getByRole("listitem").first().locator("time");
    const viewerText = await date.evaluate(
      (time, timeZone) =>
        new Intl.DateTimeFormat("en-US", {
          dateStyle: "medium",
          timeStyle: "short",
          timeZone,
        }).format(new Date(time.getAttribute("datetime") ?? "")),
      VIEWER_TIME_ZONE,
    );
    await expect(date).toHaveText(viewerText);

    // Gives hydration and any request it starts the time to finish, so the
    // error guard sees what they log.
    await page.waitForLoadState("networkidle");
  });
});
