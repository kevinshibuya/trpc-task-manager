import { test as base, expect } from "@playwright/test";

type ErrorPattern = string | RegExp;

type ErrorGuard = {
  errors: string[];
  allowed: ErrorPattern[];
};

type Fixtures = {
  errorGuard: ErrorGuard;
  /** Lets this test pass when the page logs an error it causes on purpose. */
  allowError: (pattern: ErrorPattern) => void;
};

const matches = (error: string, pattern: ErrorPattern) =>
  typeof pattern === "string" ? error.includes(pattern) : pattern.test(error);

export const test = base.extend<Fixtures>({
  errorGuard: [
    async ({ page }, use) => {
      const guard: ErrorGuard = { errors: [], allowed: [] };
      page.on("console", (message) => {
        if (message.type() === "error") {
          guard.errors.push(`console error: ${message.text()}`);
        }
      });
      // A hydration mismatch in a production build arrives here, as an
      // uncaught error, and never as a console message.
      page.on("pageerror", (error) => {
        guard.errors.push(`uncaught page error: ${error.message}`);
      });

      await use(guard);

      const unexpected = guard.errors.filter(
        (error) => !guard.allowed.some((pattern) => matches(error, pattern)),
      );
      expect(unexpected, "the page reported errors").toEqual([]);
    },
    { auto: true },
  ],

  allowError: async ({ errorGuard }, use) => {
    await use((pattern) => {
      errorGuard.allowed.push(pattern);
    });
  },
});

export { expect };
