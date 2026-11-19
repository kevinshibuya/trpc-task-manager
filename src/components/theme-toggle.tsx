"use client";

import { MoonIcon, SunIcon } from "lucide-react";
import { useTheme } from "next-themes";
import { flushSync } from "react-dom";

import { Button } from "@/components/ui/button";

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();

  function toggleTheme() {
    const nextTheme = resolvedTheme === "dark" ? "light" : "dark";
    if (
      typeof document.startViewTransition !== "function" ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      setTheme(nextTheme);
      return;
    }
    // The whole page cross-fades once, instead of only the elements that have
    // their own transitions. next-themes applies the class in an effect after
    // the state update, and flushSync runs both before the callback returns,
    // so the new snapshot already shows the new theme.
    document.startViewTransition(() => {
      flushSync(() => setTheme(nextTheme));
    });
  }

  return (
    <Button variant="ghost" size="icon" onClick={toggleTheme}>
      {/* The icons switch through the `dark` class, not through
          `resolvedTheme`, so the server HTML and the first client render
          match whatever theme the browser picks. */}
      <SunIcon className="dark:hidden" aria-hidden />
      <MoonIcon className="hidden dark:block" aria-hidden />
      <span className="sr-only">Toggle theme</span>
    </Button>
  );
}
