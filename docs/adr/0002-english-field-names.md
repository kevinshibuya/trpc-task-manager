---
status: accepted
date: 2026-11-18
---

# English field names for the task

The brief lists the task's fields as `id`, `titulo`, `descricao` and `dataCriacao`. The same hiring process asks for every deliverable in English, and the rest of the code is in English.

The task uses `id`, `title`, `description` and `createdAt` everywhere: the domain, the tRPC contract and the interface. One language across the codebase reads better than a model that switches language mid-identifier, as in `task.titulo`.

| Brief         | Code          |
| ------------- | ------------- |
| `id`          | `id`          |
| `titulo`      | `title`       |
| `descricao`   | `description` |
| `dataCriacao` | `createdAt`   |

## Considered options

Keeping the three Portuguese names on the task and English everywhere else follows the brief to the letter. It was rejected because the mixed naming would spread into every schema, form and test, and the mapping above costs one table.

## Consequences

A reader checking the brief field by field has to go through this table. The README repeats it for that reason.
