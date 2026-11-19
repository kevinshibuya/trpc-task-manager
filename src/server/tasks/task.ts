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
