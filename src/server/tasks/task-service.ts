import { decodeCursor, encodeCursor } from "./cursor";
import {
  DEFAULT_PAGE_SIZE,
  type ListTasksInput,
  type Task,
  type TaskInput,
  taskInput,
  type TaskPage,
} from "./task";
import type { TaskRepository } from "./task-repository";

export type TaskService = ReturnType<typeof createTaskService>;

/** What the service reads from the outside world, so tests can decide it. */
export type TaskServiceDependencies = {
  clock?: () => Date;
  generateId?: () => string;
};

export function createTaskService(
  repository: TaskRepository,
  {
    clock = () => new Date(),
    generateId = () => crypto.randomUUID(),
  }: TaskServiceDependencies = {},
) {
  return {
    /**
     * Stores a new task. The server sets its id and creation date; the same
     * keys in `input` are ignored. Throws a `ZodError` for invalid input.
     */
    async create(input: TaskInput): Promise<Task> {
      const { title, description } = taskInput.parse(input);
      const task: Task = {
        id: generateId(),
        title,
        ...(description !== undefined && { description }),
        createdAt: clock(),
      };
      await repository.add(task);
      return task;
    },

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
