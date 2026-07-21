# KaraMatch Web

React + TypeScript + Vite front end for the KaraMatch flow, built against the
`karamatch-api` backend. It covers the `karaoke-matchmaking-app-flow` prototype
(`KaraMatch.dc.html`) screen for screen, rendered inside a phone frame.

The UI follows cross-platform native conventions rather than web ones, and is
deliberately **identical on Android and iOS** — no platform forks, and no
translucent "liquid glass" tab bar. See [Design system](#design-system).

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
- `design/tokens.ts` — the scales: colour, spacing (4pt grid), radii, type ramp,
  elevation and layout constants. No screen invents its own values.
- `design/icons.tsx` — the stroked icon set, drawn on a 24px grid. Tab icons
  also have a filled form for the selected state.
- `ui.tsx` — every shared component (see below), plus `useAsync`/`useDebounced`
  and the date helpers that turn ISO starts into "Today 21:00" / "Sat 22:00".

## Design system

Colours resolve through CSS variables in `index.css`, so the light theme is a
variable swap rather than a branch in any component. The surface ladder is
semantic (`--km-surface-1`, `-2`, `-3`) instead of stacked translucent veils, so
nesting a card inside a card stays predictable.

Load-bearing conventions:

- **`Pressable`** backs every touchable. It dips scale + opacity on pointerdown,
  because `:hover` and `cursor: pointer` do not exist on a phone.
- **The tab bar is flat, opaque and edge-to-edge**, with a filled icon marking
  the selected tab. It is not a floating translucent pill: that is an iOS-only
  idiom that renders differently wherever `backdrop-filter` is unsupported.
- **The gradient is scarce** — one primary action per screen, plus the brand
  mark. In-list actions use the flat `tinted` button variant.
- **Destructive is red, not brand pink** (`--km-danger`), so "leave this party"
  never reads as "this is on brand".
- **Stack screens push/pop**; tab switches cross-fade. `App.tsx` picks the
  direction by comparing each screen's depth in `DEPTH`.
- Touch targets are at least `LAYOUT.touch` (44px), and text inputs are 16px or
  larger, or mobile Safari zooms the page on focus.

Shared components: `AppBar` · `BottomBar` · `ScrollBody` · `Card` · `Group` /
`ListRow` · `Section` · `Button` · `Chip` · `OptionPill` · `Segmented` ·
`Toggle` · `Stepper` · `TextField` / `SearchField` · `StepHeader` · `Avatar` /
`AvatarStack` · `StarInput` · `Skeleton` · `EmptyState` · `ConfirmDialog`.

## Notes on the real data

The prototype's hardcoded Tokyo venues and songs are gone — everything comes from
the API's sparse world generation. Two consequences worth knowing:

- **The pin is real coordinates.** Reverse geocoding is out of scope for the API,
  so the location card shows `lat, lng` rather than "Shibuya, Tokyo". The pin
  starts on the seeded world near Antwerp; the ◎ button uses real geolocation.
- **Prices are in euros** (`€`), matching the API's per-seat pricing, not the
  prototype's `$`.
