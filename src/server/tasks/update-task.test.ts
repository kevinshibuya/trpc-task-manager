import { describe, expect, it } from "vitest";

import { TaskNotFoundError } from "./errors";
import { InMemoryTaskRepository } from "./in-memory-task-repository";
import type { Task } from "./task";
import { createTaskService } from "./task-service";

const newer: Task = {
  id: "id-newer",
  title: "Water the plants",
  description: "The ferns too.",
  createdAt: new Date("2026-05-06T07:08:09.010Z"),
};
const middle: Task = {
  id: "id-middle",
  title: "Sweep the balcony",
  createdAt: new Date("2026-05-05T07:08:09.010Z"),
};
const older: Task = {
  id: "id-older",
  title: "Descale the kettle",
  createdAt: new Date("2026-05-04T07:08:09.010Z"),
};

function setup() {
  const repository = new InMemoryTaskRepository([newer, middle, older]);
  const service = createTaskService(repository, {
    clock: () => new Date("2027-01-01T00:00:00Z"),
    generateId: () => "never-used",
  });
  return { repository, service };
}

describe("updating a task", () => {
  it("replaces the title and the description and returns the updated task", async () => {
    const { repository, service } = setup();

    const updated = await service.update("id-middle", {
      title: "Sweep the terrace",
      description: "And the stairs.",
    });

    expect(updated).toEqual({
      id: "id-middle",
      title: "Sweep the terrace",
      description: "And the stairs.",
      createdAt: middle.createdAt,
    });
    expect(await repository.findById("id-middle")).toEqual(updated);
  });

  it("keeps the id, the creation date and the task's position in the list", async () => {
    const { service } = setup();
    const input = {
      title: "Sweep the terrace",
      id: "chosen-by-caller",
      createdAt: new Date("2000-01-01T00:00:00Z"),
    };

    const updated = await service.update("id-middle", input);
    const page = await service.list({});

    expect(updated.id).toBe("id-middle");
    expect(updated.createdAt).toEqual(middle.createdAt);
    expect(page.items.map((task) => task.id)).toEqual([
      "id-newer",
      "id-middle",
      "id-older",
    ]);
  });

  it("clears a description that was set when the description is left out", async () => {
    const { repository, service } = setup();

    const updated = await service.update("id-newer", {
      title: "Water the plants",
    });

    expect(updated).not.toHaveProperty("description");
    expect(await repository.findById("id-newer")).not.toHaveProperty(
      "description",
    );
  });

  it("trims the title and the description", async () => {
    const { service } = setup();

    const updated = await service.update("id-older", {
      title: "  Descale the kettle \n",
      description: "\t With vinegar.  ",
    });

    expect(updated.title).toBe("Descale the kettle");
    expect(updated.description).toBe("With vinegar.");
  });

  it.each([
    ["an empty title", ""],
    ["a title of 121 characters", "a".repeat(121)],
  ])("rejects %s and keeps the task as it was", async (_, title) => {
    const { repository, service } = setup();

    await expect(service.update("id-newer", { title })).rejects.toThrow();
    expect(await repository.findById("id-newer")).toEqual(newer);
  });

  it("raises the task not found error for an unknown id and stores nothing", async () => {
    const { repository, service } = setup();

    await expect(
      service.update("missing", { title: "Oil the hinge" }),
    ).rejects.toBeInstanceOf(TaskNotFoundError);
    expect(await repository.findById("missing")).toBeUndefined();
    expect(await repository.listPage({ limit: 10 })).toEqual([
      newer,
      middle,
      older,
    ]);
  });
});
