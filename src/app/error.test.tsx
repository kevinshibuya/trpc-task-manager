import { render, screen } from "@testing-library/react";
import { usePathname } from "next/navigation";
import { beforeEach, describe, expect, it, vi } from "vitest";

import ErrorPage from "./error";

vi.mock("next/navigation", () => ({
  usePathname: vi.fn(),
  useRouter: () => ({ refresh: vi.fn() }),
}));

function renderErrorPage() {
  render(<ErrorPage error={new Error("Network down")} reset={() => {}} />);
}

beforeEach(() => {
  vi.mocked(usePathname).mockReset();
});

describe("ErrorPage", () => {
  it("keeps the list's title row on the list page, so New task stays in reach", () => {
    vi.mocked(usePathname).mockReturnValue("/");

    renderErrorPage();

    expect(
      screen.getByRole("heading", { level: 1, name: "Tasks" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "New task" })).toHaveAttribute(
      "href",
      "/tasks/new",
    );
    expect(screen.getByRole("alert")).toBeInTheDocument();
  });

  it("shows no title row on another page, which has its own way back", () => {
    vi.mocked(usePathname).mockReturnValue("/tasks/abc/edit");

    renderErrorPage();

    expect(screen.queryByRole("heading", { level: 1 })).not.toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: "New task" }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole("alert")).toBeInTheDocument();
  });
});
