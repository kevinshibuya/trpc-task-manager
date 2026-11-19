# Task manager

A small task manager on Next.js 15 and tRPC 11. Tasks live in the memory of the server process.

## Requirements

- Node 22 (see `.nvmrc`)
- pnpm, at the version pinned in `package.json` (`corepack enable` picks it up)

## Install and run

```sh
pnpm install
pnpm dev
```

The application runs at http://localhost:3000.

## Check and test

| Command             | What it does                                             |
| ------------------- | -------------------------------------------------------- |
| `pnpm typecheck`    | Type checks the project, no build needed                 |
| `pnpm lint`         | Runs ESLint                                              |
| `pnpm format:check` | Checks formatting with Prettier (`pnpm format` fixes it) |
| `pnpm test`         | Runs the unit, router and component tests once           |
| `pnpm build`        | Builds the production application                        |
| `pnpm test:e2e`     | Runs the browser tests against the production build      |

The browser tests need a build and Chromium:

```sh
pnpm exec playwright install chromium
pnpm build
pnpm test:e2e
```

They start the application on port 3100, or on the port in `E2E_PORT`, and stop it when they finish. They refuse to run if something already listens on that port.

Continuous integration runs every command above on each pull request.
