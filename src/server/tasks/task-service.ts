import { decodeCursor, encodeCursor } from "./cursor";
import { DEFAULT_PAGE_SIZE, type ListTasksInput, type TaskPage } from "./task";
import type { TaskRepository } from "./task-repository";

export type TaskService = ReturnType<typeof createTaskService>;

export function createTaskService(repository: TaskRepository) {
  return {
    /** One page of tasks, newest first. Throws `InvalidCursorError`. */
    async list({
      cursor,
      limit = DEFAULT_PAGE_SIZE,
    }: ListTasksInput): Promise<TaskPage> {
      const after = cursor == null ? undefined : decodeCursor(cursor);
      // One task more than the page shows, to know whether a next page exists.
      const tasks = await repository.listPage({ after, limit: limit + 1 });
      const items = tasks.slice(0, limit);
      const last = items.at(-1);
      return {
        items,
        nextCursor: tasks.length > limit && last ? encodeCursor(last) : null,
      };
    },
  };
}
