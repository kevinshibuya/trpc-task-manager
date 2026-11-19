---
status: accepted
date: 2026-11-18
---

# Next.js 15 instead of 16

The brief asks for "a Next.js (v15) application" and also for "the most recent versions". When it was written those were the same thing. Today `latest` on npm is 16.4 and the 15 line is still maintained at 15.5.

The project uses the newest 15.5 release, and the newest stable release of everything else: React 19, tRPC 11, TanStack Query 5, Zod 4, Tailwind CSS 4. The version number is the only explicit pin in the brief, so it wins over the general instruction.

## Consequences

Moving to 16 later is a dependency bump plus a review of the caching defaults. Next 16 can render dynamically by default when Cache Components is on, which would make the explicit dynamic rendering of the task list (ADR 0004) unnecessary.
