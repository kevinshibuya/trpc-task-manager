# Performance

I measured the production build on an Apple M1 laptop on 19 November 2026, with Node 22.18, Chromium 159 and Lighthouse 13.6.0, which asks for Node 22.19 or later and printed that warning on every run. The server, the browser and curl ran on the same machine, so no number here includes a real network. The list page held the default 50 sample tasks unless a table says otherwise.

## Page metrics

Lighthouse ran five times for each page and configuration. Each row gives the median and the lowest and highest of the five runs. Lighthouse computes both configurations by simulation from an unthrottled page load, so the numbers estimate a slower device rather than record one.

Desktop, Lighthouse's desktop preset:

| Metric                   | `/` median | `/` range     | `/tasks/new` median | `/tasks/new` range |
| ------------------------ | ---------- | ------------- | ------------------- | ------------------ |
| Performance score        | 100        | 100 to 100    | 100                 | 100 to 100         |
| First contentful paint   | 212 ms     | 211 to 223 ms | 211 ms              | 209 to 217 ms      |
| Largest contentful paint | 212 ms     | 211 to 223 ms | 211 ms              | 209 to 217 ms      |
| Total blocking time      | 0 ms       | 0 to 8 ms     | 0 ms                | 0 to 0 ms          |
| Cumulative layout shift  | 0          | 0 to 0        | 0                   | 0 to 0             |
| Speed index              | 212 ms     | 211 to 231 ms | 211 ms              | 209 to 217 ms      |
| Time to interactive      | 212 ms     | 211 to 589 ms | 211 ms              | 209 to 217 ms      |

Mobile, Lighthouse's default emulation, which simulates a slow 4G connection with a 150 ms round trip and about 1.6 Mbit/s down, and slows the CPU four times:

| Metric                   | `/` median | `/` range         | `/tasks/new` median | `/tasks/new` range |
| ------------------------ | ---------- | ----------------- | ------------------- | ------------------ |
| Performance score        | 100        | 97 to 100         | 100                 | 99 to 100          |
| First contentful paint   | 759 ms     | 759 to 763 ms     | 767 ms              | 761 to 769 ms      |
| Largest contentful paint | 759 ms     | 759 to 763 ms     | 767 ms              | 761 to 769 ms      |
| Total blocking time      | 81 ms      | 42 to 194 ms      | 81 ms               | 79 to 118 ms       |
| Cumulative layout shift  | 0          | 0 to 0            | 0                   | 0 to 0             |
| Speed index              | 759 ms     | 759 to 763 ms     | 767 ms              | 761 to 769 ms      |
| Time to interactive      | 2,527 ms   | 2,449 to 2,653 ms | 2,699 ms            | 2,690 to 2,735 ms  |

## Script size

The build column is the "First Load JS" table that `pnpm build` prints. The other two columns add up the gzip-compressed bytes of every script the page's HTML loads, measured with curl, with the uncompressed size after it. The build's figure is its own estimate and counts fewer chunks than the HTML loads.

| Route        | First Load JS in the build | Sent by `pnpm start`        | Sent by `pnpm dev`            |
| ------------ | -------------------------- | --------------------------- | ----------------------------- |
| `/`          | 186 kB                     | 194 kB, 623 kB uncompressed | 3.82 MB, 16.1 MB uncompressed |
| `/tasks/new` | 198 kB                     | 237 kB, 764 kB uncompressed | 4.81 MB, 20.2 MB uncompressed |

After the list page loads, the browser also prefetches about 45 kB of scripts for the new task page, because the page links to it.

## Server

Each cell gives two runs, each on a freshly started server, as the median and then the 95th percentile of 100 sequential requests in milliseconds, after 20 warm-up requests. The last page is the one `nextCursor` reaches at the end of the list. To find it, the walk goes in pages of 100, the largest the API allows, and then in pages of 20. `SAMPLE_TASK_COUNT` has no upper limit. A page holds 20 tasks by default, so the HTML of `/` was 110 kB uncompressed at every count.

| Request                 | 50 tasks               | 1,000 tasks            | 10,000 tasks           | 100,000 tasks            |
| ----------------------- | ---------------------- | ---------------------- | ---------------------- | ------------------------ |
| List page `/`           | 8.5 / 10.9, 8.9 / 11.4 | 8.7 / 11.0, 8.7 / 12.1 | 9.3 / 10.6, 9.2 / 11.1 | 13.1 / 15.5, 12.5 / 14.5 |
| `task.list`, first page | 1.7 / 1.9, 1.8 / 2.2   | 2.2 / 4.0, 1.8 / 2.2   | 2.0 / 4.1, 2.1 / 2.4   | 5.9 / 7.4, 5.9 / 7.7     |
| `task.list`, last page  | 1.6 / 2.0, 1.7 / 1.9   | 1.9 / 2.1, 1.8 / 2.2   | 2.0 / 3.3, 2.0 / 2.3   | 4.7 / 5.5, 4.3 / 4.9     |

## What the numbers say

**The pages show fast.** Both draw in about 0.2 s on desktop and 0.8 s on the emulated phone, and nothing moves after it draws.

**The wait is for the scripts.** On the emulated phone the list page is readable at 0.8 s and answers a click at about 2.5 s. For close to 2 s you can read the tasks and the buttons don't work yet. Lighthouse counts about 0.9 s of script work on the main thread in that time. A long task is a stretch of work that blocks a click, and the parts of the long tasks beyond 50 ms add up to 42 to 194 ms.

**The server stays quick until the list gets very long.** Two runs put every median within 0.7 ms of each other, and the 95th percentile moved by up to 1.8 ms. Up to 10,000 tasks a list request takes about 2 ms. At 100,000 it takes about 6 ms. The cause is in `InMemoryTaskRepository.listPage`. On every request it copies all the tasks and filters them, then sorts the ones after the cursor. The first page sorts the whole list and takes 5.9 ms. The last page sorts about one page of tasks and takes 4.3 to 4.7 ms. That difference is the sort. A database with an index on the creation date and the id would read one page of rows and skip the rest.

**Don't judge speed with `pnpm dev`.** The README's Running section starts the development server, and it sends 3.82 MB of compressed scripts for the list page, about 20 times what the production build sends. Development bundles are not minified, carry React's development build and embed source maps, which are more than half the uncompressed bytes of the three largest chunks. Chrome DevTools' 3G preset downloads at about 400 kbit/s, so those scripts take about 76 s, against about 4 s for the production build. The HTML arrives long before the scripts do, so on a slow connection you can read the tasks well before the page answers a click. Use `pnpm build` and `pnpm start` to judge speed.

## Reproducing

Build, then start the production server on a free port with the number of sample tasks to measure:

```sh
pnpm build
SAMPLE_TASK_COUNT=50 pnpm start -p 3200
```

Lighthouse, five runs. Add `--preset=desktop` for the desktop configuration, and use `/tasks/new` for the form page. Lighthouse uses the installed Chrome, or the one `CHROME_PATH` names.

```sh
for i in 1 2 3 4 5; do
  pnpm dlx lighthouse@13.6.0 http://localhost:3200/ --only-categories=performance \
    --output=json --output-path=list-mobile-$i.json --chrome-flags="--headless=new --mute-audio"
done
```

Each report holds the score at `.categories.performance.score` and each metric at `.audits["<id>"].numericValue`, with the ids `first-contentful-paint`, `largest-contentful-paint`, `total-blocking-time`, `cumulative-layout-shift`, `speed-index`, `interactive` and `mainthread-work-breakdown`. This prints one metric's median and range over the five reports:

```sh
jq -s 'map(.audits["total-blocking-time"].numericValue) | sort | {min: .[0], median: .[2], max: .[4]}' list-mobile-*.json
```

Script size, the compressed and the uncompressed bytes of every script the HTML loads. Set `page=/tasks/new` for the form page, and point `url` at port 3000 to measure `pnpm dev`.

```sh
url=http://localhost:3200
page=/
curl -s "$url$page" | grep -oE '<script[^>]+src="[^"]+"[^>]*>' | grep -v noModule |
  grep -oE '/_next/[^"]+' | sed 's/&amp;/\&/g' | sort -u |
  while read -r src; do
    gz=$(curl -s -o /dev/null -H 'Accept-Encoding: gzip, deflate, br, zstd' -w '%{size_download}' "$url$src")
    raw=$(curl -s -o /dev/null -H 'Accept-Encoding: identity' -w '%{size_download}' "$url$src")
    echo "$gz $raw"
  done | awk '{ gz += $1; raw += $2 } END { print gz " compressed, " raw " uncompressed" }'
```

Server timings, with the server restarted at each `SAMPLE_TASK_COUNT`, twice. The loop that finds the last page needs `jq`.

```sh
url=http://localhost:3200
time_requests() {
  for i in $(seq 20); do curl -s -o /dev/null "$1"; done
  for i in $(seq 100); do curl -s -o /dev/null -w '%{time_total}\n' "$1"; done | sort -n |
    awk '{ t[NR] = $1 * 1000 } END { printf "median %.1f ms, p95 %.1f ms\n", (t[50] + t[51]) / 2, t[95] }'
}
time_requests "$url/"
time_requests "$url/api/trpc/task.list?input=%7B%22json%22%3A%7B%7D%7D"

api="$url/api/trpc/task.list"
cursor=""
for limit in 100 20; do
  while :; do
    input="{\"json\":{\"limit\":$limit${cursor:+,\"cursor\":\"$cursor\"}}}"
    next=$(curl -s -G "$api" --data-urlencode "input=$input" | jq -r '.result.data.json.nextCursor')
    [ "$next" = null ] && break
    cursor=$next
  done
done
time_requests "$api?input=$(jq -rn --arg c "$cursor" '{json: {cursor: $c}} | tojson | @uri')"
```
