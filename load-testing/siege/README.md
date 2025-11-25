# Siege scenarios for deezeroom GraphQL API

All endpoints target the production GraphQL gateway at `https://deezeroom.expo.app/api/graphql`. Siege always needs an explicit content-type header for these JSON payloads:

```bash
siege -H 'Content-Type: application/json' -f load-testing/siege/popular-tracks.siege
```

## Scenario files

| File | Purpose |
| --- | --- |
| `popular-tracks.siege` | Hits `getPopularTracks` with default pagination (mirrors the home feed). |
| `search-mix.siege` | Mixes two paginated `searchTracks` queries and one `searchArtists` call to emulate user discovery. |
| `track-details.siege` | Sequentially fetches a track by ID and then the artist metadata via `artistsByIds`. |
| `full-schema.siege` | Single request that hits every resolver with the full selection set to stress GraphQL serialization. |

## Running examples

- Smoke test (`5 users`, `30 requests`):
  ```bash
  siege -c 5 -r 30 -H 'Content-Type: application/json' -f load-testing/siege/popular-tracks.siege
  ```
- Sustained search load for `3 minutes` with logs:
  ```bash
  siege -c 15 -t 3M -i \
    -H 'Content-Type: application/json' \
    -H 'Cache-Control: no-cache' -H 'Pragma: no-cache' \
    --log=siege-search.log -f load-testing/siege/search-mix.siege
  ```
- Detail page burst with delay between hits:
  ```bash
  siege -c 8 -d1 -t 2M -H 'Content-Type: application/json' \
    -f load-testing/siege/track-details.siege
  ```
- Full schema sweep (max fields per resolver, logs to disk):
  ```bash
  siege -c 10 -r 20 -H 'Content-Type: application/json' \
    --log=siege-full.log -f load-testing/siege/full-schema.siege
  ```

Always monitor GraphQL logs, Deezer API quotas, and Firebase usage while running these tests. Stop immediately if you start seeing elevated `4xx/5xx` responses or latency spikes.

### Cache-bypass tips
- `search-mix.siege` ships with multiple payload lines so `siege -i` randomly picks different queries per user, reducing CDN warmup effects.
- Adding `-H 'Cache-Control: no-cache' -H 'Pragma: no-cache'` forces the gateway to revalidate with the origin despite identical bodies.
- You can also mix additional per-query variations (different artists/tracks) inside any `.siege` file—Siege treats every line independently, so duplicates with unique payloads naturally spread the load.
