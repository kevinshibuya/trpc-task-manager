import { cn } from "cn";
import { InboxIcon, PlusIcon } from "lucide-react";
import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";

/**
 * The list page's title and its New task action. The error screen shows it
 * too, since the header has no New task link on the list page.
 */
export function TaskListTitleRow() {
  return (
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
  );
}
