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

for (const viewport of [
  { width: 1280, height: 720 },
  { width: 390, height: 844 },
]) {
  test.describe(`at ${viewport.width} px wide`, () => {
    test.use({ viewport });

    test("a row with a long title and description with no spaces keeps clear of its actions", async ({
      page,
      request,
    }) => {
      // 120 wide characters with no space, the longest title the form accepts.
      const title =
        `W${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`
          .toUpperCase()
          .padEnd(120, "W");
      const response = await request.post("/api/trpc/task.create", {
        data: { json: { title, description: "M".repeat(300) } },
      });
      expect(response.status()).toBe(200);
      await page.goto("/");

      const row = page
        .getByRole("list", { name: "Tasks" })
        .getByRole("listitem")
        .filter({ hasText: title });
      const { contentRight, actionsLeft, sideScroll } = await row.evaluate(
        (item) => ({
          contentRight: Math.max(
            ...[...item.querySelectorAll("[data-slot^=item-]")]
              .filter((e) => !e.closest("[data-slot=item-actions]"))
              .map((e) => e.getBoundingClientRect().right),
          ),
          actionsLeft: item
            .querySelector("[data-slot=item-actions]")!
            .getBoundingClientRect().left,
          sideScroll:
            document.documentElement.scrollWidth -
            document.documentElement.clientWidth,
        }),
      );

      expect(contentRight).toBeLessThanOrEqual(actionsLeft);
      expect(sideScroll).toBeLessThanOrEqual(0);
    });
  });
}
