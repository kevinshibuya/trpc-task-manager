import { expect, test } from "./fixtures";

test("the home page shows the header", async ({ page }) => {
  await page.goto("/");

  const header = page.getByRole("banner");
  await expect(
    header.getByRole("link", { name: "Task manager" }),
  ).toBeVisible();
  await expect(
    header.getByRole("button", { name: "Toggle theme" }),
  ).toBeVisible();
});

test.describe("with a dark system theme", () => {
  test.use({ colorScheme: "dark" });

  test("the theme follows the system until switched, and the choice survives a reload", async ({
    page,
  }) => {
    const html = page.locator("html");
    await page.goto("/");
    await expect(html).toHaveClass(/\bdark\b/);

    await page.getByRole("button", { name: "Toggle theme" }).click();
    await expect(html).toHaveClass(/\blight\b/);

    await page.reload();
    await expect(html).toHaveClass(/\blight\b/);
  });
});

test("the theme toggle switches the theme inside a view transition", async ({
  page,
}) => {
  // Records the theme class as it stands once the transition's update is
  // done, which is what the new snapshot of the page shows.
  await page.addInitScript(() => {
    const start = document.startViewTransition.bind(document);
    const classes: string[] = [];
    Object.assign(window, { classesAfterUpdate: classes });
    document.startViewTransition = (update) =>
      start(async () => {
        if (typeof update === "function") await update();
        classes.push(document.documentElement.className);
      });
  });
  const html = page.locator("html");
  await page.goto("/");
  await expect(html).toHaveClass(/\blight\b/);

  await page.getByRole("button", { name: "Toggle theme" }).click();

  await expect(html).toHaveClass(/\bdark\b/);
  const classesAfterUpdate = await page.evaluate(
    () =>
      (window as unknown as { classesAfterUpdate: string[] })
        .classesAfterUpdate,
  );
  expect(classesAfterUpdate).toHaveLength(1);
  expect(classesAfterUpdate[0]).toMatch(/\bdark\b/);
});

test("two theme clicks in the same frame end on the starting theme", async ({
  page,
}) => {
  // Counts the transitions' updates as they finish. The second click skips
  // the first cross-fade, and both updates still run.
  await page.addInitScript(() => {
    const start = document.startViewTransition.bind(document);
    Object.assign(window, { updatesDone: 0 });
    document.startViewTransition = (update) =>
      start(async () => {
        if (typeof update === "function") await update();
        (window as unknown as { updatesDone: number }).updatesDone += 1;
      });
  });
  const html = page.locator("html");
  await page.goto("/");
  await expect(html).toHaveClass(/\blight\b/);

  await page
    .getByRole("button", { name: "Toggle theme" })
    .evaluate((button: HTMLElement) => {
      button.click();
      button.click();
    });

  await page.waitForFunction(
    () => (window as unknown as { updatesDone: number }).updatesDone === 2,
  );
  await expect(html).toHaveClass(/\blight\b/);
  await expect(html).not.toHaveClass(/\bdark\b/);
});

test("a second theme click during the cross-fade switches the theme back", async ({
  page,
}) => {
  // Notes, for each press of the mouse, whether a transition was running, so
  // the test knows the second click landed inside one. From the start of a
  // transition to its end, the browser sends every click to <html>.
  await page.addInitScript(() => {
    const start = document.startViewTransition.bind(document);
    const seen = { running: 0, pressesWhileFading: [] as boolean[] };
    Object.assign(window, { seen });
    document.startViewTransition = (update) => {
      const transition = start(update);
      seen.running += 1;
      const end = () => (seen.running -= 1);
      transition.finished.then(end, end);
      return transition;
    };
    window.addEventListener(
      "pointerdown",
      () => seen.pressesWhileFading.push(seen.running > 0),
      { capture: true },
    );
  });
  const html = page.locator("html");
  await page.goto("/");
  await expect(html).toHaveClass(/\blight\b/);
  // A slower fade than the page's, so a loaded machine still presses inside
  // it. The page takes clicks the same way at any speed.
  await page.addStyleTag({
    content:
      "::view-transition-old(root), ::view-transition-new(root) { animation-duration: 1s !important; }",
  });

  // Real presses at the button's position, so they go through hit testing
  // the way a person's clicks do.
  const box = await page
    .getByRole("button", { name: "Toggle theme" })
    .boundingBox();
  if (!box) throw new Error("The theme toggle has no box.");
  const x = box.x + box.width / 2;
  const y = box.y + box.height / 2;
  await page.mouse.click(x, y);
  await page.waitForTimeout(75);
  await page.mouse.click(x, y);

  const presses = await page.evaluate(
    () =>
      (window as unknown as { seen: { pressesWhileFading: boolean[] } }).seen
        .pressesWhileFading,
  );
  expect(presses).toEqual([false, true]);
  await expect(html).toHaveClass(/\blight\b/);
  await expect(html).not.toHaveClass(/\bdark\b/);
});

test("inside the theme cross-fade, nothing runs a colour transition of its own", async ({
  page,
}) => {
  // Reads the page's animations once the cross-fade has started.
  await page.addInitScript(() => {
    const start = document.startViewTransition.bind(document);
    document.startViewTransition = (update) => {
      const transition = start(update);
      void transition.ready.then(() => {
        const animations = document.getAnimations();
        Object.assign(window, {
          crossFade: animations
            .filter((animation) =>
              (animation.effect as KeyframeEffect | null)?.pseudoElement?.match(
                /^::view-transition-(old|new)\(root\)$/,
              ),
            )
            .map((animation) => animation.effect?.getTiming().duration),
          ownTransitions: animations.filter(
            (animation) => animation instanceof CSSTransition,
          ).length,
        });
      });
      return transition;
    };
  });
  await page.goto("/");
  await expect(page.locator("html")).toHaveClass(/\blight\b/);

  await page.getByRole("button", { name: "Toggle theme" }).click();

  await page.waitForFunction(() => "crossFade" in window);
  const { crossFade, ownTransitions } = await page.evaluate(() => {
    const seen = window as unknown as {
      crossFade: number[];
      ownTransitions: number;
    };
    return { crossFade: seen.crossFade, ownTransitions: seen.ownTransitions };
  });
  // The cross-fade still runs, and the buttons do not animate inside it.
  expect(crossFade.length).toBeGreaterThan(0);
  expect(crossFade.every((duration) => duration === 200)).toBe(true);
  expect(ownTransitions).toBe(0);
});

test("an unknown address shows the not found page with a link home", async ({
  page,
  allowError,
}) => {
  // The browser logs the 404 response of the document itself.
  allowError("404");

  const response = await page.goto("/no-such-page");
  expect(response?.status()).toBe(404);
  await expect(page.getByText("Page not found")).toBeVisible();

  await page.getByRole("link", { name: "Back to the home page" }).click();
  await expect(page).toHaveURL("/");
  await expect(page.getByRole("list", { name: "Tasks" })).toBeVisible();
});
