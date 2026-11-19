import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import superjson from "superjson";
import { describe, expect, it } from "vitest";

import { InMemoryTaskRepository } from "@/server/tasks/in-memory-task-repository";
import type { Task } from "@/server/tasks/task";
import type { TaskRepository } from "@/server/tasks/task-repository";
import { createTaskService } from "@/server/tasks/task-service";

import { appRouter } from "./app-router";
import { createCallerFactory, type Context } from "./init";
import {
  recordedInternalError,
  recordedValidationError,
} from "./recorded-errors";

const NOW = new Date("2026-05-06T07:08:09.010Z");

function contextWith(repository: TaskRepository): Context {
  return {
    taskService: createTaskService(repository, {
      clock: () => NOW,
      generateId: () => "generated-id",
    }),
  };
}

const createCaller = createCallerFactory(appRouter);

describe("task.create through the caller", () => {
  it("returns the created task, which the list then returns first", async () => {
    const older: Task = {
      id: "older",
      title: "Mop the hallway",
      createdAt: new Date("2026-01-01T00:00:00Z"),
    };
    const caller = createCaller(
      contextWith(new InMemoryTaskRepository([older])),
    );

    const created = await caller.task.create({
      title: " Descale the kettle ",
      description: "Vinegar works.",
    });
    const page = await caller.task.list({});

    expect(created).toEqual({
      id: "generated-id",
      title: "Descale the kettle",
      description: "Vinegar works.",
      createdAt: NOW,
    });
    expect(page.items.map((t) => t.id)).toEqual(["generated-id", "older"]);
  });

  it.each([
    ["a missing title", {}],
    ["a title that is too long", { title: "a".repeat(121) }],
  ])("rejects %s as a bad request", async (_, input) => {
    const caller = createCaller(contextWith(new InMemoryTaskRepository()));

    await expect(
      caller.task.create(input as { title: string }),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("ignores an id and a creation date sent by the caller", async () => {
    const repository = new InMemoryTaskRepository();
    const caller = createCaller(contextWith(repository));
    const input = {
      title: "Return the library books",
      id: "chosen-by-caller",
      createdAt: new Date("2000-01-01T00:00:00Z"),
    };

    await caller.task.create(input);

    expect(await repository.findById("chosen-by-caller")).toBeUndefined();
    expect(await repository.findById("generated-id")).toEqual({
      id: "generated-id",
      title: "Return the library books",
      createdAt: NOW,
    });
  });
});

describe("task.create through the fetch adapter", () => {
  // Sends a `Request` through the same handler the API route uses, with no
  // HTTP server, so the transformer and the error formatting run.
  async function post(repository: TaskRepository, input: unknown) {
    const response = await fetchRequestHandler({
      endpoint: "/api/trpc",
      req: new Request("http://localhost/api/trpc/task.create", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(superjson.serialize(input)),
      }),
      router: appRouter,
      createContext: () => contextWith(repository),
    });
    return { status: response.status, body: await response.json() };
  }

  it("reports a missing title with the validation messages grouped by field", async () => {
    const { status, body } = await post(new InMemoryTaskRepository(), {});

    expect(status).toBe(400);
    expect(body.error.json.data.fieldErrors.title).toEqual(["Enter a title."]);
    // The client error function is tested against this same shape.
    expect(body.error.json).toEqual(recordedValidationError);
  });

  it("reports an unexpected failure as an internal error with no detail", async () => {
    class FailingRepository extends InMemoryTaskRepository {
      override async add(): Promise<void> {
        throw new Error("disk full on tasks-db.internal");
      }
    }

    const { status, body } = await post(new FailingRepository(), {
      title: "Wash the windows",
    });

    expect(status).toBe(500);
    expect(JSON.stringify(body)).not.toContain("tasks-db.internal");
    expect(body.error.json).toEqual(recordedInternalError);
  });
});
