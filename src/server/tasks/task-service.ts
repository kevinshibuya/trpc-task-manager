import { decodeCursor, encodeCursor } from "./cursor";
import { TaskNotFoundError } from "./errors";
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

    /** The task with this id. Throws `TaskNotFoundError`. */
    async getById(id: string): Promise<Task> {
      const task = await repository.findById(id);
      if (!task) throw new TaskNotFoundError();
      return task;
    },

    /**
     * Replaces the title and the description together, under the rules of
     * `create`: leaving the description out clears it. The id and the creation
     * date never change. Throws a `ZodError` for invalid input and
     * `TaskNotFoundError` for an unknown id.
     */
    async update(id: string, input: TaskInput): Promise<Task> {
      const { title, description } = taskInput.parse(input);
      const current = await repository.findById(id);
      if (!current) throw new TaskNotFoundError();
      const task: Task = {
        id: current.id,
        title,
        ...(description !== undefined && { description }),
        createdAt: current.createdAt,
      };
      if (!(await repository.replace(task))) throw new TaskNotFoundError();
      return task;
    },

    /** Removes the task with this id. Throws `TaskNotFoundError`. */
    async delete(id: string): Promise<void> {
      if (!(await repository.remove(id))) throw new TaskNotFoundError();
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
