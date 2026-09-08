# Dashboard reliability and performance

The authenticated homepage contains working guide search, sorting, mutually exclusive status filters, pagination, edit/share/PDF/delete actions, account settings, sign-out and the Mac download link. Placeholder analytics, sparklines, notifications, language, folders and browser recording controls were removed from the active page.

The dashboard uses the additive `get_dashboard_page` RPC through `/api/dashboard`. It checks the authenticated user, applies search and sort before pagination, returns 25 guides and counts steps only for that page. The endpoint does not read or sign screenshots. The legacy tutorials API remains available to existing clients. A single share dialog is loaded on demand; editor links do not prefetch every guide. The annotation font loads only under the editor layout.

## Local measurement, 8 September 2026

Same local Supabase database, authenticated browser, 1,001 guides (1,000 temporary guides with one step each). Five warm API requests per endpoint; development server. This is a payload/work reduction measurement, not a production latency claim.

| Measurement | Previous `/api/tutorials` | New `/api/dashboard` |
| --- | ---: | ---: |
| Guides in initial response | 1,000 (truncated) | 25, with total 1,001 |
| JSON response bytes | 221,180 | 5,138 |
| Median warm request | 64 ms | 61 ms |

Initial JSON payload is **97.7% smaller**. Production build output also decreased dashboard first-load JavaScript from 152 to 147 kB. The old endpoint silently omitted guides beyond its 1,000-row cap; the new page can reach them through search and pagination. Temporary performance fixtures were removed after measurement.

## Regression checks

- `pnpm test:run` covers the authenticated API contract, bounded pagination and database failures.
- After `./scripts/dev-start.sh --local`, run the transaction-only SQL integration check:

```sh
docker exec -i supabase_db_captuto psql -v ON_ERROR_STOP=1 -U postgres -d postgres < scripts/check-dashboard-pages.sql
```

This checks sort-before-page, non-overlapping pages, search beyond the first page, literal wildcard handling, exclusive counters and cross-account isolation. All fixtures roll back.

Use `agent-browser` for localhost interaction checks: next page, title search, no results and reset, filters, share dialog, error/retry and 320px and 390px mobile layouts. An injected fetch failure must show an error and retry action, then recover when fetch is restored. Never interpret a database error as an empty library.

## Remaining measurement scope

Real recording latency, very long editor sessions and production network latency require separate representative workloads. These dashboard results do not establish their performance. The SQL still scans matching tutorial metadata to compute exact counters; it deliberately avoids the much larger step/image workload. Reassess indexed search or approximate counters if real accounts reach much larger libraries.
