# KaraMatch API

Express + TypeScript + MongoDB backend for the KaraMatch student project. See
`../API-PROPOSAL.md` for the full design and endpoint reference.

## Status

This is the **base scaffold**: project structure, config, data model (`types.ts`) and a
working **username/password auth flow** against MongoDB. Venues, slots, boxes, matching,
friends and notifications are stubbed with dummy responses shaped like their final
contract — the sparse, location/time-based generation described in the proposal is not
implemented yet (see the `TODO` comments in `database.ts` and the routers).

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
