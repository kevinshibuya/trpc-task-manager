import type { Metadata } from "next";

import { CreateTaskForm } from "@/features/tasks/create-task-form";

export const metadata: Metadata = { title: "New task · Task manager" };

export default function NewTaskPage() {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold tracking-tight">New task</h1>
      <CreateTaskForm />
    </div>
  );
}
