"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { useTRPC } from "@/trpc/client";
import { taskListInput } from "@/trpc/task-list-query";

import { describeError } from "./describe-error";

/**
 * Deletes a task optimistically. The task leaves the cached list the moment
 * the person confirms, so the list never waits on the server. The cache as it
 * was is kept, and a failed delete puts it back at once, with the task in its
 * old place, before the refetch that follows can answer. The list is
 * revalidated either way, so the server has the last word.
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
      onError(error, _input, context) {
        if (context?.previous) {
          queryClient.setQueryData(listKey, context.previous);
        }
        toast.error("The task could not be deleted.", {
          description: describeError(error).message,
        });
      },
      onSettled() {
        return queryClient.invalidateQueries({
          queryKey: trpc.task.list.pathKey(),
        });
      },
    }),
  );
}
