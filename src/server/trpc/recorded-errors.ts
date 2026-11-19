/*
 * Error bodies as the fetch adapter sends them, after the transformer, and as
 * the browser's tRPC client receives them. The router tests assert that the
 * server still produces exactly these, and the client error function is
 * tested against them, so the two sides cannot drift apart unnoticed.
 */

export const recordedValidationError = {
  code: -32600,
  message: "Some of the values sent are not valid.",
  data: {
    code: "BAD_REQUEST",
    httpStatus: 400,
    path: "task.create",
    fieldErrors: { title: ["Enter a title."] },
  },
};

export const recordedInternalError = {
  code: -32603,
  message: "Something went wrong on the server. Please try again.",
  data: {
    code: "INTERNAL_SERVER_ERROR",
    httpStatus: 500,
    path: "task.create",
  },
};
