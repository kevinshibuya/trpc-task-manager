---
status: accepted
date: 2026-11-18
---

# A task service over a repository interface

The brief keeps tasks in memory and says a database is not needed, which makes the storage the one part of this system that would certainly change in a real product. It also hints that less is more.

The server side has three layers. A task module owns the schemas, the rules and the domain errors, and knows nothing about tRPC or Next.js. It reads and writes through a `TaskRepository` interface, with one in-memory implementation. The tRPC router is a thin transport on top: it validates input, calls the service and translates domain errors into tRPC errors.

## Considered options

- **Procedures that touch a store module directly.** The least code. Rejected because the rules would live inside transport code, tests would need tRPC to reach them, and replacing the store would mean editing every procedure.
- **A use-case class per operation, with mappers and a dependency injection container.** Rejected as ceremony. Five operations on one entity don't justify it, and the brief asks for something simple.

## Consequences

Replacing memory with a database means writing one new class that satisfies the interface. The same seam lets the tests run the service against a fresh repository with no HTTP and no framework.
