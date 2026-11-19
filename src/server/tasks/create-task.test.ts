import { describe, expect, it } from "vitest";

import { InMemoryTaskRepository } from "./in-memory-task-repository";
import { createTaskService } from "./task-service";

const NOW = new Date("2026-05-06T07:08:09.010Z");

function setup() {
  const repository = new InMemoryTaskRepository();
  let next = 0;
  const service = createTaskService(repository, {
    clock: () => NOW,
    generateId: () => `id-${++next}`,
  });
  return { repository, service };
}

describe("creating a task", () => {
  it("stores the task and returns it with the generated id and the clock's date", async () => {
    const { repository, service } = setup();

    const created = await service.create({ title: "Water the plants" });

    expect(created).toEqual({
      id: "id-1",
      title: "Water the plants",
      createdAt: NOW,
    });
    expect(await repository.findById("id-1")).toEqual(created);
  });

  it("removes surrounding whitespace from the title and the description", async () => {
    const { service } = setup();

    const created = await service.create({
      title: "  Buy groceries \n",
      description: "\t Rice and beans.  ",
    });

    expect(created.title).toBe("Buy groceries");
    expect(created.description).toBe("Rice and beans.");
  });

  it.each(["", "   \t\n"])("rejects the title %j", async (title) => {
    const { repository, service } = setup();

    await expect(service.create({ title })).rejects.toThrow();
    expect(await repository.listPage({ limit: 10 })).toEqual([]);
  });

  it("accepts a title of 120 characters and rejects one of 121", async () => {
    const { service } = setup();

    await expect(service.create({ title: "a".repeat(120) })).resolves.toEqual(
      expect.objectContaining({ title: "a".repeat(120) }),
    );
    await expect(service.create({ title: "a".repeat(121) })).rejects.toThrow();
  });

  it("rejects a description of 2001 characters", async () => {
    const { service } = setup();

    await expect(
      service.create({ title: "Dust", description: "a".repeat(2001) }),
    ).rejects.toThrow();
  });

  it.each(["", "  \n "])(
    "stores the description %j as absent",
    async (description) => {
      const { repository, service } = setup();

      const created = await service.create({ title: "Dust", description });

      expect(created).not.toHaveProperty("description");
      expect(await repository.findById(created.id)).not.toHaveProperty(
        "description",
      );
    },
  );

  it("lets two tasks have the same title", async () => {
    const { repository, service } = setup();

    const first = await service.create({ title: "Sweep the balcony" });
    const second = await service.create({ title: "Sweep the balcony" });

    expect(first.id).not.toBe(second.id);
    expect(await repository.listPage({ limit: 10 })).toHaveLength(2);
  });

  it("ignores an id and a creation date sent by the caller", async () => {
    const { service } = setup();
    const input = {
      title: "Test the smoke alarm",
      id: "chosen-by-caller",
      createdAt: new Date("2000-01-01T00:00:00Z"),
    };

    const created = await service.create(input);

    expect(created.id).toBe("id-1");
    expect(created.createdAt).toEqual(NOW);
  });
});
