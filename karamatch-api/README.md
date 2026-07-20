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
`minOverlap` drops matches below that percentage. Because the catalog is
genre-discriminative, you can match with someone who sings *other* rock anthems.

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
- **Songs & profile**: `GET /songs` without a query returns a genre-interleaved
  discovery list (a spread across all 8 genres); `GET /me` expands your favourite songs
  and includes your genre profile.

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

All generation lives in the `ensure…` functions in `database.ts`; the name/NPC/title
pools and random helpers are pure functions in `generators.ts`.

## Setup

1. Have a MongoDB instance running (local `mongod`, Docker, or Atlas).
2. Copy `.env.example` to `.env` and adjust `MONGODB_URI` if needed.
3. `npm install`
4. `npm start` — runs on `http://localhost:3000` by default.

On first connect, the database is seeded with a small song catalog and one demo account:

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
