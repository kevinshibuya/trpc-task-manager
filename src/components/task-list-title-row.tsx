import { cn } from "cn";
import { InboxIcon, PlusIcon } from "lucide-react";
import Link from "next/link";

import { ThemeToggle } from "@/components/theme-toggle";
import { buttonVariants } from "@/components/ui/button";

/**
 * The list page's title, its New task action and the theme toggle, which the
 * top row leaves to this row on the list. The error screen shows it too,
 * since the header has no New task link on the list page.
 */
export function TaskListTitleRow() {
  return (
    <div className="flex items-center justify-between gap-4">
      <h1 className="flex items-center gap-2.5 text-2xl font-bold tracking-tight">
        <InboxIcon className="size-5.5 text-primary" aria-hidden />
        Tasks
      </h1>
      <div className="flex items-center gap-2">
        <Link
          href="/tasks/new"
          className={cn(buttonVariants({ size: "icon" }), "rounded-full")}
        >
          <PlusIcon aria-hidden />
          <span className="sr-only">New task</span>
        </Link>
        <ThemeToggle />
      </div>
    </div>
  );
}
