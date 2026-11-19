import { TRPCClientError } from "@trpc/client";

export type DescribedError = {
  /** A sentence a person can read. Never an error code alone. */
  message: string;
  /**
   * The server's validation messages by field name, for a form to show next
   * to each field. Empty when the failure is not about a field.
   */
  fieldErrors: Record<string, string>;
  /** The server no longer has what the call asked for, so retrying won't help. */
  notFound: boolean;
};

/**
 * Turns any failed call into something a person can read. Every screen that
 * reports a failure goes through this function.
 */
export function describeError(error: unknown): DescribedError {
  if (error instanceof TRPCClientError) {
    const code: unknown = error.data?.code;
    if (code === undefined) {
      return {
        message:
          "The server could not be reached. Check your connection and try again.",
        fieldErrors: {},
        notFound: false,
      };
    }
    if (code === "INTERNAL_SERVER_ERROR") {
      return {
        message: "Something went wrong on the server. Please try again.",
        fieldErrors: {},
        notFound: false,
      };
    }
    // The server writes the other messages for people.
    return {
      message: error.message,
      fieldErrors: readFieldErrors(error.data?.fieldErrors),
      notFound: code === "NOT_FOUND",
    };
  }
  return {
    message: "Something went wrong. Please try again.",
    fieldErrors: {},
    notFound: false,
  };
}

/** `{ title: ["Enter a title."] }` from the server becomes `{ title: "Enter a title." }`. */
function readFieldErrors(value: unknown): Record<string, string> {
  if (typeof value !== "object" || value === null) return {};
  const fieldErrors: Record<string, string> = {};
  for (const [field, messages] of Object.entries(value)) {
    if (!Array.isArray(messages)) continue;
    const text = messages.filter((m) => typeof m === "string").join(" ");
    if (text) fieldErrors[field] = text;
  }
  return fieldErrors;
}
