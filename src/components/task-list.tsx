"use client";

import { useSuspenseInfiniteQuery } from "@tanstack/react-query";
import { ListTodoIcon } from "lucide-react";
import Link from "next/link";

import { CreationDate } from "@/components/creation-date";
import { buttonVariants } from "@/components/ui/button";
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
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemTitle,
} from "@/components/ui/item";
import { useTRPC } from "@/trpc/client";
import { getNextTaskListPage, taskListInput } from "@/trpc/task-list-query";

export function TaskList() {
  const trpc = useTRPC();
  // The server prefetched this query and sent it with the HTML, so it is
  // already in the cache and the first paint has no loading state.
  const { data } = useSuspenseInfiniteQuery(
    trpc.task.list.infiniteQueryOptions(taskListInput, {
      getNextPageParam: getNextTaskListPage,
    }),
  );
  const tasks = data.pages.flatMap((page) => page.items);

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
    <ItemGroup aria-label="Tasks">
      {tasks.map((task) => (
        <Item key={task.id} role="listitem" variant="outline">
          <ItemContent>
            <ItemTitle>{task.title}</ItemTitle>
            {task.description ? (
              <ItemDescription>{task.description}</ItemDescription>
            ) : null}
            <CreationDate date={task.createdAt} />
          </ItemContent>
        </Item>
      ))}
    </ItemGroup>
  );
}
