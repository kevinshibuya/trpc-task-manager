import { describe, expect, it } from "vitest";

import { InMemoryTaskRepository } from "@/server/tasks/in-memory-task-repository";
import type { Task } from "@/server/tasks/task";
import type { TaskRepository } from "@/server/tasks/task-repository";
import { createTaskService } from "@/server/tasks/task-service";

import { appRouter } from "./app-router";
import { createCallerFactory, type Context } from "./init";

const stored: Task = {
  id: "id-1",
  title: "Oil the hinge",
  createdAt: new Date("2026-05-06T07:08:09.010Z"),
};

function contextWith(repository: TaskRepository): Context {
  return { taskService: createTaskService(repository) };
}

const createCaller = createCallerFactory(appRouter);

describe("task.delete through the caller", () => {
  it("removes the task, and getById then answers not found", async () => {
    const caller = createCaller(
      contextWith(new InMemoryTaskRepository([stored])),
    );

    await caller.task.delete({ id: "id-1" });

    await expect(caller.task.getById({ id: "id-1" })).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
  });

  it("rejects delete on an unknown id as not found", async () => {
    const caller = createCaller(contextWith(new InMemoryTaskRepository()));

    await expect(caller.task.delete({ id: "missing" })).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
  });
});
