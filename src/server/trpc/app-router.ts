import { router } from "./init";
import { taskRouter } from "./task-router";

export const appRouter = router({ task: taskRouter });

export type AppRouter = typeof appRouter;
