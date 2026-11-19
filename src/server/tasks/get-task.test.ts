import { describe, expect, it } from "vitest";

import { TaskNotFoundError } from "./errors";
import { InMemoryTaskRepository } from "./in-memory-task-repository";
import type { Task } from "./task";
import { createTaskService } from "./task-service";

const stored: Task = {
  id: "id-1",
  title: "Water the plants",
  description: "The ferns too.",
  createdAt: new Date("2026-05-06T07:08:09.010Z"),
};

describe("getting a task by id", () => {
  it("returns the stored task", async () => {
    const service = createTaskService(new InMemoryTaskRepository([stored]));

    expect(await service.getById("id-1")).toEqual(stored);
  });

  it("raises the task not found error for an unknown id", async () => {
    const service = createTaskService(new InMemoryTaskRepository([stored]));

    await expect(service.getById("missing")).rejects.toBeInstanceOf(
      TaskNotFoundError,
    );
  });
});
