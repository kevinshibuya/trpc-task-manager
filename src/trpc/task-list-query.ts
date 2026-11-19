import type { TaskPage } from "@/server/tasks/task";

// The server prefetch and the client query must build the same query key, so
// both take their arguments from here.

/** The first page, at the default page size. */
export const taskListInput = {};

export const getNextTaskListPage = (page: TaskPage) => page.nextCursor;
