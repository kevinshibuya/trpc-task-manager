import { TRPCClientError } from "@trpc/client";

/**
 * Turns any failed call into a sentence a person can read. Every screen that
 * reports a failure goes through this function.
 */
export function describeError(error: unknown): string {
  if (error instanceof TRPCClientError) {
    const code: unknown = error.data?.code;
    if (code === undefined) {
      return "The server could not be reached. Check your connection and try again.";
    }
    if (code === "INTERNAL_SERVER_ERROR") {
      return "Something went wrong on the server. Please try again.";
    }
    // The server writes the other messages for people.
    return error.message;
  }
  return "Something went wrong. Please try again.";
}
