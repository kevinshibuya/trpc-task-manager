---
status: accepted
date: 2026-11-18
---

# Cursor pagination for the task list

The list page loads tasks in pages as the user scrolls, and the same page lets the user delete tasks while more pages are still to come.

The list endpoint returns tasks newest first and paginates with a cursor built from the last task's creation date and id. Each response carries the items and the cursor for the next page, or no cursor when the list is over. The id breaks ties between tasks created in the same millisecond.

## Considered options

**Offset and limit.** Simpler to write. Rejected because offsets count positions, and positions move when the list changes. Deleting a task from page one shifts every later task up, so the next page skips one. Creating a task shifts them down, so the next page repeats one. Infinite scroll with inline delete hits both cases in normal use.

## Consequences

The client can't jump to an arbitrary page, which infinite scroll never needs. The cursor is opaque to the client, so the sort key can change later without breaking callers.
