import type { Task } from "./task";
import type { TaskPosition, TaskRepository } from "./task-repository";

/**
 * The list order: newest first, and for the same creation date the greater
 * id first. Negative when `a` comes before `b`. A page starts after a position
 * by this same comparison, so ties never split or repeat across pages.
 */
function compareNewestFirst(a: TaskPosition, b: TaskPosition): number {
  const byDate = b.createdAt.getTime() - a.createdAt.getTime();
  if (byDate !== 0) return byDate;
  return a.id < b.id ? 1 : a.id > b.id ? -1 : 0;
}

export class InMemoryTaskRepository implements TaskRepository {
  private readonly tasks = new Map<string, Task>();

  constructor(initialTasks: Task[] = []) {
    for (const task of initialTasks) this.tasks.set(task.id, { ...task });
  }

  async add(task: Task) {
    this.tasks.set(task.id, { ...task });
  }

  async findById(id: string) {
    const task = this.tasks.get(id);
    return task && { ...task };
  }

  async listPage({ after, limit }: { after?: TaskPosition; limit: number }) {
    return [...this.tasks.values()]
      .filter((task) => !after || compareNewestFirst(task, after) > 0)
      .sort(compareNewestFirst)
      .slice(0, limit)
      .map((task) => ({ ...task }));
  }

  async replace(task: Task) {
    if (!this.tasks.has(task.id)) return false;
    this.tasks.set(task.id, { ...task });
    return true;
  }

  async remove(id: string) {
    return this.tasks.delete(id);
  }
}
