"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import type { TaskPage } from "@/server/tasks/task";
import { useTRPC } from "@/trpc/client";
import { taskListInput } from "@/trpc/task-list-query";

import { describeError } from "./describe-error";

/**
 * The list as it is now, with one task put back where `before` had it.
 * Putting `before` back whole would also undo every delete confirmed after
 * the one that failed.
 */
function putBack<List extends { pages: TaskPage[] }>(
  now: List,
  before: List,
  id: string,
): List {
  // A list fetched in the meantime may already hold it.
  if (now.pages.some((page) => page.items.some((task) => task.id === id))) {
    return now;
  }
  return {
    ...now,
    pages: now.pages.map((page, pageIndex) => {
      const items = before.pages[pageIndex]?.items ?? [];
      const index = items.findIndex((task) => task.id === id);
      if (index === -1) return page;
      // Before the first task that used to follow it and is still shown.
      const following = items.slice(index + 1).map((task) => task.id);
      const next = page.items.findIndex((task) => following.includes(task.id));
      const at = next === -1 ? page.items.length : next;
      return {
        ...page,
        items: [
          ...page.items.slice(0, at),
          items[index],
          ...page.items.slice(at),
        ],
      };
    }),
  };
}

/**
 * Deletes a task optimistically. The task leaves the cached list the moment
 * the person confirms, so the list never waits on the server. A failed delete
 * puts that one task back in its old place at once, before the refetch that
 * follows can answer, and leaves out the tasks of other deletes still pending.
 * The list is revalidated once the last overlapping delete settles, so the
 * server has the last word.
 */
export function useDeleteTask() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const listKey = trpc.task.list.infiniteQueryKey(taskListInput);

  return useMutation(
    trpc.task.delete.mutationOptions({
      async onMutate({ id }) {
        // A list request still in flight would bring the task back.
        await queryClient.cancelQueries({ queryKey: listKey });
        const previous = queryClient.getQueryData(listKey);
        queryClient.setQueryData(listKey, (data) =>
          data
            ? {
                ...data,
                pages: data.pages.map((page) => ({
                  ...page,
                  items: page.items.filter((task) => task.id !== id),
                })),
              }
            : data,
        );
        return { previous };
      },
      onSuccess() {
        toast.success("Task deleted.");
      },
      onError(error, { id }, context) {
        const previous = context?.previous;
        if (previous) {
          queryClient.setQueryData(listKey, (current) =>
            current ? putBack(current, previous, id) : previous,
          );
        }
        toast.error("The task could not be deleted.", {
          description: describeError(error).message,
        });
      },
      onSettled() {
        // While another delete is pending, its task is out of the cached list
        // but maybe not out of the server yet, so a list fetched now could
        // bring it back. The last delete to settle revalidates for all of
        // them. This one still counts as pending here, so 1 means no other is.
        if (
          queryClient.isMutating({
            mutationKey: trpc.task.delete.mutationKey(),
          }) === 1
        ) {
          return queryClient.invalidateQueries({
            queryKey: trpc.task.list.pathKey(),
          });
        }
      },
    }),
  );
}
