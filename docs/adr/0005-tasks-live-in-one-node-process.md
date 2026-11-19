---
status: accepted
date: 2026-11-18
---

# Tasks live in the memory of one Node process

The brief asks for the task list to be kept in memory, with no database. Memory belongs to a process, so this choice limits where the application can run.

The application targets a single long-lived Node process: `next dev` or `next start`. It has no hosted demo. On a serverless platform each function instance has its own memory and instances start and stop with traffic, so two requests could see two different lists and a task could vanish between a write and the next read.

## Consequences

Every task is lost when the process restarts. The project accepts that, since the brief asks for it. The first production step would be a database behind the repository interface (ADR 0003), which removes this limit without touching the service or the router.
