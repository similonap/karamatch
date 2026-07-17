# KaraMatch API

Express + TypeScript + MongoDB backend for the KaraMatch student project. See
`../API-PROPOSAL.md` for the full design and endpoint reference.

## Status

Working: **auth** and the **sparse, on-demand world generation** (proposal §2). Wherever
a user drops their pin, the first `GET /venues`, `GET /venues/:id/slots`, `GET /boxes/open`,
`GET /notifications` or `GET /boxes/mine` generates and persists venues, hourly slots,
NPC singers, open boxes, a pending invite and one past box around that location — after
which the world is stable for everyone (delete the db and it regrows elsewhere).
NPC singers also show up in the people search (`GET /users?q=`).

Also working: the **box chat** (`GET`/`POST /boxes/:id/messages`, members only, polled by
the client) — NPC members answer with a canned reply now and then, so the chat feels alive.

And **booking & payment** (simulated — always succeeds): `POST /boxes` books a free slot
as a `pending_payment` box (400 if the slot is taken); the host's `POST /boxes/:id/pay`
confirms it (box `upcoming`, slot `booked`). `POST /boxes/:id/join` reserves a spot on a
public box and returns your share, which you then pay on the same `/pay` endpoint.
Invites work the same way: `POST /notifications/:id/accept` reserves the spot and hands
back `{ boxId, share }` for `/pay`; `decline` returns 204.

And **matchmaking** (`GET /boxes/matches?distance=&minOverlap=`): the same nearby joinable
boxes as `/boxes/open`, scored against your taste and sorted by `matchPct` —
`round(100 * (0.6 * songOverlap + 0.4 * genreAffinity))`, where `songOverlap` is
`|mine ∩ host| / min(|mine|, |host|)` and `genreAffinity` the cosine similarity of the two
genre profiles. Each match carries up to 3 `commonSongs` titles and the box's genre;
`minOverlap` drops matches below that percentage. Because the catalog is
genre-discriminative, you can match with someone who sings *other* rock anthems.

And the rest of the box lifecycle — the **full endpoint surface from the proposal is now
implemented**, nothing is stubbed:

- **Box room** (`GET /boxes/:id`, members only): venue/room/start, members with their
  host/paid tags, invited usernames, spots left and your share.
- **Host controls** (`PATCH /boxes/:id`, host only): toggle `openToPublic`.
- **Invites** (`POST /boxes/:id/invites`, host only): `{ usernames: [...] }` or
  `{ target: "@user" | "email" }` → pending notifications for the invitees; 400 when the
  box is full or nobody matches.
- **Crew & ratings** (`GET /boxes/:id/crew`, `POST /boxes/:id/ratings`, ended boxes
  only): rate your fellow singers 1–5 stars; each rated user's `singerRating` is
  recomputed as the average of all stars they ever received, and the box flips to
  `rated: true` under `GET /boxes/mine`.
- **Songs & profile**: `GET /songs` without a query returns a genre-interleaved
  discovery list (a spread across all 8 genres); `GET /me` expands your favourite songs
  and includes your genre profile.

## The world model, briefly

- The map is a grid of ~1.1 km cells (`floor(lat/0.01) + ":" + floor(lng/0.01)`). The
  first query covering a cell rolls 0–2 venues into it and marks the cell generated —
  never regenerated, so every user sees the same world. If fewer than 4 venues land in
  the requested radius, extras are force-placed so the Venues tab is never empty.
- Slots are 1-hour evening sessions (18:00–02:00 local). Querying a range where a room
  has fewer than 4 free slots materializes the missing hours (some pre-booked).
- `GET /boxes/open` guarantees ≥ 3 joinable NPC-hosted boxes nearby; NPC hosts get
  genre-coherent favourite songs, and occasionally invite you (see `GET /notifications`,
  which guarantees at least one pending invite on first call).
- `GET /boxes/mine` backfills one ended, unrated box from last week so the rating flow
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
