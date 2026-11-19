"use client";

import { useSuspenseInfiniteQuery } from "@tanstack/react-query";
import { CircleAlertIcon, ListTodoIcon } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef } from "react";

import { CreationDate } from "@/components/creation-date";
import {
  Alert,
  AlertAction,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemTitle,
} from "@/components/ui/item";
import { Skeleton } from "@/components/ui/skeleton";
import { DeleteTaskButton } from "@/features/tasks/delete-task-button";
import { describeError } from "@/features/tasks/describe-error";
import { useDeleteTask } from "@/features/tasks/use-delete-task";
import { useTRPC } from "@/trpc/client";
import { getNextTaskListPage, taskListInput } from "@/trpc/task-list-query";

const SKELETON_ROWS = 3;

export function TaskList() {
  const trpc = useTRPC();
  // The server prefetched this query and sent it with the HTML, so it is
  // already in the cache and the first paint has no loading state. The
  // pages fetched while scrolling continue the same query.
  const {
    data,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isFetchNextPageError,
  } = useSuspenseInfiniteQuery(
    trpc.task.list.infiniteQueryOptions(taskListInput, {
      getNextPageParam: getNextTaskListPage,
    }),
  );
  const tasks = data.pages.flatMap((page) => page.items);
  // Here and not in the row, which leaves the list as soon as the delete starts.
  const { mutate: deleteTask } = useDeleteTask();

  // The sentinel is on screen only while another page can be asked for.
  const sentinelRef = useRef<HTMLDivElement>(null);
  const canLoadMore =
    hasNextPage && !isFetchingNextPage && !isFetchNextPageError;
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!canLoadMore || !sentinel) return;
    // A new observer reports the sentinel's current position at once, so a
    // page too short to push the sentinel out of view loads the next one.
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) void fetchNextPage();
    });
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [canLoadMore, fetchNextPage]);

  if (tasks.length === 0) {
    return (
      <Empty>
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <ListTodoIcon />
          </EmptyMedia>
          <EmptyTitle>No tasks yet</EmptyTitle>
          <EmptyDescription>
            Create your first task to see it here.
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Link href="/tasks/new" className={buttonVariants()}>
            Create a task
          </Link>
        </EmptyContent>
      </Empty>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <ItemGroup aria-label="Tasks" aria-busy={isFetchingNextPage}>
        {tasks.map((task) => (
          <Item key={task.id} role="listitem" variant="outline">
            <ItemContent>
              <ItemTitle>{task.title}</ItemTitle>
              {task.description ? (
                <ItemDescription>{task.description}</ItemDescription>
              ) : null}
              <CreationDate date={task.createdAt} />
            </ItemContent>
            <ItemActions>
              <Link
                href={`/tasks/${task.id}/edit`}
                className={buttonVariants({ variant: "outline", size: "sm" })}
              >
                Edit<span className="sr-only"> {task.title}</span>
              </Link>
              <DeleteTaskButton
                title={task.title}
                onConfirm={() => deleteTask({ id: task.id })}
              />
            </ItemActions>
          </Item>
        ))}
      </ItemGroup>

      {isFetchingNextPage ? (
        <TaskRowSkeletons />
      ) : isFetchNextPageError ? (
        <Alert variant="destructive">
          <CircleAlertIcon />
          <AlertTitle>More tasks could not be loaded</AlertTitle>
          <AlertDescription>{describeError(error).message}</AlertDescription>
          <AlertAction>
            <Button
              size="sm"
              variant="outline"
              onClick={() => void fetchNextPage()}
            >
              Retry
            </Button>
          </AlertAction>
        </Alert>
      ) : hasNextPage ? (
        <div ref={sentinelRef} />
      ) : null}

      {/* Present from the first render, so screen readers announce what
          appears in it. The failure is announced by the alert itself. */}
      <div role="status" className="text-center text-sm text-muted-foreground">
        {isFetchingNextPage ? (
          <span className="sr-only">Loading more tasks</span>
        ) : !hasNextPage ? (
          "You have reached the end of the list."
        ) : null}
      </div>
    </div>
  );
}

function TaskRowSkeletons() {
  return (
    <div aria-hidden className="flex flex-col gap-4">
      {Array.from({ length: SKELETON_ROWS }, (_, i) => (
        <Item key={i} variant="outline">
          <ItemContent>
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-4 w-1/3" />
          </ItemContent>
        </Item>
      ))}
    </div>
  );
}
