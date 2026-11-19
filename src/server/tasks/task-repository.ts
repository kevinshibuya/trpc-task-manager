import type { Task } from "./task";

/** Where a page starts: right after the task with this creation date and id. */
export type TaskPosition = Pick<Task, "createdAt" | "id">;

/**
 * Storage for tasks. Memory today; a database would be one more class that
 * implements this interface (ADR 0003). Every method is async so that such a
 * class fits without changing the callers.
 */
export interface TaskRepository {
  add(task: Task): Promise<void>;
  findById(id: string): Promise<Task | undefined>;
  /**
   * Up to `limit` tasks, newest first, the id breaking ties. With `after`,
   * only the tasks that come after that position in the same order, whether or
   * not the task at that position still exists.
   */
  listPage(options: { after?: TaskPosition; limit: number }): Promise<Task[]>;
  /** Returns false when no task has that id. */
  replace(task: Task): Promise<boolean>;
  /** Returns false when no task has that id. */
  remove(id: string): Promise<boolean>;
}
