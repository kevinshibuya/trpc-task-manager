import { fetchRequestHandler } from "@trpc/server/adapters/fetch";

import { appRouter } from "@/server/trpc/app-router";
import { createContext } from "@/server/trpc/context";

function handler(req: Request) {
  return fetchRequestHandler({
    endpoint: "/api/trpc",
    req,
    router: appRouter,
    createContext,
    onError({ error, path }) {
      // The browser gets a generic message, so the detail is logged here.
      if (error.code === "INTERNAL_SERVER_ERROR") {
        console.error(
          `tRPC ${path ?? "request"} failed:`,
          error.cause ?? error,
        );
      }
    },
  });
}

export { handler as GET, handler as POST };
