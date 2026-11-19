import { describe, expect, it } from "vitest";

import { InvalidCursorError } from "./errors";
import { InMemoryTaskRepository } from "./in-memory-task-repository";
import type { Task } from "./task";
import type { TaskRepository } from "./task-repository";
import { createTaskService } from "./task-service";

// Written against the repository interface, so a future implementation runs
// the same suite by adding one line at the bottom of this file.
function describeTaskList(name: string, makeRepository: () => TaskRepository) {
  describe(`listing tasks (${name})`, () => {
    const at = (iso: string) => new Date(iso);
    const task = (id: string, createdAt: string): Task => ({
      id,
      title: `Task ${id}`,
      createdAt: at(createdAt),
    });

    async function setup(tasks: Task[]) {
      const repository = makeRepository();
      for (const t of tasks) await repository.add(t);
      return { repository, service: createTaskService(repository) };
    }

    // Stores `count` tasks one minute apart, the first one the oldest.
    function manyTasks(count: number): Task[] {
      return Array.from({ length: count }, (_, i) => ({
        id: `id-${String(i).padStart(3, "0")}`,
        title: `Task ${i}`,
        createdAt: new Date(Date.UTC(2026, 0, 1, 0, i)),
      }));
    }

    async function listAll(service: ReturnType<typeof createTaskService>) {
      const ids: string[] = [];
      let cursor: string | undefined;
      do {
        const page = await service.list({ cursor, limit: 7 });
        ids.push(...page.items.map((t) => t.id));
        cursor = page.nextCursor ?? undefined;
      } while (cursor);
      return ids;
    }

    it("lists tasks newest first", async () => {
      const { service } = await setup([
        task("a", "2026-01-01T10:00:00Z"),
        task("c", "2026-01-03T10:00:00Z"),
        task("b", "2026-01-02T10:00:00Z"),
      ]);

      const page = await service.list({});

      expect(page.items.map((t) => t.id)).toEqual(["c", "b", "a"]);
    });

    it("orders tasks with the same creation date by id, the same way on every call", async () => {
      const { service } = await setup([
        task("id-1", "2026-01-01T10:00:00Z"),
        task("id-3", "2026-01-01T10:00:00Z"),
        task("id-2", "2026-01-01T10:00:00Z"),
        task("id-0", "2026-01-02T10:00:00Z"),
      ]);

      const first = await service.list({});
      const second = await service.list({});

      expect(first.items.map((t) => t.id)).toEqual([
        "id-0",
        "id-3",
        "id-2",
        "id-1",
      ]);
      expect(second.items).toEqual(first.items);
    });

    it("keeps ties in order across pages", async () => {
      const { service } = await setup([
        task("id-1", "2026-01-01T10:00:00Z"),
        task("id-2", "2026-01-01T10:00:00Z"),
        task("id-3", "2026-01-01T10:00:00Z"),
      ]);

      const first = await service.list({ limit: 2 });
      const second = await service.list({
        cursor: first.nextCursor ?? undefined,
        limit: 2,
      });

      expect(first.items.map((t) => t.id)).toEqual(["id-3", "id-2"]);
      expect(second.items.map((t) => t.id)).toEqual(["id-1"]);
    });

    it("returns 20 tasks by default and respects a limit", async () => {
      const { service } = await setup(manyTasks(30));

      expect((await service.list({})).items).toHaveLength(20);
      expect((await service.list({ limit: 5 })).items).toHaveLength(5);
    });

    it("gives the last page no next cursor", async () => {
      const { service } = await setup(manyTasks(5));

      const first = await service.list({ limit: 3 });
      const last = await service.list({
        cursor: first.nextCursor ?? undefined,
        limit: 3,
      });

      expect(first.nextCursor).toEqual(expect.any(String));
      expect(last.items).toHaveLength(2);
      expect(last.nextCursor).toBeNull();
    });

    it("gives a page that ends exactly at the last task no next cursor", async () => {
      const { service } = await setup(manyTasks(3));

      const page = await service.list({ limit: 3 });

      expect(page.items).toHaveLength(3);
      expect(page.nextCursor).toBeNull();
    });

    it("returns an empty page with no cursor for an empty store", async () => {
      const { service } = await setup([]);

      expect(await service.list({})).toEqual({ items: [], nextCursor: null });
    });

    it("returns every task exactly once when following the cursors", async () => {
      const tasks = manyTasks(23);
      const { service } = await setup(tasks);

      const ids = await listAll(service);

      expect(ids).toEqual(tasks.map((t) => t.id).reverse());
    });

    it("does not repeat a task on the next page when one is stored in between", async () => {
      const { repository, service } = await setup(manyTasks(10));

      const first = await service.list({ limit: 4 });
      await repository.add(task("new", "2026-02-01T00:00:00Z"));
      const second = await service.list({
        cursor: first.nextCursor ?? undefined,
        limit: 4,
      });

      expect(first.items.map((t) => t.id)).toEqual([
        "id-009",
        "id-008",
        "id-007",
        "id-006",
      ]);
      expect(second.items.map((t) => t.id)).toEqual([
        "id-005",
        "id-004",
        "id-003",
        "id-002",
      ]);
    });

    it("does not skip a task on the next page when one is removed in between", async () => {
      const { repository, service } = await setup(manyTasks(10));

      const first = await service.list({ limit: 4 });
      await repository.remove("id-008");
      const second = await service.list({
        cursor: first.nextCursor ?? undefined,
        limit: 4,
      });

      expect(second.items.map((t) => t.id)).toEqual([
        "id-005",
        "id-004",
        "id-003",
        "id-002",
      ]);
    });

    it("also continues after the last task of a page when that task is removed", async () => {
      const { repository, service } = await setup(manyTasks(10));

      const first = await service.list({ limit: 4 });
      await repository.remove("id-006");
      const second = await service.list({
        cursor: first.nextCursor ?? undefined,
        limit: 4,
      });

      expect(second.items.map((t) => t.id)).toEqual([
        "id-005",
        "id-004",
        "id-003",
        "id-002",
      ]);
    });

    it.each(["not-a-cursor", "", "MTIzNDU", "eHl6OmFiYw"])(
      "rejects the malformed cursor %j as invalid input",
      async (cursor) => {
        const { service } = await setup(manyTasks(3));

        await expect(service.list({ cursor })).rejects.toBeInstanceOf(
          InvalidCursorError,
        );
      },
    );
  });
}

describeTaskList("in memory", () => new InMemoryTaskRepository());
