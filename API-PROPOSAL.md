# KaraMatch REST API — Proposal (v2)

A teacher-provided backend for the **KaraMatch** student project. Students build the app
from `karaoke-matchmaking-app-flow` against this API. The API is an Express + TypeScript
server backed by **MongoDB**, following the course conventions (CLAUDE.md) exactly.

The core idea of v2: **the world is generated sparsely, on demand, around each user's
location and time**. There is no fixed city, no zones, no pre-seeded venues. Wherever a
student drops their pin — Brussels, Hasselt, Tokyo — the API generates venues, singers,
open parties and bookable slots near them the first time they look, persists them to
MongoDB, and grows the world as they query further away or further into the future.

---

## 1. Scope — use cases from the design

Every screen in `KaraMatch.dc.html` maps to endpoints:

| Screen | Use case |
|---|---|
| Welcome / Sign in / Register | Account creation, login (email **or** username), fake "forgot password" |
| Location (Step 2) | Drop a pin → real `lat`/`lng` (+ optional display label) saved on the profile |
| Song taste (Step 3) | Search the curated song catalog, pick 3–10 favourites → genre profile |
| Venues tab | Venues **around your location within a given distance**, sorted by real distance |
| Venue detail / Booking | Rooms + prices, **bookable hourly slots in a time range**, total & per-person share |
| Payment | Simulated: host pays the full party, joiner pays their share |
| Open parties tab | Nearby public parties with free spots: host, members, spots open, your share, **Join** |
| Match tab | Nearby parties ranked by **song overlap + genre affinity** with your favourites |
| Party room | Members with host/paid/invited tags, spots left, group **chat**, host controls |
| Invite | Host invites by @username/email or friends list → invitee gets a **notification** |
| Notifications | List invites, **Accept (→ pay share)** / **Decline**, badge count |
| Friends tab | Friends list (singer rating, nights sung), people search, add friend |
| Mine tab | Upcoming parties + past parties |
| Rate & review | Rate past crew 1–5 stars + review → feeds each user's singer rating |
| Profile | Edit name/bio, manage favourite songs, upload profile photo |

---

## 2. Sparse, on-demand world generation

This is the heart of the API. Generation is **lazy, persistent, and idempotent**: nothing
exists until someone looks; once generated it is written to MongoDB and never regenerated,
so every user sees the same stable world.

### 2.1 Space — venues around you

- The map is divided into a simple grid of **cells** of ~0.01° (~1.1 km). Cell id =
  `floor(lat/0.01) + ":" + floor(lng/0.01)` — no geohash library, just arithmetic students
  can read.
- `GET /venues?distance=2` computes the bounding box around the caller's location, finds
  all cells it covers, and for every cell **not yet in the `cells` collection**:
  - rolls 0–2 venues at random positions inside the cell (name from pools:
    *Neon Note Karaoke*, *Echo Chamber*, *Big Mic Box Club*, *Velvet Verse Lounge*, … —
    adjective × noun combinations in the style of the design),
  - each venue gets 2–4 rooms (4–12 seats, €5/seat/h ± noise → the design's €20–€60/h
    range), a rating (4.0–4.9) and an "open until" time,
  - marks the cell as generated.
- If, after cell generation, fewer than **4 venues** fall inside the requested radius, it
  force-places venues inside the radius so the Venues tab is never empty — even in the
  countryside.
- Distance is computed with the **haversine formula** in TypeScript. MongoDB is queried
  with a plain bounding box (`lat: { $gte, $lte }, lng: { $gte, $lte }`) — only
  course-taught operators, no geo indexes.

### 2.2 Time — slots that grow on demand

- Bookable slots live in their own `slots` collection:
  `{ venueId, roomId, start, end, status: "available" | "booked" }` — 1-hour sessions,
  evening hours (18:00–02:00), real ISO datetimes (no more "Today 21:00" strings; the
  client formats them).
- `GET /venues/:id/slots?from=…&to=…` checks the requested range: if a room has **fewer
  than 4 free slots** in that range, the API generates the missing hourly slots (some
  randomly pre-marked "booked" so availability looks organic) and persists them.
- Query next week, next month — the calendar simply materializes as students look at it.

### 2.3 People & parties — NPCs near you

- When `GET /parties/open` or `GET /parties/matches` finds fewer than **3 joinable public
  parties** near the caller in the requested time window (default: now → +7 days), it
  generates more:
  - an **NPC host** (generated user: name/username pools in the design's style —
    *yuki_sings*, *marco.b*, *tom_falsetto* — singer rating, nights count, location near
    the venue, and a **genre-coherent** set of favourite songs),
  - a nearby venue + free slot (reusing 2.1/2.2), a genre-flavoured title (*Rock Legends
    Only*, *Pop Anthems Night*, *Ballads & Feels*, *K-pop & J-pop Party*, …),
  - 1 to capacity−2 NPC members, so there are always spots open.
- NPC favourite songs are sampled mostly from one genre with a little bleed-over, so the
  **Match tab shows a natural spread** of high/medium/low percentages against any real
  user's taste.
- NPCs also feed the **Friends search** (there are always people to find and add) and the
  **crew of past parties** (see 2.5).
- Party generation occasionally creates an **invite notification** to nearby real users
  whose taste overlaps the party — and `GET /notifications` guarantees at least one pending
  invite the first time it's called, so the notification flow is always demoable.

### 2.4 Idempotence & fairness

- Generation happens **inside `database.ts`** (an `ensure…` layer: `ensureVenuesNear`,
  `ensureSlots`, `ensureOpenPartiesNear`), never in routes. Reads that trigger generation
  are still plain `GET`s from the client's point of view.
- Everything generated is persisted immediately; two students querying the same street
  see the same venues, parties and hosts.

### 2.5 Past generation (for the rating flow)

Time-sparseness works backwards too: the first time a user calls `GET /parties/mine` with no
history, the API backfills **one ended, unrated party from last week** (NPC crew, real
venue nearby). This keeps the *Mine → PAST → Rate your crew* screen testable without
waiting for a real booking to pass. Clearly marked in the code as a demo affordance.

---

## 3. The song catalog — tactically curated for genre discovery

Not a "database of all songs". The catalog is a **deliberately small, curated set (~56
songs: 8 genres × 7 songs)** designed so that a user's 3–10 picks *reveal their genre
profile*:

- Genres: **rock, pop, power-ballad (80s), k-pop/j-pop, soul/R&B, hip-hop/party, country,
  musical/disney**.
- Every song is a karaoke-famous, **unambiguous representative of exactly one genre**
  (Bohemian Rhapsody → rock, Dancing Queen → pop, Total Eclipse of the Heart →
  power-ballad, Idol → k-pop/j-pop, …). Crossover songs that straddle genres are
  deliberately excluded — each pick is a clean signal.
- Songs are stored as `{ id, title, artist, genre }`. `GET /songs` with no query returns a
  **genre-interleaved list** (a spread across all 8 genres) so the picker itself nudges
  users past their bubble; `?q=` searches title/artist.
- A user's **genre profile** = the distribution of genres over their favourite songs,
  computed on the fly. NPC hosts are generated *from* a genre profile; matching compares
  profiles (see §5).

---

## 4. Tech, conventions & data model

Fully aligned with CLAUDE.md — the v1 "no MongoDB" deviation is gone:

- **MongoDB via the raw `mongodb` driver.** All database code in `database.ts`: exported
  `client`, exported typed `Collection<T>` constants, `connect()` (connect → seed → log →
  SIGINT), `seed()` (only when empty), `exit()`. Routes import exported functions only.
- `MONGODB_URI` + `PORT` from `.env` via `dotenv`, never hardcoded. Database name:
  `karamatch`.
- **Reset**: drop the `karamatch` database (one line in `mongosh`/Compass) or call
  `POST /api/dev/reset`, which drops all collections and reseeds. Same "delete it and it
  regrows" property as before — and since the world is generated on demand, reseeding is
  tiny (just the song catalog + demo account).
- TypeScript, double quotes, `app.set("port")`, body parsers up top, 404 handler last,
  `app.ts` exports the app / `index.ts` listens (supertest-ready), status codes from the
  course list only (200, 201, 204, 400, 401, 403, 404).
- Pure JSON API (`res.json`), simple hand-written CORS middleware, **multer** for the
  profile photo (`public/uploads`, served by `express.static`).
- **Auth**: course-style `verifyAuthToken` middleware; `register`/`login` return
  `{ user, token }`; token is a random string stored on the user (no JWT/bcrypt — plain
  passwords, it's a teaching mock). Protected routes read `Authorization: Bearer <token>`
  and put the user on `res.locals.user`.

### Project structure

```
karamatch-api/
├── index.ts                  # app.listen + connect()
├── app.ts                    # configured Express app (exported for tests)
├── database.ts               # ALL db access + the sparse-generation "ensure" layer
├── generators.ts             # name/title/NPC/venue pools & random helpers (pure functions)
├── types.ts                  # interfaces (_id?: ObjectId + numeric ids via getNextId)
├── .env                      # PORT=3000, MONGODB_URI=mongodb://localhost:27017
├── routers/
│   ├── auth.ts               # register / login / forgot / me / photo
│   ├── songs.ts              # curated catalog + search + genres
│   ├── venues.ts             # venues near you + detail + slots
│   ├── parties.ts              # book, open, matches, join, pay, room, chat, invites, ratings
│   ├── friends.ts            # friends, people search, add
│   └── notifications.ts      # invites: list / accept / decline
├── middleware/
│   ├── verifyAuthToken.ts
│   └── cors.ts
└── public/uploads/           # profile photos
```

### Collections & types (`types.ts`)

```typescript
export interface User {
    _id?: ObjectId; id: number;
    name: string; username: string; email: string;
    password: string; token: string | null;
    bio: string; photoUrl: string | null;
    location: { lat: number; lng: number; label: string } | null;
    favoriteSongIds: string[];       // 3–10
    singerRating: number; eventsCount: number;
    friendIds: number[];
    isNpc: boolean;                  // generated singer vs. real student account
}

export interface Song  { _id?: ObjectId; id: string; title: string; artist: string; genre: string; }
export interface Room  { id: string; name: string; seats: number; pricePerHour: number; }
export interface Venue {
    _id?: ObjectId; id: string; name: string;
    lat: number; lng: number; rating: number; openUntil: string;
    rooms: Room[];
}
export interface Cell  { _id?: ObjectId; id: string; generatedAt: string; }          // "5087:436"
export interface Slot  {
    _id?: ObjectId; id: string; venueId: string; roomId: string;
    start: string; end: string;                  // ISO datetimes, 1h sessions
    status: "available" | "booked";
}
export interface PartyMember { userId: number; role: "host" | "member"; paid: boolean; }
export interface Party {
    _id?: ObjectId; id: string;
    title: string; genre: string;
    venueId: string; roomId: string; slotId: string;
    seats: number;                               // seats in the room — the price is split over these
    capacity: number;                            // spots this party offers, host included (≤ seats)
    totalPrice: number; openToPublic: boolean;
    status: "pending_payment" | "upcoming" | "ended";
    members: PartyMember[]; invitedUsernames: string[];
}
export interface Message      { _id?: ObjectId; id: string; partyId: string; userId: number; text: string; sentAt: string; }
export interface Notification { _id?: ObjectId; id: string; toUserId: number; fromUserId: number; partyId: string; status: "pending" | "accepted" | "declined"; }
export interface Rating       { _id?: ObjectId; id: string; partyId: string; fromUserId: number; toUserId: number; stars: number; text: string; }
```

Derived, never stored: `share = round(totalPrice / seats)` (same rule as a room's
`pricePerSeat`), `spotsOpen`, `distanceKm`
(haversine), `matchPct`, genre profiles. `singerRating` is recomputed from `ratings` on
each new rating.

### Seed (tiny, by design)

`seed()` only inserts:
1. the **56-song curated catalog**, and
2. the demo account **`alexsings` / `karamatch`** (no location yet — first login walks
   through the pin-drop, and the world generates wherever the pin lands).

Everything else — venues, slots, NPCs, parties, notifications — comes from the sparse
generators at request time.

---

## 5. Matchmaking (simple but genre-aware)

Readable, two-part score computed in `database.ts`:

```
songOverlap  = |mine ∩ host| / min(|mine|, |host|)          // the prototype's formula
genreAffinity = cosine(genreProfile(mine), genreProfile(host))
matchPct      = round(100 * (0.6 * songOverlap + 0.4 * genreAffinity))
```

Because the catalog is genre-discriminative (§3), `genreAffinity` is meaningful even when
two singers share zero exact songs — you can match with someone who sings *other* rock
anthems. `GET /parties/matches` returns nearby joinable parties sorted by `matchPct` desc,
each with `commonSongs` (up to 3 titles) and the party's dominant genre; optional
`?minOverlap=60`. Deliberately simple enough for students to read and extend.

---

## 6. Endpoints (complete list)

All routes prefixed `/api`. 🔒 = requires `Authorization: Bearer <token>`.
Location-aware endpoints default to the stored profile location; `lat`/`lng` query
parameters override it. `distance` is in km (default 3, max 25).

### Auth & profile — `routers/auth.ts`
| Method & path | Purpose |
|---|---|
| `POST /auth/register` | `{ name, username, email, password }` → 201 `{ user, token }`; 400 on missing/invalid/duplicate |
| `POST /auth/login` | `{ login, password }` (email or username) → `{ user, token }`; 401 on bad credentials |
| `POST /auth/forgot` | `{ email }` → always 200 (fake) |
| 🔒 `GET /me` | Current user (sans password), favourite songs expanded, genre profile included |
| 🔒 `PUT /me` | `{ name?, bio?, favoriteSongIds? }` — enforces 3–10 songs |
| 🔒 `PUT /me/location` | `{ lat, lng, label? }` — label is the client's display string ("Shibuya, Tokyo") |
| 🔒 `POST /me/photo` | multer `upload.single("photo")` → `{ photoUrl }` |

### Songs — `routers/songs.ts`
| | |
|---|---|
| 🔒 `GET /songs?q=` | No query → genre-interleaved discovery list; with `q` → title/artist search |
| 🔒 `GET /genres` | The 8 genres with song counts |

### Venues & slots — `routers/venues.ts` *(sparse generation happens here)*
| | |
|---|---|
| 🔒 `GET /venues?distance=3` | **Search around your location.** Ensures venue density in the covered cells (generates + persists on first look), returns venues sorted by haversine distance with `distanceKm` and `fromPrice` |
| 🔒 `GET /venues/:id` | Venue detail incl. rooms; every room carries `pricePerSeat` (= the `share` a party in it charges) and `spotOptions` — each spots choice priced as `{ spots, share, hostPays }` — so clients never compute a price; 404 if unknown |
| 🔒 `GET /venues/:id/slots?from=&to=` | Free slots per room in the range (default: tonight → +3 days). **Generates more slots if a room has < 4 free in range** |

### Parties, booking & payment — `routers/parties.ts`
| | |
|---|---|
| 🔒 `POST /parties` | Host books: `{ venueId, roomId, slotId, title, spots? }` → 201 `pending_payment` party with `totalPrice` + `share`; `title` is **required** (trimmed, 1–60 chars) — only generated parties get an invented name; `spots` = seats offered to other singers (default `room.seats − 1`, so `capacity = spots + 1`), lower keeps seats free for guests the host brings and settles with themselves; 400 if slot taken, `title` empty or > 60 chars, or `spots` ∉ 1–(`seats`−1) |
| 🔒 `POST /parties/:id/join` | Reserve a spot on a public party → `{ partyId, share }`; 400 if full/own party |
| 🔒 `POST /parties/:id/pay` | Simulated payment, always succeeds. Host → party `upcoming` + slot `booked`; joiner → paid member. Invite-accepts land here too |
| 🔒 `GET /parties/open?distance=&from=&to=` | Nearby public parties with spots. **Ensures ≥ 3 exist (generates NPC-hosted parties)** |
| 🔒 `GET /parties/matches?distance=&minOverlap=` | Same set, scored & sorted by `matchPct` (§5) with `commonSongs` |
| 🔒 `GET /parties/mine` | `{ upcoming, past }`; past items flag `rated`. **Backfills one ended party if history is empty** (§2.5) |
| 🔒 `GET /parties/:id` | Room view: venue/room/start, members (`role`, `paid`), invited, `spotsLeft`; 403 if not a member |
| 🔒 `PATCH /parties/:id` | Host only: `{ openToPublic }`; 403 otherwise |
| 🔒 `GET /parties/:id/messages` | Chat history (members only) — clients poll |
| 🔒 `POST /parties/:id/messages` | `{ text }` → 201. NPC members answer with a canned reply now and then, so the chat feels alive |
| 🔒 `POST /parties/:id/invites` | Host only: `{ usernames: [...] }` or `{ target: "@user" \| "email" }` → notifications; 400 if no spots |
| 🔒 `GET /parties/:id/crew` | Fellow members of an **ended** party, for rating |
| 🔒 `POST /parties/:id/ratings` | `{ ratings: [{ username, stars, text }] }` → stores, recomputes singer ratings; 400 if stars ∉ 1–5 or party not ended |

### Notifications — `routers/notifications.ts`
| | |
|---|---|
| 🔒 `GET /notifications` | Pending invites (sender, party, venue, start, `share`) — drives the bell badge; guarantees ≥ 1 on first call |
| 🔒 `POST /notifications/:id/accept` | Reserves the spot → `{ partyId, share }` (client then pays) |
| 🔒 `POST /notifications/:id/decline` | 204 |

### Friends — `routers/friends.ts`
| | |
|---|---|
| 🔒 `GET /friends` | Friends with `singerRating` + `eventsCount` |
| 🔒 `GET /users?q=` | Search people (real + NPC) by name/username/email, excludes self & friends, max 4 |
| 🔒 `POST /friends` | `{ username }` → mutual add (no request/accept — simple); 400 if already friends/unknown |
| 🔒 `DELETE /friends/:username` | Mutual remove; 400 if not friends, 404 if unknown |

### Dev utilities
| | |
|---|---|
| `GET /` | API name, version, endpoint index |
| `POST /dev/reset` | Drops all collections, reseeds catalog + demo account (≙ dropping the `karamatch` db) |
| *(anything else)* | 404 handler, last in `app.ts` |

---

## 7. What students get

- `npm install && npm start` (MongoDB local or Atlas via `MONGODB_URI`) → running API.
- Log in as `alexsings` / `karamatch` (or register), drop a pin **anywhere on Earth**, and
  the world exists: venues within walking distance, open parties tonight, matches with a
  believable spread, people to befriend, an invite waiting in notifications, a past night
  to rate.
- A `README.md` with setup, the demo account, endpoint reference, an explanation of the
  sparse-generation model (worth a lesson in itself), and `curl` examples for the full
  happy path: register → location → songs → venues → slots → book → pay → invite →
  accept → chat → rate.
- Course-shaped code throughout: thin routers, all Mongo access + generation behind
  exported functions in `database.ts`, typed models, supertest examples.

## 8. Out of scope (deliberately)

- Real password hashing / JWTs — plain tokens.
- Real payments — `/pay` always succeeds.
- Websockets — chat is polled.
- Reverse geocoding — the location label comes from the client.
- Mongo geo indexes (`$near`) — bounding box + haversine keeps to course-taught operators.
- Multi-hour bookings, cancellations, waitlists, NPC behaviour beyond canned chat replies.

---

**Next step:** on your go-ahead I'll scaffold `karamatch-api/` and implement it —
generators, sparse ensure-layer, all endpoints, README and supertest examples.
