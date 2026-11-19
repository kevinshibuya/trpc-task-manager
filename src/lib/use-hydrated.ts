import { useSyncExternalStore } from "react";

// Nothing ever changes, so there is nothing to subscribe to.
const subscribe = () => () => {};

/**
 * Whether React has hydrated the page in this browser. It is false on the
 * server and during hydration, so both render the same markup, and true from
 * the render right after.
 */
export function useHydrated() {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
}
