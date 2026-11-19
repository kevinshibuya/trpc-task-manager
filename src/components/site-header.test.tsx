import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ThemeProvider } from "next-themes";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { SiteHeader } from "./site-header";

// The header reads the current path to decide whether to offer a way back.
let pathname = "/";
vi.mock("next/navigation", () => ({ usePathname: () => pathname }));

/** Stubs matchMedia, which jsdom lacks, matching only the given queries. */
function stubMatchMedia(matching: string[] = []) {
  vi.stubGlobal(
    "matchMedia",
    vi.fn((query: string) => ({
      matches: matching.includes(query),
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  );
}

/**
 * Gives jsdom a `startViewTransition` that runs the update at once, and
 * records the theme class as it stands when the update returns: what the new
 * snapshot of the page would show.
 */
function stubViewTransitions() {
  const classesAfterUpdate: string[] = [];
  const startViewTransition = vi.fn((update: () => void) => {
    update();
    classesAfterUpdate.push(document.documentElement.className);
    return { ready: Promise.resolve(), finished: Promise.resolve() };
  });
  Object.defineProperty(document, "startViewTransition", {
    configurable: true,
    value: startViewTransition,
  });
  return { startViewTransition, classesAfterUpdate };
}

// next-themes reads matchMedia to follow the system theme.
beforeEach(() => {
  pathname = "/";
  stubMatchMedia();
  localStorage.clear();
  document.documentElement.className = "";
});

afterEach(() => {
  Reflect.deleteProperty(document, "startViewTransition");
});

/** Renders the header of a page other than the list, where it has the toggle. */
function renderLightHeader() {
  pathname = "/tasks/new";
  render(
    <ThemeProvider attribute="class" defaultTheme="light">
      <SiteHeader />
    </ThemeProvider>,
  );
  return screen.getByRole("button", { name: "Toggle theme" });
}

describe("SiteHeader", () => {
  it("is empty on the task list, whose title row has the theme toggle", () => {
    render(<SiteHeader />);

    expect(screen.getByRole("banner")).toBeEmptyDOMElement();
  });

  it("offers a way back to the task list on every other page", () => {
    pathname = "/tasks/new";
    render(<SiteHeader />);

    expect(screen.getByRole("link", { name: "Back to tasks" })).toHaveAttribute(
      "href",
      "/",
    );
    expect(
      screen.getByRole("button", { name: "Toggle theme" }),
    ).toBeInTheDocument();
  });

  it("switches between the light and the dark theme", async () => {
    const user = userEvent.setup();
    const toggle = renderLightHeader();

    await user.click(toggle);
    expect(document.documentElement).toHaveClass("dark");

    await user.click(toggle);
    expect(document.documentElement).toHaveClass("light");
  });

  it("switches the theme inside a view transition, so the new snapshot shows it", async () => {
    const { startViewTransition, classesAfterUpdate } = stubViewTransitions();
    const user = userEvent.setup();
    const toggle = renderLightHeader();

    await user.click(toggle);

    expect(startViewTransition).toHaveBeenCalledTimes(1);
    expect(classesAfterUpdate).toEqual(["dark"]);
  });

  it("switches at once, with no transition, for a person who prefers reduced motion", async () => {
    stubMatchMedia(["(prefers-reduced-motion: reduce)"]);
    const { startViewTransition } = stubViewTransitions();
    const user = userEvent.setup();
    const toggle = renderLightHeader();

    await user.click(toggle);

    expect(startViewTransition).not.toHaveBeenCalled();
    expect(document.documentElement).toHaveClass("dark");
  });
});
