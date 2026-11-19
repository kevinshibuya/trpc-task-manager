---
status: accepted
date: 2026-11-18
---

# The task list is server-rendered by prefetching the query and hydrating it

The brief asks for server-side rendering on the task list, and the bonus asks for infinite scroll on the same page. The first needs the server to render the tasks. The second needs the browser to keep fetching.

The project uses the App Router. The list page is a Server Component that calls the tRPC router in-process, with no HTTP round trip, prefetches the first page of the infinite query and sends the query cache to the browser along with the HTML. The client component reads that cache, renders without a loading state and asks for the next pages through the same query.

The page also opts into dynamic rendering. In the App Router a route that reads nothing from the request is prerendered at build time, when the in-memory list is empty, and that HTML would be served forever. That would be static generation, not SSR.

Writes go through the tRPC client, not Server Actions, because the brief asks for the CRUD operations to be exposed via tRPC.

The server HTML can be read before its JavaScript has loaded, and on a slow connection that gap lasts seconds. When another page exists, the list ends with skeleton rows in the server HTML, so scrolling to the end in that gap shows that more is coming, and the next page loads as soon as the page hydrates. The form's Save button is disabled until hydration, because before it the browser would submit the form itself, reloading the page with the text in the address and saving nothing. Links and the other buttons stay as they are.

## Considered options

- **Pages Router with `getServerSideProps`.** The most literal reading of "SSR". Rejected because the App Router is the default of current Next.js and the brief asks for the most recent versions.
- **Server Component rendering the list alone, with a separate client query for more pages.** Rejected because the first page would exist twice, once as server props and once in the query cache, and a delete would have to update both.
