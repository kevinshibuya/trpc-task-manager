"use client";

import {
  useMutation,
  useQueryClient,
  useSuspenseQuery,
} from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { useTRPC } from "@/trpc/client";

import { TaskForm, type TaskFormValues } from "./task-form";

export function EditTaskForm({ id }: { id: string }) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const router = useRouter();
  // The edit page prefetched this task on the server and sent it with the
  // HTML, so the form renders filled in on the first paint.
  const { data: task } = useSuspenseQuery(
    trpc.task.getById.queryOptions({ id }),
  );
  const { mutateAsync: updateTask } = useMutation(
    trpc.task.update.mutationOptions(),
  );

  async function save(values: TaskFormValues) {
    const updated = await updateTask({ id, ...values });
    queryClient.setQueryData(trpc.task.getById.queryKey({ id }), updated);
    // The list page renders on the server again on the way back, and the
    // cached pages are marked stale so the client does not keep the old ones.
    await queryClient.invalidateQueries({ queryKey: trpc.task.list.pathKey() });
    toast.success("Task updated.");
    router.push("/");
  }

  return (
    <TaskForm
      submitLabel="Save changes"
      defaultValues={{ title: task.title, description: task.description }}
      onSave={save}
    />
  );
}
