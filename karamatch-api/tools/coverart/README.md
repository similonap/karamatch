# Cover art

Adds a `coverArt` thumbnail URL to every song in `data/songs.json` that can be
resolved to a MusicBrainz release.

## Why not just call the API

The catalog is 84,104 songs. MusicBrainz's `/ws/2` web service is rate limited
to **1 request/second**, so resolving the catalog over the API is a ~23 hour
crawl — and it has to be repeated every time the catalog changes. The database
dumps turn that into a one-off download and a local SQL join that runs in
minutes.

Worth knowing: the rate limit is on `musicbrainz.org/ws/2` only.
`coverartarchive.org` image URLs are **not** rate limited, which is why the
output can be a plain URL that the app loads directly.

## What the dumps actually contain

MusicBrainz ships no images. Two separate dumps are needed:

| Dump | Size | Gives us |
|---|---|---|
| `mbdump.tar.bz2` | 6.9 GiB | `recording` → `track` → `medium` → `release`, i.e. which releases a song appears on, and each release's MBID |
| `mbdump-cover-art-archive.tar.bz2` | 0.15 GiB | which releases have a **front** cover, and its cover id |

Given a release MBID and a cover id, the image URL is pure string construction:

```
https://coverartarchive.org/release/{release-mbid}/{cover-id}-500.jpg
```

So the pipeline makes **zero** API calls — to MusicBrainz or to the CAA.

## Running it

```bash
./tools/coverart/01-extract.sh          # download + slim the dumps  (~30 min)
./tools/coverart/02-load.sh             # Postgres load + match      (~20 min)
npx ts-node tools/coverart/mergeCoverArt.ts
```

Then re-seed so Mongo picks the art up — `seedSongs()` only runs on an empty
collection:

```js
db.songs.drop()
```

### You probably only need step 3

`coverart.tsv` is **committed**. Steps 1 and 2 exist to regenerate it against a
newer dump; day to day, and for anyone else on the project, only
`mergeCoverArt.ts` needs running. In particular, re-run it after
`tools/importCatalog.ts`, which rewrites `songs.json` from the CSV and would
otherwise drop the `coverArt` fields.

## Notes

- **No new npm dependencies.** Postgres runs in Docker and all the matching is
  SQL driven through `docker exec psql`; the only TypeScript is dependency-free
  file munging. The app itself is untouched and stays on MongoDB.
- Requires Docker and ~30 GB of free disk while running. Clean up with:
  ```bash
  docker rm -f karamatch-mb && rm -rf ~/.karamatch-mbdump
  ```
- The dump is pinned to a specific twice-weekly export so re-runs are
  reproducible. `MB_EXPORT=latest ./tools/coverart/01-extract.sh` picks up a
  newer one.
- Matching is deterministic: same dump in, byte-identical `coverart.tsv` out.

## How the matching works

Karafun and MusicBrainz disagree on punctuation, accents, case and trailing
qualifiers, so nothing joins on raw strings. `03-match.sql` normalises both
sides through the *same* SQL functions — lowercase, strip accents, drop a
trailing `(Live)` / `[Remastered]` / `(2019 Version)`, drop `feat.` tails from
artists, and reduce everything else to single-spaced alphanumerics.

Where a song appears on several releases with cover art, the tie is broken in
this order:

1. official status over bootleg/promo
2. album over single/compilation
3. lowest release id (arbitrary, but deterministic)

## Result

**83.0%** — 69,843 of 84,104 songs, and 939 of the 1,110 curated songs.

Verified after the run: 20/20 randomly sampled URLs return HTTP 200, the merge
is idempotent (byte-identical `songs.json` on a second run), and the full test
suite (145 tests) passes.

### Expected misses

Most of the remaining 17% is not fixable, because the entries are not really
recordings by an artist. The biggest miss groups are:

| Miss group | Example |
|---|---|
| Films/musicals credited as the work | `The Little Mermaid (2023 film)`, `Frozen 2`, `Hadestown (musical)` |
| TV cast recordings | `Glee` (202), `Smash` |
| Tribute / cover acts | `Postmodern Jukebox` (120), `DisCovers` |
| Medleys and anthems | `Medley Rock Français`, `O Canada` |
| Regional artists thin in MB | `Banda MS`, `Nathan Carter`, `Joan Sebastian` |

None of these have a MusicBrainz recording to hang a cover on. They keep no
`coverArt` key at all (rather than `null`), so the absence reads the same as it
did before this pipeline existed.

### Known gap: artist aliases

A genuinely fixable slice is artists MusicBrainz files under a different name
than Karafun: `Pink` vs MB's `P!nk` (97 songs), `Lady A` vs `Lady Antebellum`
(60). Normalisation cannot bridge these — they are different strings, not
different punctuation.

Fixing it properly means importing MusicBrainz's `artist`, `artist_alias` and
`artist_credit_name` tables and matching through the alias list. That is another
extraction pass and a rewrite of `ac_match` for an estimated 1-3% gain, so it is
deliberately left undone. Start there if coverage ever needs to go higher.
