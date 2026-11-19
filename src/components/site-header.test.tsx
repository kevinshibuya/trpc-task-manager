import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ThemeProvider } from "next-themes";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { SiteHeader } from "./site-header";

// jsdom has no matchMedia, which next-themes reads to follow the system theme.
beforeEach(() => {
  vi.stubGlobal(
    "matchMedia",
    vi.fn((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  );
  localStorage.clear();
  document.documentElement.className = "";
});

describe("SiteHeader", () => {
  it("shows the application name and a theme toggle", () => {
    render(<SiteHeader />);

    expect(screen.getByRole("link", { name: "Task manager" })).toHaveAttribute(
      "href",
      "/",
    );
    expect(
      screen.getByRole("button", { name: "Toggle theme" }),
    ).toBeInTheDocument();
  });

  it("switches between the light and the dark theme", async () => {
    const user = userEvent.setup();
    render(
      <ThemeProvider attribute="class" defaultTheme="light">
        <SiteHeader />
      </ThemeProvider>,
    );
    const toggle = screen.getByRole("button", { name: "Toggle theme" });

    await user.click(toggle);
    expect(document.documentElement).toHaveClass("dark");

    await user.click(toggle);
    expect(document.documentElement).toHaveClass("light");
  });
});
