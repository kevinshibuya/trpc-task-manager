import { TRPCError } from "@trpc/server";
import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import superjson from "superjson";
import { describe, expect, it } from "vitest";

import { InMemoryTaskRepository } from "@/server/tasks/in-memory-task-repository";
import type { Task } from "@/server/tasks/task";
import type { TaskRepository } from "@/server/tasks/task-repository";
import { createTaskService } from "@/server/tasks/task-service";

import { appRouter } from "./app-router";
import { createCallerFactory, type Context } from "./init";

function contextWith(repository: TaskRepository): Context {
  return { taskService: createTaskService(repository) };
}

function tasks(count: number): Task[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `id-${String(i).padStart(3, "0")}`,
    title: `Task ${i}`,
    createdAt: new Date(Date.UTC(2026, 0, 1, 0, i)),
  }));
}

const createCaller = createCallerFactory(appRouter);

describe("task.list through the caller", () => {
  it("returns the first page and a cursor that leads to the next page", async () => {
    const caller = createCaller(
      contextWith(new InMemoryTaskRepository(tasks(25))),
    );

    const first = await caller.task.list({});
    const second = await caller.task.list({ cursor: first.nextCursor });

    expect(first.items).toHaveLength(20);
    expect(first.items[0].id).toBe("id-024");
    expect(second.items.map((t) => t.id)).toEqual([
      "id-004",
      "id-003",
      "id-002",
      "id-001",
      "id-000",
    ]);
    expect(second.nextCursor).toBeNull();
  });

  it.each([0, 101])("rejects a limit of %i as a bad request", async (limit) => {
    const caller = createCaller(contextWith(new InMemoryTaskRepository()));

    await expect(caller.task.list({ limit })).rejects.toMatchObject({
      code: "BAD_REQUEST",
    });
  });

  it("rejects a malformed cursor as a bad request, not an internal error", async () => {
    const caller = createCaller(contextWith(new InMemoryTaskRepository()));

    const error = await caller.task
      .list({ cursor: "not-a-cursor" })
      .catch((e: unknown) => e);

    expect(error).toBeInstanceOf(TRPCError);
    expect(error).toMatchObject({ code: "BAD_REQUEST" });
  });
});

describe("task.list through the fetch adapter", () => {
  // Sends a `Request` through the same handler the API route uses, with no
  // HTTP server, so the transformer and the error formatting run.
  async function get(repository: TaskRepository, input: unknown) {
    const query = encodeURIComponent(
      JSON.stringify(superjson.serialize(input)),
    );
    const response = await fetchRequestHandler({
      endpoint: "/api/trpc",
      req: new Request(`http://localhost/api/trpc/task.list?input=${query}`),
      router: appRouter,
      createContext: () => contextWith(repository),
    });
    return { status: response.status, text: await response.text() };
  }

  it("sends the creation date in the transformer's form, which decodes to a Date", async () => {
    const createdAt = new Date("2026-03-04T05:06:07.089Z");
    const repository = new InMemoryTaskRepository([
      { id: "id-1", title: "Water the plants", createdAt },
    ]);

    const { status, text } = await get(repository, {});
    const body = JSON.parse(text);

    expect(status).toBe(200);
    expect(body.result.data.json.items[0].createdAt).toBe(
      "2026-03-04T05:06:07.089Z",
    );
    expect(body.result.data.meta.values).toEqual({
      "items.0.createdAt": ["Date"],
    });
    const decoded = superjson.deserialize<{ items: Task[] }>(body.result.data);
    expect(decoded.items[0].createdAt).toBeInstanceOf(Date);
    expect(decoded.items[0].createdAt).toEqual(createdAt);
  });

  it("reports an unexpected failure as an internal error with no internal detail", async () => {
    class FailingRepository extends InMemoryTaskRepository {
      override async listPage(): Promise<Task[]> {
        throw new Error("connection to tasks-db.internal:5432 refused");
      }
    }

    const { status, text } = await get(new FailingRepository(), {});
    const body = JSON.parse(text);

    expect(status).toBe(500);
    expect(body.error.json.data.code).toBe("INTERNAL_SERVER_ERROR");
    expect(body.error.json.message).toBe(
      "Something went wrong on the server. Please try again.",
    );
    expect(text).not.toContain("tasks-db.internal");
    expect(text).not.toContain("task-service");
  });
});
