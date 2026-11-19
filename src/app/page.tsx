import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { cn } from "cn";
import { InboxIcon, PlusIcon } from "lucide-react";
import Link from "next/link";

import { TaskList } from "@/components/task-list";
import { buttonVariants } from "@/components/ui/button";
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
    <div className="flex flex-1 flex-col gap-7">
      <div className="flex items-center justify-between gap-4">
        <h1 className="flex items-center gap-2.5 text-2xl font-bold tracking-tight">
          <InboxIcon className="size-5.5 text-primary" aria-hidden />
          Tasks
        </h1>
        <Link
          href="/tasks/new"
          className={cn(buttonVariants({ size: "icon" }), "rounded-full")}
        >
          <PlusIcon aria-hidden />
          <span className="sr-only">New task</span>
        </Link>
      </div>
      <HydrationBoundary state={dehydrate(queryClient)}>
        <TaskList />
      </HydrationBoundary>
    </div>
  );
}
