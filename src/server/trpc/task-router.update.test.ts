import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import superjson from "superjson";
import { describe, expect, it } from "vitest";

import { InMemoryTaskRepository } from "@/server/tasks/in-memory-task-repository";
import type { Task } from "@/server/tasks/task";
import type { TaskRepository } from "@/server/tasks/task-repository";
import { createTaskService } from "@/server/tasks/task-service";

import { appRouter } from "./app-router";
import { createCallerFactory, type Context } from "./init";
import { recordedNotFoundError } from "./recorded-errors";

const stored: Task = {
  id: "id-1",
  title: "Oil the hinge",
  description: "Kitchen door.",
  createdAt: new Date("2026-05-06T07:08:09.010Z"),
};

function contextWith(repository: TaskRepository): Context {
  return { taskService: createTaskService(repository) };
}

const createCaller = createCallerFactory(appRouter);

describe("task.getById and task.update through the caller", () => {
  it("returns a stored task, and the updated task, which getById then returns", async () => {
    const caller = createCaller(
      contextWith(new InMemoryTaskRepository([stored])),
    );

    expect(await caller.task.getById({ id: "id-1" })).toEqual(stored);

    const updated = await caller.task.update({
      id: "id-1",
      title: " Oil both hinges ",
    });

    expect(updated).toEqual({
      id: "id-1",
      title: "Oil both hinges",
      createdAt: stored.createdAt,
    });
    expect(await caller.task.getById({ id: "id-1" })).toEqual(updated);
  });

  it("rejects getById on an unknown id as not found", async () => {
    const caller = createCaller(contextWith(new InMemoryTaskRepository()));

    await expect(caller.task.getById({ id: "missing" })).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
  });

  it("rejects update on an unknown id as not found", async () => {
    const caller = createCaller(contextWith(new InMemoryTaskRepository()));

    await expect(
      caller.task.update({ id: "missing", title: "Oil the hinge" }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("rejects update with an invalid title as a bad request", async () => {
    const caller = createCaller(
      contextWith(new InMemoryTaskRepository([stored])),
    );

    await expect(
      caller.task.update({ id: "id-1", title: "   " }),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });
});

describe("task.update through the fetch adapter", () => {
  // Sends a `Request` through the same handler the API route uses, with no
  // HTTP server, so the transformer and the error formatting run.
  async function post(repository: TaskRepository, input: unknown) {
    const response = await fetchRequestHandler({
      endpoint: "/api/trpc",
      req: new Request("http://localhost/api/trpc/task.update", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(superjson.serialize(input)),
      }),
      router: appRouter,
      createContext: () => contextWith(repository),
    });
    return { status: response.status, body: await response.json() };
  }

  it("reports an unknown id as not found, with a message that says a task was not found", async () => {
    const { status, body } = await post(new InMemoryTaskRepository(), {
      id: "missing",
      title: "Oil the hinge",
    });

    expect(status).toBe(404);
    expect(body.error.json.message).toMatch(/task was not found/i);
    // The client error function and the form are tested against this shape.
    expect(body.error.json).toEqual(recordedNotFoundError);
  });
});
