import { listTasksInput } from "@/server/tasks/task";

import { publicProcedure, router } from "./init";

export const taskRouter = router({
  list: publicProcedure
    .input(listTasksInput)
    .query(({ ctx, input }) => ctx.taskService.list(input)),
});
