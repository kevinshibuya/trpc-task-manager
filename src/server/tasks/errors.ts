/**
 * Domain errors. The task module raises them without knowing about any
 * transport. The tRPC layer translates them into transport errors in one place.
 */
export class InvalidCursorError extends Error {
  constructor() {
    super("The list cursor is not valid. Start again from the first page.");
    this.name = "InvalidCursorError";
  }
}
