import { dehydrate, HydrationBoundary } from "@tanstack/react-query";

import { TaskList } from "@/components/task-list";
import { getQueryClient, trpc } from "@/trpc/server";
import { getNextTaskListPage, taskListInput } from "@/trpc/task-list-query";

// This page reads nothing from the request, so without this line Next.js 15
// would prerender it at build time, while the in-memory store is fresh, and
// serve that HTML forever: static generation, not SSR (ADR 0004). Forcing
// dynamic rendering renders it on every request, and the response carries
// `Cache-Control: no-store`.
export const dynamic = "force-dynamic";

export default async function TaskListPage() {
  const queryClient = getQueryClient();
  // `fetchInfiniteQuery` throws when the call fails, unlike
  // `prefetchInfiniteQuery`, so a failure reaches the error screen instead of
  // leaving the browser to retry with nothing on screen.
  await queryClient.fetchInfiniteQuery(
    trpc.task.list.infiniteQueryOptions(taskListInput, {
      getNextPageParam: getNextTaskListPage,
    }),
  );

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <TaskList />
    </HydrationBoundary>
  );
}
