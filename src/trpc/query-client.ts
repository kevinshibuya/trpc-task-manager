import { QueryClient } from "@tanstack/react-query";
import superjson from "superjson";

export function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // Above zero, so data the server just rendered is not fetched again
        // the moment the page mounts in the browser.
        staleTime: 30 * 1000,
        // A failure reaches the person at once instead of after silent retries.
        retry: false,
      },
      // The server sends its query cache with the HTML. superjson keeps the
      // dates inside it dates.
      dehydrate: { serializeData: superjson.serialize },
      hydrate: { deserializeData: superjson.deserialize },
    },
  });
}
