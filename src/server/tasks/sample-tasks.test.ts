import { describe, expect, it } from "vitest";

import { createTaskRepository } from "./sample-tasks";
import type { Task } from "./task";
import type { TaskRepository } from "./task-repository";
import { createTaskService } from "./task-service";

async function listAll(repository: TaskRepository): Promise<Task[]> {
  const service = createTaskService(repository);
  const tasks: Task[] = [];
  let cursor: string | null = null;
  do {
    const page = await service.list({ cursor, limit: 100 });
    tasks.push(...page.items);
    cursor = page.nextCursor;
  } while (cursor);
  return tasks;
}

describe("sample tasks", () => {
  it("fills the store with 50 tasks when the variable is unset", async () => {
    const repository = createTaskRepository({});

    expect(await listAll(repository)).toHaveLength(50);
  });

  it("fills the store with as many tasks as the variable says", async () => {
    const repository = createTaskRepository({ SAMPLE_TASK_COUNT: "7" });

    expect(await listAll(repository)).toHaveLength(7);
  });

  it("starts with an empty store when the variable is zero", async () => {
    const repository = createTaskRepository({ SAMPLE_TASK_COUNT: "0" });

    expect(await listAll(repository)).toEqual([]);
  });

  it.each(["-1", "many", "2.5"])(
    "refuses %j as the number of sample tasks",
    (value) => {
      expect(() => createTaskRepository({ SAMPLE_TASK_COUNT: value })).toThrow(
        /SAMPLE_TASK_COUNT/,
      );
    },
  );

  it("gives every sample task its own creation date, so the order is the same on every listing", async () => {
    const repository = createTaskRepository({});

    const first = await listAll(repository);
    const second = await listAll(repository);

    const dates = new Set(first.map((t) => t.createdAt.getTime()));
    expect(dates.size).toBe(first.length);
    expect(second.map((t) => t.id)).toEqual(first.map((t) => t.id));
  });

  it("gives every sample task a title and a creation date in the past", async () => {
    const before = Date.now();
    const tasks = await listAll(createTaskRepository({}));

    for (const task of tasks) {
      expect(task.title.trim()).not.toBe("");
      expect(task.createdAt.getTime()).toBeLessThanOrEqual(before);
    }
  });
});
