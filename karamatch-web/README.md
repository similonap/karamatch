# KaraMatch Web

React + TypeScript + Vite front end for the KaraMatch flow, built against the
`karamatch-api` backend. It recreates the `karaoke-matchmaking-app-flow`
prototype (`KaraMatch.dc.html`) screen for screen, rendered inside an iOS-sized
phone frame.

## Setup

1. Start MongoDB and the API (`cd ../karamatch-api && npm start`) — it listens on
   port 3000.
2. `npm install`
3. `npm run dev` — opens on http://localhost:5173

The dev server proxies `/api`, `/uploads`, `/venues` and `/avatars` to the API,
so the app is same-origin and no CORS setup is needed. Point it elsewhere with
`KARAMATCH_API=http://host:port npm run dev`.

Sign in with the API's demo account — **`alexsings` / `karamatch`** — or create a
new one; registration walks through the pin drop and song picker.

## Screens

| File | Prototype screen |
|---|---|
| `screens/Welcome.tsx` | Welcome |
| `screens/SignIn.tsx` | Sign in (+ fake forgot-password) |
| `screens/Register.tsx` | Register — step 1 of 3 |
| `screens/Location.tsx` | Drop your pin — step 2 of 3 |
| `screens/SongPicker.tsx` | Song taste — step 3 of 3 |
| `screens/MainTabs.tsx` | Header, bell badge and the 5-tab bar |
| `screens/tabs/VenuesTab.tsx` | Venues |
| `screens/tabs/OpenPartiesTab.tsx` | Open parties |
| `screens/tabs/MatchTab.tsx` | Find a match |
| `screens/tabs/FriendsTab.tsx` | Friends |
| `screens/tabs/MineTab.tsx` | My parties |
| `screens/VenueDetail.tsx` | Venue detail / booking |
| `screens/Pay.tsx` | Payment (idle → processing → done) |
| `screens/PartyRoom.tsx` | Party room: members, host controls, polled chat |
| `screens/Notifications.tsx` | Invites: accept / decline |
| `screens/InviteFriends.tsx` | Invite from friends list |
| `screens/Rate.tsx` | Rate & review your crew |
| `screens/Profile.tsx` | Edit profile, photo, favourite songs |

## How it is wired

- `api.ts` — one typed function per endpoint. The types mirror what
  `karamatch-api/database.ts` actually returns, including the fact that
  `GET /venues` carries `distanceKm`/`fromPrice` while `GET /venues/:id` does not.
  The bearer token lives in `localStorage` under `km_token`.
- `AppContext.ts` / `App.tsx` — screen state, the current tab, screen parameters
  (which venue, which party, what is being paid) and the toast. On boot a stored
  token is resolved via `GET /me`, which also decides where you land: no location
  → pin drop, fewer than 3 songs → picker, otherwise the Venues tab.
- `theme.ts` — colours, fonts and the button/input/card recipes taken from the
  prototype's inline styles.
- `ui.tsx` — phone frame, avatar (falls back to an initial when a photo 404s),
  toast, spinner, check-ring, plus `useAsync`/`useDebounced` and the date
  helpers that turn ISO starts into "Today 21:00" / "Sat 22:00".

## Notes on the real data

The prototype's hardcoded Tokyo venues and songs are gone — everything comes from
the API's sparse world generation. Two consequences worth knowing:

- **The pin is real coordinates.** Reverse geocoding is out of scope for the API,
  so the location card shows `lat, lng` rather than "Shibuya, Tokyo". The pin
  starts on the seeded world near Antwerp; the ◎ button uses real geolocation.
- **Prices are in euros** (`€`), matching the API's per-seat pricing, not the
  prototype's `$`.
