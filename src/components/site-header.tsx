import Link from "next/link";

import { ThemeToggle } from "@/components/theme-toggle";

export function SiteHeader() {
  return (
    <header className="flex h-14 items-center justify-between gap-4 border-b">
      <Link href="/" className="font-heading text-lg font-semibold">
        Task manager
      </Link>
      <ThemeToggle />
    </header>
  );
}
