# karamatch-mobile

An on-device Storybook of a React Native / Expo component shelf, ported from
the KaraMatch web client's design system (`karamatch-web/src/ui.tsx`,
`design/tokens.ts`, `design/icons.tsx`). The point of this app is the shelf
in `src/components/` — everything here is meant to be copied into a
student's own KaraMatch mobile app and assembled into real screens, not
extended in place.

## Running it

```sh
npm install
npm start          # Storybook (default)
npm run start:app  # the two-screen placeholder app instead
```

Then open in Expo Go, an iOS simulator, or an Android emulator as usual
(`npm start` prints the options). No dev client or prebuild is required —
everything here runs in plain Expo Go.

### Storybook vs. the placeholder app

`App.tsx` renders the on-device Storybook UI by default. Every component
under `src/components/` has a co-located `*.stories.tsx` with on-device
controls, actions, and backgrounds wired up — flip through them from the
Storybook UI's own navigator, and use the "Theme" toolbar toggle to check a
component in both light and dark.

Setting `EXPO_PUBLIC_STORYBOOK=false` (`npm run start:app`) switches `App.tsx`
to `src/PlaceholderApp.tsx` instead — a minimal two-screen app (a venue list
and a venue detail screen) assembled purely from shelf components, just
enough to prove the pieces actually compose into a real screen rather than
only ever being seen one at a time in Storybook. It is not itself part of
the shelf.

## Using the shelf in your own app

Copy `src/` into your project (or just the pieces you need — nothing in
`src/components/` reaches outside `src/`) and import from the barrel:

```tsx
import { Button, Card, VenueCard, useTheme, ThemeProvider } from "./shelf";
```

Wrap your app in `ThemeProvider` (and `SafeAreaProvider` from
`react-native-safe-area-context`) once, near the root — every component
reads colours/spacing/type through `useTheme()`, so there's nothing else to
configure.

`src/types.ts` has local copies of the API response shapes the domain
composites are typed against (`VenueNearby`, `PartyView`, `NotificationView`,
etc.) — these mirror `karamatch-web/src/api.ts`, i.e. what karamatch-api's
endpoints actually return, not the raw database models. If your app's API
client already has its own types for the same endpoints, delete
`src/types.ts` and point the domain composites at those instead; the props
are structural, not nominal.

## What's in the shelf

- **`theme/`** — colour palettes (light + dark), the spacing/radius/type
  scale, and `ThemeProvider`/`useTheme()`.
- **`icons/`** — one stroked icon set (`Icon`, `StarIcon`), drawn with
  `react-native-svg` from the same path data as the web version.
- **`components/primitives/`** — ~33 generic, reusable atoms: buttons, form
  fields, avatars, chips, list rows, loading/empty/error states, a toast and
  a confirm dialog, etc.
- **`components/scaffolding/`** — `Screen`, `AppBar`, `BottomBar`: safe-area-
  aware screen chrome.
- **`components/domain/`** — composites typed against the real API models:
  `VenueCard`, `PartyCard`, `SongRow`, `NotificationRow`, `FriendRow`,
  `ReviewCard`, `ChatBubble`, `UserProfileHeader`, `VenueLocationCard`.
- **`utils/`** — date/price formatting, an avatar-colour hash, `useAsync`/
  `useDebounced`.
- **`mocks/`** — fixtures for every domain type, used by the domain stories
  and handy for your own screens before a real API is wired up.

## What's deliberately not here

- **A live venue map.** `VenueMap` in the web app embeds Leaflet; the native
  equivalent needs a dev-client/prebuild (`react-native-maps` or similar),
  which breaks running in plain Expo Go. `VenueLocationCard` is a static
  stand-in that hands off to the device's own Maps app instead.
  If you need a real embedded map, that's the one place you'll need to
  step outside Expo Go.
- **Screen transitions.** The web version's `Transition` (push/pop/fade) is
  navigator-level choreography that belongs to whatever stack router you
  wire up (e.g. React Navigation's native stack already animates this) —
  the shelf has no navigator of its own to hook one into.
- **`PhoneFrame`/`StatusBar`.** Artifacts of faking a native device inside a
  browser; meaningless once the app is actually native.

## Notes on the port

- Fonts (`Unbounded`, `Outfit`) load via `@expo-google-fonts/*` +
  `useFonts()` in `App.tsx`, gated behind `expo-splash-screen`, rather than
  a build-time `expo-font` config plugin — the plugin takes a font family
  name from each `.ttf`'s own internal metadata, and Google Fonts' static
  weight files for these two families don't all carry distinct names (some
  weights collide), which would make specific weights unreliable to target
  on iOS. `useFonts()` sidesteps that by registering each weight under an
  explicit, unique key.
- Every `T.*` type-ramp entry bakes in one specific weighted font family
  (e.g. `Outfit_700Bold`) instead of a base family plus a numeric
  `fontWeight`, since React Native can't fake a weight onto a single static
  font file the way CSS can.
- Icons take an explicit `color` prop everywhere (no default) — React
  Native SVG has no `currentColor`/CSS inheritance to fall back on.
