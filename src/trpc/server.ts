import "server-only";

import { createTRPCOptionsProxy } from "@trpc/tanstack-react-query";
import { cache } from "react";

import { appRouter } from "@/server/trpc/app-router";
import { createContext } from "@/server/trpc/context";

import { makeQueryClient } from "./query-client";

/** One query client per server request, shared by everything it renders. */
export const getQueryClient = cache(makeQueryClient);

/** Calls the router in-process, with no HTTP round trip (ADR 0004). */
export const trpc = createTRPCOptionsProxy({
  ctx: createContext,
  router: appRouter,
  queryClient: getQueryClient,
});
