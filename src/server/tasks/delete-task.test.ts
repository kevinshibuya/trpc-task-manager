import { describe, expect, it } from "vitest";

import { TaskNotFoundError } from "./errors";
import { InMemoryTaskRepository } from "./in-memory-task-repository";
import type { Task } from "./task";
import { createTaskService } from "./task-service";

const newer: Task = {
  id: "id-newer",
  title: "Water the plants",
  createdAt: new Date("2026-05-06T07:08:09.010Z"),
};
const middle: Task = {
  id: "id-middle",
  title: "Sweep the balcony",
  description: "And the stairs.",
  createdAt: new Date("2026-05-05T07:08:09.010Z"),
};
const older: Task = {
  id: "id-older",
  title: "Descale the kettle",
  createdAt: new Date("2026-05-04T07:08:09.010Z"),
};

function setup(tasks: Task[] = [newer, middle, older]) {
  const repository = new InMemoryTaskRepository(tasks);
  return { repository, service: createTaskService(repository) };
}

describe("deleting a task", () => {
  it("removes a stored task from the list, and getting it afterwards raises the task not found error", async () => {
    const { service } = setup();

    await service.delete("id-middle");

    const page = await service.list({});
    expect(page.items.map((task) => task.id)).toEqual(["id-newer", "id-older"]);
    await expect(service.getById("id-middle")).rejects.toBeInstanceOf(
      TaskNotFoundError,
    );
  });

  it("raises the task not found error for an unknown id and removes nothing", async () => {
    const { service } = setup();

    await expect(service.delete("missing")).rejects.toBeInstanceOf(
      TaskNotFoundError,
    );
    expect((await service.list({})).items).toEqual([newer, middle, older]);
  });

  it("does not make the next page skip or repeat a task when one is deleted between two pages", async () => {
    // Ten tasks one minute apart, id-000 the oldest.
    const tasks = Array.from({ length: 10 }, (_, i) => ({
      id: `id-${String(i).padStart(3, "0")}`,
      title: `Task ${i}`,
      createdAt: new Date(Date.UTC(2026, 0, 1, 0, i)),
    }));
    const { service } = setup(tasks);

    const first = await service.list({ limit: 4 });
    await service.delete("id-008");
    const second = await service.list({
      cursor: first.nextCursor ?? undefined,
      limit: 4,
    });

    expect(first.items.map((task) => task.id)).toEqual([
      "id-009",
      "id-008",
      "id-007",
      "id-006",
    ]);
    expect(second.items.map((task) => task.id)).toEqual([
      "id-005",
      "id-004",
      "id-003",
      "id-002",
    ]);
  });
});
