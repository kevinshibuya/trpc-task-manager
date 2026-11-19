import {
  listTasksInput,
  taskIdInput,
  taskInput,
  updateTaskInput,
} from "@/server/tasks/task";

import { publicProcedure, router } from "./init";

export const taskRouter = router({
  create: publicProcedure
    .input(taskInput)
    .mutation(({ ctx, input }) => ctx.taskService.create(input)),

  list: publicProcedure
    .input(listTasksInput)
    .query(({ ctx, input }) => ctx.taskService.list(input)),

  getById: publicProcedure
    .input(taskIdInput)
    .query(({ ctx, input }) => ctx.taskService.getById(input.id)),

  update: publicProcedure
    .input(updateTaskInput)
    .mutation(({ ctx, input: { id, ...fields } }) =>
      ctx.taskService.update(id, fields),
    ),
});
