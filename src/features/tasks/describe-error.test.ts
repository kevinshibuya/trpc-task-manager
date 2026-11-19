import { TRPCClientError } from "@trpc/client";
import { describe, expect, it } from "vitest";

import {
  recordedInternalError,
  recordedNotFoundError,
  recordedValidationError,
} from "@/server/trpc/recorded-errors";

import { describeError } from "./describe-error";

// Builds the error the browser's tRPC client throws for a recorded body.
const clientError = (body: object) => TRPCClientError.from({ error: body });

describe("describeError", () => {
  it("hands over the message for each field of a validation error", () => {
    const described = describeError(clientError(recordedValidationError));

    expect(described.fieldErrors).toEqual({ title: "Enter a title." });
    expect(described.message).toBe("Some of the values sent are not valid.");
  });

  it("says a task was not found and marks the failure as not found", () => {
    const described = describeError(clientError(recordedNotFoundError));

    expect(described.message).toBe(
      "The task was not found. It may have been deleted.",
    );
    expect(described.notFound).toBe(true);
    expect(described.fieldErrors).toEqual({});
  });

  it("turns an internal error into a generic sentence with no error code", () => {
    const described = describeError(clientError(recordedInternalError));

    expect(described.message).toBe(
      "Something went wrong on the server. Please try again.",
    );
    expect(described.message).not.toMatch(/INTERNAL_SERVER_ERROR|-32603|500/);
    expect(described.fieldErrors).toEqual({});
  });

  it("says the server could not be reached when no response arrived", () => {
    const described = describeError(
      TRPCClientError.from(new TypeError("Failed to fetch")),
    );

    expect(described.message).toBe(
      "The server could not be reached. Check your connection and try again.",
    );
  });
});
