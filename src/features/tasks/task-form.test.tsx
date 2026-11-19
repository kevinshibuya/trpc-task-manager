import { TRPCClientError } from "@trpc/client";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import {
  recordedInternalError,
  recordedValidationError,
} from "@/server/trpc/recorded-errors";

import { TaskForm, type TaskFormValues } from "./task-form";

function renderForm(onSave: (values: TaskFormValues) => Promise<void>) {
  const user = userEvent.setup();
  render(<TaskForm submitLabel="Create task" onSave={onSave} />);
  return {
    user,
    form: screen.getByRole("form", { name: "Task" }),
    title: screen.getByRole("textbox", { name: "Title" }),
    description: screen.getByRole("textbox", { name: /Description/ }),
    submit: screen.getByRole("button", { name: /Create task/ }),
  };
}

describe("TaskForm", () => {
  it("shows the message next to an empty title, focuses it and sends nothing", async () => {
    const onSave = vi.fn();
    const { user, title, submit } = renderForm(onSave);

    await user.type(title, "   ");
    await user.click(submit);

    expect(await screen.findByText("Enter a title.")).toBeInTheDocument();
    expect(title).toHaveAttribute("aria-invalid", "true");
    expect(title).toHaveAccessibleDescription("Enter a title.");
    expect(title).toHaveFocus();
    expect(onSave).not.toHaveBeenCalled();
  });

  it("clears the message as soon as the title becomes valid", async () => {
    const { user, title, submit } = renderForm(vi.fn());

    await user.click(submit);
    await screen.findByText("Enter a title.");
    await user.type(title, "D");

    expect(screen.queryByText("Enter a title.")).not.toBeInTheDocument();
    expect(title).toHaveAttribute("aria-invalid", "false");
  });

  it("saves once, with trimmed values", async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    const { user, title, description, submit } = renderForm(onSave);

    await user.type(title, "  Buy groceries  ");
    await user.type(description, "  Rice and beans. ");
    await user.click(submit);

    expect(onSave).toHaveBeenCalledTimes(1);
    expect(onSave).toHaveBeenCalledWith({
      title: "Buy groceries",
      description: "Rice and beans.",
    });
  });

  it("disables the submit button while the save is pending", async () => {
    const { promise, resolve } = Promise.withResolvers<void>();
    const onSave = vi.fn(() => promise);
    const { user, title, submit } = renderForm(onSave);

    await user.type(title, "Dust the shelves");
    await user.click(submit);

    expect(submit).toBeDisabled();
    await user.click(submit);
    expect(onSave).toHaveBeenCalledTimes(1);

    resolve();
    await vi.waitFor(() => expect(submit).toBeEnabled());
  });

  it("shows the server's field messages on their fields and keeps the typed values", async () => {
    const onSave = vi.fn(() =>
      Promise.reject(TRPCClientError.from({ error: recordedValidationError })),
    );
    const { user, title, description, submit } = renderForm(onSave);

    await user.type(title, "Mop the hallway");
    await user.type(description, "Both floors.");
    await user.click(submit);

    await vi.waitFor(() =>
      expect(title).toHaveAccessibleDescription("Enter a title."),
    );
    expect(title).toHaveAttribute("aria-invalid", "true");
    expect(title).toHaveValue("Mop the hallway");
    expect(description).toHaveValue("Both floors.");
  });

  it("shows any other failure as an alert inside the form and keeps the typed values", async () => {
    const onSave = vi.fn(() =>
      Promise.reject(TRPCClientError.from({ error: recordedInternalError })),
    );
    const { user, form, title, submit } = renderForm(onSave);

    await user.type(title, "Wash the windows");
    await user.click(submit);

    const alert = await within(form).findByRole("alert");
    expect(alert).toHaveTextContent(
      "Something went wrong on the server. Please try again.",
    );
    expect(title).toHaveValue("Wash the windows");
  });

  it("starts with the values it is given", () => {
    render(
      <TaskForm
        submitLabel="Save changes"
        defaultValues={{ title: "Oil the hinge", description: "Kitchen door." }}
        onSave={vi.fn()}
      />,
    );

    expect(screen.getByRole("textbox", { name: "Title" })).toHaveValue(
      "Oil the hinge",
    );
    expect(screen.getByRole("textbox", { name: /Description/ })).toHaveValue(
      "Kitchen door.",
    );
  });

  it("offers a way back to the list without saving", () => {
    render(<TaskForm submitLabel="Create task" onSave={vi.fn()} />);

    expect(screen.getByRole("link", { name: "Cancel" })).toHaveAttribute(
      "href",
      "/",
    );
  });
});
