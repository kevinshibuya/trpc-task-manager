import { listTasksInput, taskInput } from "@/server/tasks/task";

import { publicProcedure, router } from "./init";

export const taskRouter = router({
  create: publicProcedure
    .input(taskInput)
    .mutation(({ ctx, input }) => ctx.taskService.create(input)),

  list: publicProcedure
    .input(listTasksInput)
    .query(({ ctx, input }) => ctx.taskService.list(input)),
});
