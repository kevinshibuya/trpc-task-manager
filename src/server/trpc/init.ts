import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import { flattenError, ZodError } from "zod";

import { InvalidCursorError } from "@/server/tasks/errors";
import type { TaskService } from "@/server/tasks/task-service";

/** What every procedure receives. Tests pass a service over a fresh repository. */
export type Context = { taskService: TaskService };

export const INTERNAL_ERROR_MESSAGE =
  "Something went wrong on the server. Please try again.";

const t = initTRPC.context<Context>().create({
  // Keeps `createdAt` a `Date` on both sides of the wire.
  transformer: superjson,
  // Never send stack traces, in development either.
  isDev: false,
  errorFormatter({ shape, error }) {
    if (error.code === "INTERNAL_SERVER_ERROR") {
      return { ...shape, message: INTERNAL_ERROR_MESSAGE };
    }
    if (error.cause instanceof ZodError) {
      return {
        ...shape,
        message: "Some of the values sent are not valid.",
        // The messages grouped by field, so the form can show each one next
        // to its field: `{ title: ["Enter a title."] }`.
        data: {
          ...shape.data,
          fieldErrors: flattenError(error.cause).fieldErrors,
        },
      };
    }
    return shape;
  },
});

/**
 * The one place where domain errors become transport errors. Anything it
 * does not recognise stays an internal error, whose message the formatter
 * above replaces.
 */
const translateDomainErrors = t.middleware(async ({ next }) => {
  const result = await next();
  if (!result.ok && result.error.cause instanceof InvalidCursorError) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: result.error.cause.message,
      cause: result.error.cause,
    });
  }
  return result;
});

export const router = t.router;
export const createCallerFactory = t.createCallerFactory;
export const publicProcedure = t.procedure.use(translateDomainErrors);
