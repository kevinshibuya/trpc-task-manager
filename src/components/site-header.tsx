import Link from "next/link";

import { ThemeToggle } from "@/components/theme-toggle";
import { buttonVariants } from "@/components/ui/button";

export function SiteHeader() {
  return (
    <header className="flex h-14 items-center justify-between gap-4 border-b">
      <Link href="/" className="font-heading text-lg font-semibold">
        Task manager
      </Link>
      <div className="flex items-center gap-2">
        <Link href="/tasks/new" className={buttonVariants({ size: "sm" })}>
          New task
        </Link>
        <ThemeToggle />
      </div>
    </header>
  );
}
