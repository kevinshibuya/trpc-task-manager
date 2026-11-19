import type { Page } from "@playwright/test";

import { expect, test } from "./fixtures";

// 120 characters with no space, the longest title the form accepts.
const unbrokenTitle = () =>
  `Unbroken${Date.now()}${Math.random().toString(36).slice(2, 8)}`
    .padEnd(120, "x")
    .slice(0, 120);

/** The title's box, its text, and the row's actions, as the page lays them out. */
async function rowGeometry(page: Page, title: string) {
  const row = page
    .getByRole("list", { name: "Tasks" })
    .getByRole("listitem")
    .filter({ hasText: title });
  await expect(row).toBeVisible();
  return row.evaluate((item) => {
    const titleBox = item.querySelector("[data-slot=item-title]")!;
    const actions = item.querySelector("[data-slot=item-actions]")!;
    const text = document.createRange();
    text.selectNodeContents(titleBox);
    return {
      titleRight: titleBox.getBoundingClientRect().right,
      textRight: text.getBoundingClientRect().right,
      actionsLeft: actions.getBoundingClientRect().left,
      sideScroll:
        document.documentElement.scrollWidth -
        document.documentElement.clientWidth,
    };
  });
}

test.describe("on a phone-wide screen", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("a long title with no spaces wraps clear of the row's actions", async ({
    page,
    request,
  }) => {
    const title = unbrokenTitle();
    const response = await request.post("/api/trpc/task.create", {
      data: { json: { title, description: title } },
    });
    expect(response.status()).toBe(200);

    await page.goto("/");
    const { titleRight, textRight, actionsLeft, sideScroll } =
      await rowGeometry(page, title);

    expect(titleRight).toBeLessThanOrEqual(actionsLeft);
    expect(textRight).toBeLessThanOrEqual(actionsLeft);
    expect(sideScroll).toBeLessThanOrEqual(0);
  });
});
