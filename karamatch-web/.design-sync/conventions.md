# Building with KaraMatch

KaraMatch is a **dark-only mobile karaoke app** design system. There is no light mode. Every
component draws near-white text (`#F5F1FA`) and translucent-white borders
(`rgba(255,255,255,.1–.25)`), so **on a light background these components are invisible, not just
off-brand.** Getting the surface right is the single most important thing on this page.

## 1. Always render on the dark surface

Put every screen on the app surface. Either use the shipped class:

```jsx
<div className="km-surface" style={{ minHeight: "100vh", padding: 20 }}>…</div>
```

…or set it directly: `background: "#0A0512"`, `color: "#F5F1FA"`, `fontFamily: "Outfit, sans-serif"`.

For a phone mockup, wrap the whole screen in `PhoneFrame` instead — it supplies its own 402x874
device shell, radial backdrop, dynamic island and home bar, so it needs no surface of its own:

```jsx
<PhoneFrame><YourScreen /></PhoneFrame>
```

**`Toast` and `ConfirmDialog` are `position: absolute`** (ConfirmDialog is `inset: 0`). They anchor
to the nearest positioned ancestor — inside `PhoneFrame` that is the screen. If you render them in
a container that is not `position: relative`, they will escape to the page.

## 2. Styling idiom: inline style objects, not CSS classes

This system has **no utility-class vocabulary**. Components take props; you style your own layout
glue with inline React `style` objects using the exported tokens. `.km-surface` is the only class
shipped. Import the tokens rather than hardcoding hex:

| Export | What it is |
|---|---|
| `C` | palette: `pink #FF3D8F`, `pinkSoft`, `pinkPale`, `purple`, `violet`, `cyan`, `green`, `gold`, `text`, `textDim`, `textMuted`, `textFaint`, `bg #0A0512`, `bgDeep`, `panel #140B22` |
| `GRAD` / `GRAD_TILE` | the brand gradients (`pink → purple`, and a 135° tile variant) |
| `DIM_BG` | `rgba(255,255,255,.12)` — the disabled/inactive fill |
| `cardStyle` | the standard card recipe (radius 20, hairline border, 4% white fill) |
| `inputStyle` | the standard 54px text input |
| `primaryButton(enabled)` | **a function** — the 56px gradient CTA; pass `false` for the dimmed state |
| `roundBack` | the 38px circular icon-button recipe |
| `sectionLabel` / `screenTitle` | the two heading recipes |
| `avatarColor(seed)` / `initial(name)` | stable per-person colour, and initial fallback |
| `optionStyle(selected)` | **a function** — selectable pill (day / time / room) |

**Two fonts:** `Unbounded, sans-serif` for screen and dialog titles only; `Outfit, sans-serif` for
everything else. Both load from Google Fonts via `styles.css` — do not add your own font links.

Helpers you should use instead of rolling your own: `money(n)` → `€n`,
`plural(n, one, many)`, `formatWhen(iso)` → `"Today 21:00"` / `"Tomorrow 20:00"`,
`formatTime(iso)`, `formatDayLabel(iso)`, and the hooks `useAsync(loader, deps)` (returns
`{data, loading, error, reload, setData}`) and `useDebounced(value, delay)` for search inputs.

## 3. Where the truth lives

Read `_ds/<folder>/styles.css` and its `@import` closure for the shipped CSS (the `.km-surface`
class and the `km-pop` / `km-spin` / `km-pulse` keyframes). Each component's real API is in
`components/general/<Name>/<Name>.d.ts`, with usage in `<Name>.prompt.md`. Prefer reading those
over guessing — the prop lists are short and exact.

## 4. An idiomatic screen

```jsx
<PhoneFrame>
  <div style={{ padding: "0 20px", display: "flex", flexDirection: "column", gap: 14 }}>
    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
      <BackButton onClick={goBack} />
      <div style={screenTitle}>Tonight</div>
    </div>

    <div style={sectionLabel}>YOUR MATCHES</div>

    {singers.map(s => (
      <div key={s.id} style={{ ...cardStyle, display: "flex", alignItems: "center",
                               gap: 12, padding: "12px 14px" }}>
        <Avatar name={s.name} seed={s.id} size={44} fontSize={17} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: 15 }}>{s.name}</div>
          <div style={{ color: C.textMuted, fontSize: 13 }}>@{s.username}</div>
        </div>
        <MatchBadge pct={s.matchPct} />
      </div>
    ))}

    <button style={primaryButton(true)}>Host a party</button>
  </div>
</PhoneFrame>
```

Note `flex: 1, minWidth: 0` on the text column — without it, long names push the trailing badge out
of the row. `MatchBadge` renders pink above `pct >= 60`, muted below, and **nothing at all** when
`pct` is `null` (that row is the current user).
