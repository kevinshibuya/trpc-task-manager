import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ThemeProvider } from "next-themes";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { SiteHeader } from "./site-header";

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
    return { ready: Promise.resolve() };
  });
  Object.defineProperty(document, "startViewTransition", {
    configurable: true,
    value: startViewTransition,
  });
  return { startViewTransition, classesAfterUpdate };
}

// next-themes reads matchMedia to follow the system theme.
beforeEach(() => {
  stubMatchMedia();
  localStorage.clear();
  document.documentElement.className = "";
});

afterEach(() => {
  Reflect.deleteProperty(document, "startViewTransition");
});

function renderLightHeader() {
  render(
    <ThemeProvider attribute="class" defaultTheme="light">
      <SiteHeader />
    </ThemeProvider>,
  );
  return screen.getByRole("button", { name: "Toggle theme" });
}

describe("SiteHeader", () => {
  it("shows the application name, a New task action and a theme toggle", () => {
    render(<SiteHeader />);

    expect(screen.getByRole("link", { name: "Task manager" })).toHaveAttribute(
      "href",
      "/",
    );
    expect(screen.getByRole("link", { name: "New task" })).toHaveAttribute(
      "href",
      "/tasks/new",
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
