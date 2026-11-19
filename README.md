# Task manager

A small task manager built for a written case. You can add a task with a title and an optional description, see your tasks newest first, edit one and delete one. The list loads more tasks as you scroll. It runs on Next.js 15, and the browser talks to the server through tRPC 11. The tasks live in the server's memory, as the brief asks, so there is no database to set up, and a restart empties the list. It has a light and a dark theme.

## Running

You need Node 22 (the exact version is in `.nvmrc`) and pnpm. `corepack enable` installs the pnpm version pinned in `package.json`.

```sh
pnpm install
pnpm dev
```

The application runs at http://localhost:3000 and starts with 50 fictitious sample tasks, so the infinite scroll has something to load right away.

`SAMPLE_TASK_COUNT` sets how many sample tasks the store starts with, and `0` turns them off. Copy `.env.example` to `.env.local` and change the value there, or set it for one run:

```sh
SAMPLE_TASK_COUNT=0 pnpm dev
```

| Command             | What it does                                             |
| ------------------- | -------------------------------------------------------- |
| `pnpm typecheck`    | Type checks the project, no build needed                 |
| `pnpm lint`         | Runs ESLint                                              |
| `pnpm format:check` | Checks formatting with Prettier (`pnpm format` fixes it) |
| `pnpm test`         | Runs the service, router and component tests once        |
| `pnpm build`        | Builds the production application                        |
| `pnpm start`        | Serves the production build that `pnpm build` makes      |
| `pnpm test:e2e`     | Runs the browser tests against the production build      |

The browser tests need a build and Chromium:

```sh
pnpm exec playwright install chromium
pnpm build
pnpm test:e2e
```

They start the production build on port 3100, or on the port in `E2E_PORT`, and stop it when they finish. They refuse to run if something already listens on that port. They expect the default 50 sample tasks, so leave `SAMPLE_TASK_COUNT` unset when you run them.

Continuous integration runs every command above on each pull request ([`.github/workflows/ci.yml`](.github/workflows/ci.yml)).

## Architecture

The server has three layers, and the pages sit on top of them.

- The task module in [`src/server/tasks`](src/server/tasks) holds the task type, the input schemas, the rules and the domain errors. It imports nothing from tRPC, Next.js or React, so the rules can be tested with no server and no browser. The task service implements the five operations on top of a `TaskRepository` interface, and `InMemoryTaskRepository` is the one implementation.
- The tRPC router in [`src/server/trpc`](src/server/trpc) is a thin transport at one address, `/api/trpc`. Each procedure validates its input with the task module's schema and calls the service. The browser calls the procedures by name and the compiler checks every call, so renaming a field on the server stops the browser code from compiling. One team owns both sides and both are TypeScript, which is the case tRPC is made for.
- The list page and the edit page are Server Components. They call the router as a plain function in the same process, with no HTTP request, and send what they loaded to the browser inside the HTML. The list page sends the first 20 tasks, and the browser asks for the next 20 as you scroll. The client components start from that data, so the first paint has no loading state. Every later call, writes included, goes through the tRPC client to `/api/trpc`.
- The form validates with the same schema as the server, so the two sides can't disagree about what a valid task is. The server still checks again, because anyone can call the API without the form.
- When something fails, the task module raises its own error, such as "task not found". One middleware turns it into a tRPC code, and [`describe-error.ts`](src/features/tasks/describe-error.ts) turns the code into a sentence for a person. Validation messages arrive grouped by field, so each one shows next to its field. Offline, a save, a delete or a list load fails at once and says so, and a failed delete puts its row back.
- The interface is built from shadcn/ui components, and every colour is a theme variable in [`src/app/globals.css`](src/app/globals.css). Its layout follows one reference, the to-do app Things 3: no header bar, one bold title per page, and rows without boxes.

```mermaid
flowchart TD
  subgraph Browser
    Client["Client components<br/>task list, task form, delete dialog"]
  end
  subgraph Process["Next.js server, one Node process"]
    Pages["Server Components<br/>list page, edit page"]
    Route["API route at /api/trpc<br/>tRPC fetch adapter"]
    Router["tRPC router<br/>input validation, error translation"]
    Service["Task service<br/>rules, ordering, cursor"]
    Repository["TaskRepository interface"]
    Memory["InMemoryTaskRepository<br/>one instance per process"]
  end
  Pages -- "in-process call" --> Router
  Pages -- "HTML and query cache" --> Client
  Client -- "tRPC client over HTTP" --> Route
  Route --> Router
  Router --> Service
  Service --> Repository
  Repository --> Memory
```

## Requirements

Every requirement and bonus of the brief, and where it is met.

| Brief                                 | Where it is met                                                                                                                                                                                                                                                                                                                                                                                               |
| ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Project setup: Next.js 15, tRPC       | [`package.json`](package.json), [`src/server/trpc/init.ts`](src/server/trpc/init.ts), [`src/app/api/trpc/[trpc]/route.ts`](src/app/api/trpc/[trpc]/route.ts), [ADR 0001](docs/adr/0001-next-15-instead-of-16.md)                                                                                                                                                                                              |
| Task model                            | [`src/server/tasks/task.ts`](src/server/tasks/task.ts), field names mapped below                                                                                                                                                                                                                                                                                                                              |
| Tasks kept in memory                  | [`src/server/tasks/in-memory-task-repository.ts`](src/server/tasks/in-memory-task-repository.ts), [`src/server/tasks/task-store.ts`](src/server/tasks/task-store.ts), [ADR 0005](docs/adr/0005-tasks-live-in-one-node-process.md)                                                                                                                                                                             |
| Create a task                         | `task.create` in [`src/server/trpc/task-router.ts`](src/server/trpc/task-router.ts), tested in [`create-task.test.ts`](src/server/tasks/create-task.test.ts) and [`task-router.create.test.ts`](src/server/trpc/task-router.create.test.ts)                                                                                                                                                                   |
| List the tasks                        | `task.list`, tested in [`list-tasks.test.ts`](src/server/tasks/list-tasks.test.ts) and [`task-router.list.test.ts`](src/server/trpc/task-router.list.test.ts)                                                                                                                                                                                                                                                 |
| Update a task                         | `task.update`, and `task.getById` to fill the edit page, tested in [`update-task.test.ts`](src/server/tasks/update-task.test.ts) and [`task-router.update.test.ts`](src/server/trpc/task-router.update.test.ts)                                                                                                                                                                                               |
| Delete a task                         | `task.delete`, tested in [`delete-task.test.ts`](src/server/tasks/delete-task.test.ts) and [`task-router.delete.test.ts`](src/server/trpc/task-router.delete.test.ts)                                                                                                                                                                                                                                         |
| Validation and meaningful errors      | Rules in [`src/server/tasks/task.ts`](src/server/tasks/task.ts), domain errors in [`errors.ts`](src/server/tasks/errors.ts), translation and formatting in [`init.ts`](src/server/trpc/init.ts), messages for people in [`describe-error.ts`](src/features/tasks/describe-error.ts)                                                                                                                           |
| Server-rendered task list             | [`src/app/page.tsx`](src/app/page.tsx), [`src/components/task-list.tsx`](src/components/task-list.tsx), [ADR 0004](docs/adr/0004-ssr-by-server-prefetch-and-hydration.md), tested in [`e2e/task-list.spec.ts`](e2e/task-list.spec.ts)                                                                                                                                                                         |
| Delete with feedback on the list      | [`delete-task-button.tsx`](src/features/tasks/delete-task-button.tsx), [`use-delete-task.ts`](src/features/tasks/use-delete-task.ts), tested in [`e2e/delete-task.spec.ts`](e2e/delete-task.spec.ts)                                                                                                                                                                                                          |
| Create and edit form with hooks       | [`task-form.tsx`](src/features/tasks/task-form.tsx) on react-hook-form with the server's Zod schema, checking each field as it is typed, used by [`create-task-form.tsx`](src/features/tasks/create-task-form.tsx) and [`edit-task-form.tsx`](src/features/tasks/edit-task-form.tsx), tested in [`task-form.test.tsx`](src/features/tasks/task-form.test.tsx)                                                 |
| Loading, success and failure states   | Skeleton rows, retry alert and end-of-list note in [`task-list.tsx`](src/components/task-list.tsx), spinner and form alert in [`task-form.tsx`](src/features/tasks/task-form.tsx), skeleton rows and a Save that waits with a spinner before hydration, toasts after each write, error screen in [`src/app/error.tsx`](src/app/error.tsx), not found page in [`src/app/not-found.tsx`](src/app/not-found.tsx) |
| Bonus: infinite scroll                | [`task-list.tsx`](src/components/task-list.tsx), cursor in [`cursor.ts`](src/server/tasks/cursor.ts), [ADR 0006](docs/adr/0006-cursor-pagination-for-the-task-list.md), tested in [`e2e/infinite-scroll.spec.ts`](e2e/infinite-scroll.spec.ts)                                                                                                                                                                |
| Bonus: documentation of the decisions | This README, [`GLOSSARY.md`](GLOSSARY.md), the records under [`docs/adr`](docs/adr)                                                                                                                                                                                                                                                                                                                           |

The brief names the task's fields in Portuguese. The code uses English names everywhere, in the domain, the tRPC contract and the interface ([ADR 0002](docs/adr/0002-english-field-names.md)):

| Brief         | Code          |
| ------------- | ------------- |
| `id`          | `id`          |
| `titulo`      | `title`       |
| `descricao`   | `description` |
| `dataCriacao` | `createdAt`   |

## Decisions

- [0001, Next.js 15 instead of 16](docs/adr/0001-next-15-instead-of-16.md): the brief pins version 15, so the project uses the newest 15.5 and the newest stable release of everything else.
- [0002, English field names](docs/adr/0002-english-field-names.md): `title`, `description` and `createdAt` instead of the brief's Portuguese names, with the mapping above.
- [0003, A task service over a repository interface](docs/adr/0003-task-service-over-a-repository.md): the rules live in a module with no framework in it, and storage sits behind an interface that a database could implement.
- [0004, Server prefetch and hydration](docs/adr/0004-ssr-by-server-prefetch-and-hydration.md): the list page renders on every request, prefetches the first page into the query cache and hands it to the client's infinite query.
- [0005, Tasks live in one Node process](docs/adr/0005-tasks-live-in-one-node-process.md): the application runs with `next dev` or `next start` on one machine, and tasks are lost on restart.
- [0006, Cursor pagination](docs/adr/0006-cursor-pagination-for-the-task-list.md): pages continue from the creation date and id of the last task shown, so deleting or creating a task while scrolling never skips or repeats one.

## Testing

`pnpm test` runs the first three seams with Vitest, and `pnpm test:e2e` runs the fourth with Playwright. Each behaviour is tested at the one seam that can show it, and every service, router and form test starts from its own empty repository with the sample tasks off.

- **The task service over a fresh in-memory repository** ([`src/server/tasks/*.test.ts`](src/server/tasks)). The rules: trimming, the length limits, an empty description stored as absent, the server owning `id` and `createdAt`, newest-first order with the id breaking ties, and "not found" on get, update and delete. Pagination in depth, including a task deleted or created between two pages. The list tests are written against the repository interface, so a database implementation can run the same suite.
- **The tRPC router with no HTTP server** ([`src/server/trpc/*.test.ts`](src/server/trpc)). The contract: each procedure's happy path, `BAD_REQUEST` for invalid input and a malformed cursor, `NOT_FOUND` for an unknown id. Some tests send a `Request` through the fetch adapter, because only the wire shows that dates survive serialization, that validation messages arrive grouped by field and that an unexpected error carries no internal detail.
- **The form in a test DOM** ([`task-form.test.tsx`](src/features/tasks/task-form.test.tsx), with [`describe-error.test.ts`](src/features/tasks/describe-error.test.ts)). An empty title shows its message and sends nothing, a title past 120 characters shows its message as it is typed, a valid submit saves once with trimmed values, a pending save disables the button, server field errors land on their fields, and edit mode starts with the task's values.
- **The running application in a browser** ([`e2e`](e2e)). The first response holds the tasks in its markup and is not a static page, scrolling loads more tasks, create and edit return to the list with a confirmation, delete removes the row at once and a failed delete brings it back, and an unknown edit address answers 404. Before its scripts load, the list already ends in placeholder rows and Save can't be pressed. Saving a task doesn't make the rows jump. A long one-word title wraps in its row and in the delete dialog. An offline load shows the alert, and Retry loads the page. The theme toggle answers a second click during its fade. Every spec fails on a console error or page error it did not cause on purpose.

## Performance

I measured the production build on one laptop, so no number includes a real network. Both pages draw in about 0.2 s on desktop and 0.8 s on an emulated phone, and nothing moves after they draw. On that phone the list page answers a click at about 2.5 s. Until then the list ends in grey placeholder rows, and Save shows a spinner instead of looking ready. A list request takes about 2 ms with up to 10,000 tasks and about 6 ms with 100,000, because each request copies and filters every task.

The tables, the method and the commands that reproduce them are in [`docs/performance.md`](docs/performance.md).

## Limits and next steps

Tasks live in the memory of one Node process ([ADR 0005](docs/adr/0005-tasks-live-in-one-node-process.md)). Every task is lost when the server restarts, and the application can't run on more than one process: on a serverless platform each instance would hold its own list. That is why there is no hosted demo.

For production I would change these things, roughly in this order:

- Put a database behind the `TaskRepository` interface. That is one new class, and the service, the router and the list tests stay as they are.
- Add authentication, so each person sees only their own tasks. The request's user goes into the tRPC context, a protected procedure refuses calls that have no user, and every task gets an owner that the repository filters by.
- Add rate limiting on the API route.
- Do the rest of the hardening a public API needs: CORS rules, limits on request size, and logging and monitoring that go somewhere other than the console.

Two other changes the structure already allows for:

- A new field, say a due date, goes into the schema in `task.ts`, the task the repository stores, and the form. The types are shared from the server to the browser, so the compiler points at every place that has to change.
- A client that isn't TypeScript, like a mobile app in another language, can't use tRPC. The rules don't live in the router, so a REST layer can sit beside it and call the same task service.

Two smaller things I know about:

- When the connection comes back, nothing reloads by itself. The alert stays until you press Retry.
- Rarely, the list page logs a hydration error, React error 418, on its first load. I saw it a handful of times in several hundred local runs, mostly with the machine under heavy load, and never in continuous integration. I have not found the cause.

## How this was built

I started with a design interview against the brief. It produced the [glossary](GLOSSARY.md) and the [decision records](docs/adr). From those I wrote the spec, which is [issue #1](../../issues/1). I split the work into tickets, each a sub-issue of the spec with its own verify gate, the commands that must pass before the ticket lands. A coding agent built each ticket in its own git worktree, and [pull request #15](../../pull/15) brought them together.

Every pull request gets a review by models, and I check each finding by hand before anything merges.

Then I tested the application by hand, and that found things the tests and the reviews had not. On a throttled connection I could read the page long before it answered a click, which led to the fixes in [#18](../../pull/18). The first interface was plainer than I wanted, so [#19](../../pull/19) reworks every screen after one reference. [#20](../../pull/20) adds the [performance numbers](docs/performance.md). Before those merged, a visual sweep compared the old version and the new one screenshot by screenshot. It caught two regressions that every passing test had missed.
