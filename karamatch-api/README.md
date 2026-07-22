# KaraMatch API

Express + TypeScript + MongoDB backend for the KaraMatch student project. See
`../API-PROPOSAL.md` for the full design and endpoint reference.

## Status

Working: **auth** and the **sparse, on-demand world generation** (proposal §2). Wherever
a user drops their pin, the first `GET /venues`, `GET /venues/:id/slots`, `GET /parties/open`,
`GET /notifications` or `GET /parties/mine` generates and persists venues, hourly slots,
NPC singers, open parties, a pending invite and one past party around that location — after
which the world is stable for everyone (delete the db and it regrows elsewhere).
NPC singers also show up in the people search (`GET /users?q=`).

Also working: the **party chat** (`GET`/`POST /parties/:id/messages`, members only, polled by
the client) — NPC members answer with a canned reply now and then, so the chat feels alive.

And **booking & payment** (simulated — always succeeds): `POST /parties` books a free slot
as a `pending_payment` party (400 if the slot is taken, or if the required `title` is empty
or longer than 60 characters); the host's `POST /parties/:id/pay`
confirms it (party `upcoming`, slot `booked`). `POST /parties/:id/join` reserves a spot on a
public party and returns your share, which you then pay on the same `/pay` endpoint.
Invites work the same way: `POST /notifications/:id/accept` reserves the spot and hands
back `{ partyId, share }` for `/pay`; `decline` returns 204.

And **matchmaking** (`GET /parties/matches?distance=&minOverlap=`): the same nearby joinable
parties as `/parties/open`, scored against your taste and sorted by `matchPct` —
`round(100 * (0.6 * songOverlap + 0.4 * genreAffinity))`, where `songOverlap` is
`|mine ∩ host| / min(|mine|, |host|)` and `genreAffinity` the cosine similarity of the two
genre profiles. Each match carries up to 3 `commonSongs` titles and the party's genre;
`minOverlap` drops matches below that percentage. Because the curated pool is
genre-discriminative (see [The song catalog](#the-song-catalog)), you can match with
someone who sings *other* rock anthems.

And the rest of the party lifecycle — the **full endpoint surface from the proposal is now
implemented**, nothing is stubbed:

- **Party room** (`GET /parties/:id`, members only): venue/room/start, members with their
  host/paid tags, invited usernames, spots left and your share.
- **Host controls** (`PATCH /parties/:id`, host only): toggle `openToPublic`.
- **Invites** (`POST /parties/:id/invites`, host only): `{ usernames: [...] }` or
  `{ target: "@user" | "email" }` → pending notifications for the invitees; 400 when the
  party is full or nobody matches.
- **Crew & ratings** (`GET /parties/:id/crew`, `POST /parties/:id/ratings`, ended parties
  only): rate your fellow singers 1–5 stars; each rated user's `singerRating` is
  recomputed as the average of all stars they ever received, and the party flips to
  `rated: true` under `GET /parties/mine`.
- **Venue reviews** (`GET /venues/:id/reviews`, `POST /parties/:id/venue-review`, ended
  parties only): rate the place 1–5 stars with an optional line of text. A venue has no
  stored rating — `rating` and `reviewsCount` on `GET /venues` and `GET /venues/:id` are
  averaged from its reviews on every read, so a posted review moves it straight away.
- **Songs & profile**: `GET /songs` without a query returns a genre-interleaved
  discovery list; `GET /songs?q=` searches the full catalog; `GET /me` expands your
  favourite songs and includes your genre profile.

## The song catalog

The database holds the **entire karafun catalog — 84,104 songs**, so a search finds
whatever you actually want to sing. But only ~1,100 of them are marked `curated`, and
that distinction is what keeps matchmaking working:

- `GET /songs` (no query) and every NPC's taste are drawn from the **curated pool only**.
  Matching scores singers on shared favourites, and two people picking 5 songs each out
  of 84k would never overlap — the Match tab would show 0% forever. Within the curated
  pool, two singers of the same genre share a favourite **~44%** of the time, against
  ~1% across genres, so the score means something in both directions.
- `GET /songs?q=` searches **all 84k**, capped at 50 results.

The pool is 30 songs per style tag, chosen by `tools/importCatalog.ts`:

```bash
npx ts-node tools/importCatalog.ts     # karafuncatalog.csv -> data/songs.json
```

It prefers songs carrying **3+ style tags**, then the earliest additions to the catalog
(karafun added the big hits first, which is the closest thing to a popularity signal the
CSV carries). The multi-tag rule matters more than it looks: half of `matchPct` is the
cosine similarity of two genre profiles, and those profiles are built from the tags of
your favourites — a pool of singly-tagged songs gives everyone a thin, disjoint profile
and every cross-genre match rounds to zero.

`data/songs.json` is committed, so `npm start` needs no extra step; re-run the tool only
when the CSV changes. Seeding inserts it in batches of 5,000, and the curated pool is
read into memory once per process (never per request, and never per generated NPC).

## Cover art

**83.0%** of the catalog (69,843 of 84,104 songs, and 939 of the 1,110 curated) carries a
`coverArt` thumbnail URL from the [Cover Art Archive](https://coverartarchive.org):

```json
{ "id": "49375", "title": "Tennessee Whiskey", "artist": "Chris Stapleton",
  "coverArt": "https://coverartarchive.org/release/427ca738-.../44400368287-500.jpg" }
```

Songs that could not be resolved simply have no `coverArt` key, so clients should treat it
as optional.

These are resolved offline against the **MusicBrainz database dumps** rather than its web
service — `/ws/2` allows 1 request/second, which would make 84k lookups a ~23 hour crawl,
repeated on every catalog change. See `tools/coverart/` for the pipeline and
`tools/coverart/README.md` for the runbook. It adds no npm dependencies (Postgres is
Docker-only, at build time) and the resolved `coverart.tsv` is committed, so the usual
case is one command:

```bash
npx ts-node tools/coverart/mergeCoverArt.ts   # re-run after importCatalog.ts
```

## The world model, briefly

- The map is a grid of ~1.1 km cells (`floor(lat/0.01) + ":" + floor(lng/0.01)`). The
  first query covering a cell rolls 0–2 venues into it and marks the cell generated —
  never regenerated, so every user sees the same world. If fewer than 4 venues land in
  the requested radius, extras are force-placed so the Venues tab is never empty.
- Slots are 1-hour evening sessions (18:00–02:00 local), always in the future — hours
  before "now" are skipped. Querying a range where a room has fewer than 4 free slots
  materializes the missing hours (some pre-booked). Default range is tonight → +7 days,
  for both `GET /venues/:id/slots` and `GET /parties/open`.
- On an empty database (first `connect()`, or after `POST /dev/reset`) the seed runs those
  generators once around **51.231° N, 4.418° E** (Antwerp, 3 km): venues with rooms, a
  week of slots, NPC singers and 8 open parties — so the app has a populated world before
  the first pin is dropped. Constants live at the top of the seed section in `database.ts`.
- `GET /parties/open` guarantees ≥ 3 joinable NPC-hosted parties nearby; NPC hosts get
  genre-coherent favourite songs, and occasionally invite you (see `GET /notifications`,
  which guarantees at least one pending invite on first call).
- `GET /parties/mine` backfills one ended, unrated party from last week so the rating flow
  is testable — a demo affordance, marked as such in `database.ts`.
- A generated venue is seeded with 3–8 made-up reviews by NPC singers, skewed high, so it
  arrives with a plausible rating instead of none. Every party that ends queues a review
  notification (`kind: "review"`) for each real member, which they either answer through
  `POST /parties/:id/venue-review` or dismiss with `POST /notifications/:id/decline`.

All generation lives in the `ensure…` functions in `database.ts`; the name/NPC/title
pools and random helpers are pure functions in `generators.ts`.

## Setup

1. Have a MongoDB instance running (local `mongod`, Docker, or Atlas).
2. Copy `.env.example` to `.env` and adjust `MONGODB_URI` if needed.
3. `npm install`
4. `npm start` — runs on `http://localhost:3000` by default.

On first connect, the database is seeded with the full song catalog (84k songs, a couple
of seconds) and one demo account:

- username: `alexsings`
- password: `karamatch`

## Reset the database

Either drop the `karamatch` database yourself, or call:

```
POST /api/dev/reset
```

## Auth flow

```
POST /api/auth/register   { name, username, email, password } -> { user, token }
POST /api/auth/login      { login, password }                 -> { user, token }
```

`login` accepts either an email or a username. All other endpoints require:

```
Authorization: Bearer <token>
```

## Testing

`npm test` runs Jest + supertest against the exported `app` (see `app.test.ts`).
