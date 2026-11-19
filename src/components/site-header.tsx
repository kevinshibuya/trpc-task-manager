"use client";

import { ChevronLeftIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { ThemeToggle } from "@/components/theme-toggle";
import { buttonVariants } from "@/components/ui/button";

/** The top row: a way back to the list on every other page, and the theme toggle. */
export function SiteHeader() {
  const onList = usePathname() === "/";

  return (
    <header className="flex h-14 items-center gap-4">
      {onList ? null : (
        // The negative margin lines the chevron up with the title below it.
        <Link
          href="/"
          className={buttonVariants({
            variant: "ghost",
            size: "icon",
            className: "-ml-1.5 text-muted-foreground",
          })}
        >
          <ChevronLeftIcon className="size-5" aria-hidden />
          <span className="sr-only">Back to tasks</span>
        </Link>
      )}
      <div className="ml-auto">
        <ThemeToggle />
      </div>
    </header>
  );
}
