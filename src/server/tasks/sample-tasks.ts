import { InMemoryTaskRepository } from "./in-memory-task-repository";
import type { Task } from "./task";
import type { TaskRepository } from "./task-repository";

const DEFAULT_SAMPLE_TASK_COUNT = 50;
const HOUR = 60 * 60 * 1000;

// Generic chores only: the repository is public, so no real person, company,
// email or address appears here.
const CHORES: { title: string; description?: string }[] = [
  { title: "Water the plants", description: "The ferns by the window too." },
  { title: "Take out the recycling" },
  { title: "Buy groceries", description: "Rice, beans, eggs and coffee." },
  { title: "Clean the kitchen counters" },
  { title: "Fold the laundry", description: "Towels go in the hall closet." },
  { title: "Vacuum the living room" },
  {
    title: "Pay the electricity bill",
    description: "Due at the end of the month.",
  },
  { title: "Defrost the freezer" },
  { title: "Wipe the bathroom mirror" },
  { title: "Replace the kitchen sponge" },
  {
    title: "Change the bed sheets",
    description: "Spare set is on the top shelf.",
  },
  { title: "Descale the kettle" },
  {
    title: "Sort the junk drawer",
    description: "Keep the batteries, toss the rest.",
  },
  { title: "Sweep the balcony" },
  { title: "Return the library books" },
  { title: "Dust the bookshelves" },
  { title: "Clean the oven", description: "Leave the cleaner on overnight." },
  { title: "Restock the first aid kit" },
  { title: "Wash the windows" },
  { title: "Organize the pantry", description: "Check the expiry dates." },
  { title: "Mop the hallway" },
  { title: "Oil the squeaky door hinge" },
  { title: "Empty the dishwasher" },
  { title: "Plan meals for the week", description: "Something with lentils." },
  { title: "Test the smoke alarm" },
];

/** `count` sample tasks, three hours apart, the newest an hour before `now`. */
export function sampleTasks(count: number, now: number): Task[] {
  return Array.from({ length: count }, (_, i) => {
    const chore = CHORES[i % CHORES.length];
    return {
      id: crypto.randomUUID(),
      title: chore.title,
      ...(chore.description && { description: chore.description }),
      createdAt: new Date(now - HOUR - i * 3 * HOUR),
    };
  });
}

function sampleTaskCount(value: string | undefined): number {
  if (value === undefined || value.trim() === "") {
    return DEFAULT_SAMPLE_TASK_COUNT;
  }
  if (!/^\d+$/.test(value.trim())) {
    throw new Error(
      `SAMPLE_TASK_COUNT must be a whole number of zero or more, not "${value}".`,
    );
  }
  return Number(value);
}

/**
 * The repository the application starts with, filled with sample tasks.
 * `SAMPLE_TASK_COUNT` sets how many (50 by default); zero turns them off.
 */
export function createTaskRepository(
  env: Record<string, string | undefined>,
): TaskRepository {
  const count = sampleTaskCount(env.SAMPLE_TASK_COUNT);
  return new InMemoryTaskRepository(sampleTasks(count, Date.now()));
}
