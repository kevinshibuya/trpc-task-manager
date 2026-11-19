"use client";

import { MoonIcon, SunIcon } from "lucide-react";
import { useTheme } from "next-themes";
import { useRef } from "react";
import { flushSync } from "react-dom";

import { Button } from "@/components/ui/button";

export function ThemeToggle() {
  const { setTheme } = useTheme();
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Read from the page when the switch runs, not when the button is clicked:
  // a second click before the first transition's update has run still flips
  // the theme back.
  function switchTheme() {
    const isDark = document.documentElement.classList.contains("dark");
    setTheme(isDark ? "light" : "dark");
  }

  function toggleTheme() {
    if (
      typeof document.startViewTransition !== "function" ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      switchTheme();
      return;
    }
    // The whole page cross-fades once, instead of only the elements that have
    // their own transitions. next-themes applies the class in an effect after
    // the state update, and flushSync runs both before the callback returns,
    // so the new snapshot already shows the new theme.
    const transition = document.startViewTransition(() => {
      flushSync(switchTheme);
    });
    // A second click skips this cross-fade, which rejects `ready`. The theme
    // still switches, so there is nothing to report.
    transition.ready.catch(() => {});

    // While the page fades, the browser draws it from snapshots and sends
    // every click to <html>, never to the button, whatever `pointer-events`
    // the snapshots have. A click that lands on the button's box during the
    // fade still switches the theme back.
    function clickThrough(event: MouseEvent) {
      const box = buttonRef.current?.getBoundingClientRect();
      if (
        event.target === document.documentElement &&
        box &&
        event.clientX >= box.left &&
        event.clientX <= box.right &&
        event.clientY >= box.top &&
        event.clientY <= box.bottom
      ) {
        toggleTheme();
      }
    }
    document.addEventListener("click", clickThrough);
    const stopClickThrough = () =>
      document.removeEventListener("click", clickThrough);
    transition.finished.then(stopClickThrough, stopClickThrough);
  }

  return (
    // The negative margin lines the icon up with the column's right edge.
    <Button
      ref={buttonRef}
      variant="ghost"
      size="icon"
      className="-mr-1.5 text-muted-foreground"
      onClick={toggleTheme}
    >
      {/* The icons switch through the `dark` class, not through
          `resolvedTheme`, so the server HTML and the first client render
          match whatever theme the browser picks. */}
      <SunIcon className="size-5 dark:hidden" aria-hidden />
      <MoonIcon className="hidden size-5 dark:block" aria-hidden />
      <span className="sr-only">Toggle theme</span>
    </Button>
  );
}
