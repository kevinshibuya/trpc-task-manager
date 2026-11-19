"use client";

import { useSyncExternalStore } from "react";

const subscribe = () => () => {};

/**
 * False on the server and during hydration, true afterwards. React renders
 * with the server value first while hydrating, then again with the client one.
 */
function useHydrated() {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
}

/**
 * The server does not know the viewer's time zone, so the server HTML and the
 * first client render both show the date in UTC and hydration sees the same
 * text. Once hydrated, the date switches to the viewer's own time zone.
 */
export function CreationDate({ date }: { date: Date }) {
  const hydrated = useHydrated();
  const text = new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: hydrated ? undefined : "UTC",
  }).format(date);

  return (
    <time dateTime={date.toISOString()} className="text-muted-foreground">
      {text}
      {hydrated ? null : " UTC"}
    </time>
  );
}
