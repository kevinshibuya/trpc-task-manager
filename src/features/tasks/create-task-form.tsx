"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { useTRPC } from "@/trpc/client";

import { TaskForm, type TaskFormValues } from "./task-form";

export function CreateTaskForm() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const router = useRouter();
  const { mutateAsync: createTask } = useMutation(
    trpc.task.create.mutationOptions(),
  );

  async function save(values: TaskFormValues) {
    await createTask(values);
    // The list page renders on the server again on the way back. Its fresh
    // data replaces a cached list only after the first paint, so the old list
    // would show and then jump. With the cached list removed, the first paint
    // already comes from the server's data.
    queryClient.removeQueries({ queryKey: trpc.task.list.pathKey() });
    toast.success("Task created.");
    router.push("/");
  }

  return <TaskForm submitLabel="Create task" onSave={save} />;
}
