import { z } from "zod";

/** A unit of work a person wants to remember. See GLOSSARY.md. */
export type Task = {
  id: string;
  title: string;
  description?: string;
  createdAt: Date;
};

export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;

export const listTasksInput = z.object({
  // `null` is what the infinite query sends for the first page.
  cursor: z.string().nullish(),
  limit: z.number().int().min(1).max(MAX_PAGE_SIZE).optional(),
});

export type ListTasksInput = z.input<typeof listTasksInput>;

export type TaskPage = {
  items: Task[];
  /** Pass it back to get the next page. `null` when the list is over. */
  nextCursor: string | null;
};

export const TITLE_MAX_LENGTH = 120;
export const DESCRIPTION_MAX_LENGTH = 2000;

/**
 * The editable fields of a task. The server validates with it and the form
 * does too, so the two sides cannot disagree about what is valid. Any other
 * key, such as `id` or `createdAt`, is dropped: the server sets those.
 */
export const taskInput = z.object({
  title: z
    .string({ error: "Enter a title." })
    .trim()
    .min(1, "Enter a title.")
    .max(
      TITLE_MAX_LENGTH,
      `The title can have at most ${TITLE_MAX_LENGTH} characters.`,
    ),
  description: z
    .string()
    .trim()
    .max(
      DESCRIPTION_MAX_LENGTH,
      `The description can have at most ${DESCRIPTION_MAX_LENGTH} characters.`,
    )
    .optional()
    // An empty description is stored as absent, not as "".
    .transform((description) => description || undefined),
});

/** What a caller sends: untrimmed text, the description optional. */
export type TaskInput = z.input<typeof taskInput>;

export const taskIdInput = z.object({ id: z.string() });

/** The task to update and its new editable fields. */
export const updateTaskInput = taskInput.extend(taskIdInput.shape);
