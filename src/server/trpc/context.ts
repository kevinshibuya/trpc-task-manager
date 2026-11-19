import { getTaskRepository } from "@/server/tasks/task-store";
import { createTaskService } from "@/server/tasks/task-service";

import type { Context } from "./init";

/** The context of real requests: a service over the process's one store. */
export function createContext(): Context {
  return { taskService: createTaskService(getTaskRepository()) };
}
