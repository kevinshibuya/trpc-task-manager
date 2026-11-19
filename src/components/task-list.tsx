"use client";

import { useSuspenseInfiniteQuery } from "@tanstack/react-query";
import {
  CalendarIcon,
  CircleAlertIcon,
  ListTodoIcon,
  PencilIcon,
} from "lucide-react";
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

  // The skeleton rows are the sentinel. They are watched only while another
  // page can be asked for, and their whole height counts, so a viewport
  // shorter than them still sees them at the end of the list.
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
    <div className="flex flex-col gap-0.5">
      <ItemGroup
        aria-label="Tasks"
        aria-busy={isFetchingNextPage}
        className="gap-0.5"
      >
        {tasks.map((task) => (
          // The row's padding sits outside the column, so its text lines up
          // with the title above and only the hover fill reaches past it.
          <Item
            key={task.id}
            role="listitem"
            className="-mx-3 w-auto flex-nowrap items-start gap-3 rounded-md border-0 px-3 py-1.5 focus-within:bg-muted hover:bg-muted"
          >
            {/* A long word breaks anywhere, so it stays clear of the actions
                and the page never scrolls sideways. */}
            <ItemContent className="min-w-0 gap-0.5">
              <ItemTitle className="text-[15px] leading-4.5 font-normal wrap-anywhere">
                {task.title}
              </ItemTitle>
              {task.description ? (
                <ItemDescription className="text-[13px] leading-4.5 wrap-anywhere">
                  {task.description}
                </ItemDescription>
              ) : null}
              <div className="flex items-center gap-1 text-xs leading-4 text-muted-foreground">
                <CalendarIcon className="size-3" aria-hidden />
                <CreationDate date={task.createdAt} />
              </div>
            </ItemContent>
            {/* As tall as the title's line, so the buttons centre on it. */}
            <ItemActions className="h-4.5 gap-0.5">
              <Link
                href={`/tasks/${task.id}/edit`}
                className={buttonVariants({
                  variant: "ghost",
                  size: "icon-sm",
                  className: "text-muted-foreground",
                })}
              >
                <PencilIcon aria-hidden />
                <span className="sr-only">Edit {task.title}</span>
              </Link>
              <DeleteTaskButton
                title={task.title}
                onConfirm={() => deleteTask({ id: task.id })}
              />
            </ItemActions>
          </Item>
        ))}
      </ItemGroup>

      {/* A retry keeps the error until it settles, so the alert waits for
          the retry to fail and the skeletons show while it runs. */}
      {isFetchNextPageError && !isFetchingNextPage ? (
        <Alert variant="destructive" className="mt-4">
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
        // The skeletons are in the server HTML too, so a person who scrolls to
        // the end before the scripts load sees that more is coming. They stay
        // while the page loads, and its rows take their place.
        <div ref={sentinelRef}>
          <TaskRowSkeletons />
        </div>
      ) : null}

      {/* Present from the first render, so screen readers announce what
          appears in it. The failure is announced by the alert itself. */}
      <div
        role="status"
        className="mt-4 text-center text-sm text-muted-foreground"
      >
        {isFetchingNextPage ? (
          <span className="sr-only">Loading more tasks</span>
        ) : !hasNextPage ? (
          "You have reached the end of the list."
        ) : null}
      </div>
    </div>
  );
}

/** Rows of the same height as a task with a title and a date. */
function TaskRowSkeletons() {
  return (
    <div aria-hidden className="flex flex-col gap-0.5">
      {Array.from({ length: SKELETON_ROWS }, (_, i) => (
        <div key={i} className="flex flex-col gap-0.5 py-1.5">
          <Skeleton className="my-0.5 h-3.5 w-2/3" />
          <Skeleton className="my-0.5 h-3 w-1/3" />
        </div>
      ))}
    </div>
  );
}
