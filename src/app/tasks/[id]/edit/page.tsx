import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { TRPCError } from "@trpc/server";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { EditTaskForm } from "@/features/tasks/edit-task-form";
import { getQueryClient, trpc } from "@/trpc/server";

export const metadata: Metadata = { title: "Edit task · Task manager" };

// This route has no `loading.tsx` on purpose. A loading screen would start
// the response streaming with a 200 before the task is read, so an unknown id
// could no longer answer 404. The task comes from memory, so nothing is
// waited for long enough to need one.
export default async function EditTaskPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const queryClient = getQueryClient();
  try {
    await queryClient.fetchQuery(trpc.task.getById.queryOptions({ id }));
  } catch (error) {
    if (error instanceof TRPCError && error.code === "NOT_FOUND") notFound();
    throw error;
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-heading text-2xl font-semibold">Edit task</h1>
      <HydrationBoundary state={dehydrate(queryClient)}>
        <EditTaskForm id={id} />
      </HydrationBoundary>
    </div>
  );
}
