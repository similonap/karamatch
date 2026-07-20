# design-sync notes — karamatch-web

Repo-specific gotchas for future syncs. Read this before re-running.

## Source shape

- `karamatch-web` is a **Vite application, not a published component library**. `package.json`
  has no `main`/`module`/`exports`, and `dist/` is the *app* build — never point the converter at it.
- The design system is the three files `src/ui.tsx`, `src/theme.ts`, `src/index.css`.
- The converter is run with an explicit entry: `--entry ./src/ui.tsx`.
- There is no `buildCmd`. Nothing needs building before the converter runs.

## Fixes this sync had to make

- **`[ZERO_MATCH]` on the first build.** Component discovery keys off PascalCase exports in shipped
  `.d.ts` files, and this package emits none. Fixed by pinning all 12 components explicitly in
  `cfg.componentSrcMap`, all pointing at `src/ui.tsx`. **Any new component added to `src/ui.tsx`
  must be added to `componentSrcMap` by hand or it will silently not sync.**
- **Prop extraction produced `[key: string]: unknown` for all 12.** Generating declarations with
  `tsc --emitDeclarationOnly` did not help: `tsc` emits inline destructured type literals
  (`function Avatar({ name }: { name: string })`) and the extractor wants a named props interface.
  Fixed with hand-written `cfg.dtsPropsFor` bodies for all 12 components. **These are hand-maintained
  and will drift if `src/ui.tsx` prop signatures change** — see Re-sync risks.
- **Fonts and keyframes were unreachable.** The app loads `Outfit`/`Unbounded` from a `<link>` in
  `index.html`, and defines the `km-pop`/`km-spin`/`km-pulse` keyframes in `src/index.css`. Neither is
  findable by the CSS scrape. Fixed by authoring `.design-sync/ds-styles.css` (committed) as
  `cfg.cssEntry`; it restates the font `@import`, the keyframes, and adds the `.km-surface` class.
- **The whole DS is dark-only.** Components use near-white text and translucent white borders, so on
  the default white preview background `BackButton`, `CheckRing` and `EmptyCard` rendered as blank
  cards and `Avatar`/`ErrorNote` were nearly invisible. **Every authored preview must wrap its
  content in a `#0A0512` surface with `Outfit` as the font family.** `PhoneFrame` is the exception —
  it carries its own dark background.
- **Absolutely-positioned components need a positioned ancestor.** `Toast` (`position:absolute`,
  bottom 110) and `ConfirmDialog` (`position:absolute; inset:0`) dim/anchor to their nearest
  positioned ancestor — in the app that is the PhoneFrame screen. Their previews recreate a
  `position:relative` screen party (360x420) with content behind. See `previews/ConfirmDialog.tsx`.

## Preview wrapper taxonomy (use this when authoring a new preview)

"Wrap it in a dark surface" is necessary but **not sufficient** — three components collapse if the
wrapper only supplies colour. Pick the right shape up front and you skip a failed capture:

1. **Plain surface** — self-sizing components: `ErrorNote`, `MatchBadge`, `EmptyCard`, `Spinner`,
   `Avatar`, `CheckRing`, `GradientTile`, `BackButton`.
   `{ background: "#0A0512", color: "#F5F1FA", fontFamily: "Outfit, sans-serif", padding: 20 }`
2. **Sized flex surface** — components that fill and centre: `Loading` is `flex: 1` with centred
   justification, so in an unsized wrapper it shrinks to just the spinner and the centring never
   shows. Add `display: flex; flexDirection: column; width: 320; height: 200`.
3. **`Screen` helper** — `position: absolute` overlays: `Toast`, `ConfirmDialog`. A `position:
   relative` party, 360x420, `overflow: hidden`, `borderRadius: 24`, gradient `#0D0718 → #0A0512`,
   with plausible screen content behind. Copy it from `previews/ConfirmDialog.tsx`.
4. **No wrapper** — `PhoneFrame` carries its own dark background and is `minHeight: 100vh`.

Two further authoring conventions worth keeping:

- **Threshold components need boundary-straddling cells.** `MatchBadge` switches treatment at
  `pct >= 60`. Round numbers (90 vs 30) prove two branches exist but not where the split is; the
  previews use **60** and **59** to pin the cutoff visually.
- **Components that legitimately render nothing get no cell.** `MatchBadge` returns `null` for
  `pct == null` (that row is you). A null cell would capture as a blank card and read as broken, so
  the case lives in a code comment and a grade note instead.
- **Animated components screenshot fine.** `Spinner`/`Loading` use `km-spin`; capture freezes them
  mid-rotation and the pink arc still reads. Do not try to disable the animation.
- **`[GRID_OVERFLOW]` on `Avatar`.** The `Colours` cell (six avatars in a row) is wider than a grid
  cell. Fixed with `cfg.overrides.Avatar = {"cardMode": "column"}`.

## Composition notes

- **Small controls are composed, not isolated.** `BackButton` (38px circle) and `CheckRing`
  (24px default) each produce a ~40px sliver of a card alone, so their previews compose them into
  the real screen-header row and selectable song/friend rows. `CheckRing`'s selected state is not
  just the ring — the surrounding row also tints (`rgba(255,61,143,.55)` border,
  `rgba(255,61,143,.1)` fill); a preview showing only the ring under-sells it.
- **Row layouts need `flex: 1; minWidth: 0` on the text column** plus `textOverflow` per line, or
  long real content ("Non, je ne regrette rien") pushes the trailing element out of the card.
- **`PhoneFrame`'s 402x874 shell is taller than the capture viewport**, so the bottom rounded
  corners and home bar are cropped from the review sheet. This is a harness limitation, not a
  component defect. Keep `Screen` content above roughly the 560px fold. Its export must be named
  exactly `Screen` (`cfg.overrides.PhoneFrame.primaryStory`) or the single-mode card renders empty.

## Open question for the DS owners

- **`GradientTile` has no usage anywhere in `src/`.** It is an exported component that nothing
  consumes. Its preview was composed by inferring intent from the implementation (square, `GRAD`
  fill, glyph at 45% of size) as a party/venue row thumbnail. Either it is dead code and should be
  dropped from `componentSrcMap`, or the party/venue rows should be adopting it. Worth a decision
  before the next sync.

## Known render warns (expected — not new)

- `[FONT_REMOTE] "Outfit"` — by design. The fonts are served by Google Fonts at runtime via the
  `@import` in `.design-sync/ds-styles.css`; nothing is shipped in `fonts/`. Not actionable.

## Deliberately not synced

- The camelCase exports of `src/ui.tsx` are not components and are correctly excluded by discovery:
  hooks (`useAsync`, `useDebounced`), the style helper `optionStyle`, and the formatters
  (`formatWhen`, `formatTime`, `formatDayLabel`, `money`, `plural`). They are still present in
  `window.KaraMatch` (20 exports) and usable, they just have no cards.

## Re-sync risks

- **`cfg.dtsPropsFor` is hand-written and can silently rot.** Nothing cross-checks it against
  `src/ui.tsx`. If a component's props change, the design agent will code against a stale contract.
  Diff the 12 signatures in `src/ui.tsx` against `dtsPropsFor` on every re-sync.
- **`cfg.componentSrcMap` is a hand-maintained enumeration.** A component added to `src/ui.tsx`
  will not appear in the sync until it is added here. Compare the `export function` list in
  `src/ui.tsx` against the map.
- **`.design-sync/ds-styles.css` duplicates the keyframes from `src/index.css`.** If those animations
  change in the app, this copy will not follow. The `.km-surface` colour `#0A0512` likewise
  duplicates `C.bg` from `src/theme.ts`.
- **Preview content is inlined, not referenced.** The previews hard-code names, handles and copy
  lifted from `src/screens/**` at sync time. If that copy changes the previews will not follow —
  they are illustrative, so this is acceptable, but do not treat them as a source of truth.
- **Avatar previews deliberately avoid `photoUrl`.** Remote images would make headless renders
  network-dependent and nondeterministic; the previews use seeded initials instead. `photoUrl` is
  still a real prop with an onError fallback to initials.
- **The `surface` const is copy-pasted into ~11 preview files.** `.design-sync/ds-styles.css` ships a
  `.km-surface` class with the same values for the design agent to use, but the previews inline the
  object rather than using the class (inline styles are immune to stylesheet-load-order surprises in
  the capture harness). If `#0A0512` ever changes, both the class and every preview need updating.
  A preview decorator would be the cleaner long-term fix.
- **Playwright/chromium was installed into `.ds-sync/node_modules` for this run.** `.ds-sync/` is
  gitignored, so a fresh clone must reinstall it before the render check can run.
