import { createTaskRepository } from "./sample-tasks";
import type { TaskRepository } from "./task-repository";

/*
 * The one repository of the process (ADR 0005). It lives on `globalThis`, not
 * in a module variable, for two reasons. Next.js bundles the API route and the
 * server-rendered pages separately, so each would otherwise load this module
 * and get its own store, and a task created through the API would never show
 * on the page. And in development, hot reload re-evaluates changed modules,
 * which would otherwise empty the store on every save.
 */
const globalStore = globalThis as typeof globalThis & {
  taskRepository?: TaskRepository;
};

export function getTaskRepository(): TaskRepository {
  globalStore.taskRepository ??= createTaskRepository(process.env);
  return globalStore.taskRepository;
}
