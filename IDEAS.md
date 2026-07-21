# KaraMatch — Feature Ideas

Everything in `API-PROPOSAL.md` is implemented; nothing there is stubbed. This file
collects features **beyond** that scope, roughly ordered by how much the app hurts
without them.

A few items below overlap with the proposal's §8 ("Out of scope, deliberately":
real payments, password hashing, websockets, cancellations). Those are called out
where relevant — they are listed here as product gaps, not as spec violations.

---

## 1. A song queue per party — the biggest thematic gap

This is a karaoke app where nobody ever picks a song for the actual night. `Party` has
a `genre` string and users have `favoriteSongIds`, but there is no link between a party
and the songs sung at it. The matchmaking engine computes song overlap and then throws
that away at booking time.

**Shape:** a `PartySong { partyId, userId, songId, order }` collection, plus
`GET`/`POST`/`DELETE /parties/:id/setlist`. Members add songs, the room screen shows the
running order. Because `scoreMatch` already produces `commonSongs`, the party room can
suggest "songs you all love" when the crew forms.

Self-contained: one collection, three routes, one screen, no changes to the
world-generation layer.

---

## 2. You can join a party but never leave it

`POST /parties/:id/join` has no counterpart, and `PATCH /parties/:id`
(`routers/parties.ts:185`) only toggles `openToPublic` — so a host cannot cancel either.
Once you are in, the only exit is the slot passing.

§8 puts cancellations out of scope, but *leaving* is a different thing from *cancelling*
and it is the one users hit first. Refund semantics stay trivial since `/pay` is
simulated.

**Shape:** `DELETE /parties/:id/members/me` (frees the spot, recomputes shares) and a host
`POST /parties/:id/cancel` (party → `cancelled`, slot back to `available`).

---

## 3. Friends are added without consent

`POST /friends` (`routers/friends.ts:71`) writes the link mutually and immediately —
anyone can make themselves your friend.

The machinery already exists: `Notification.kind` is `"invite" | "review"`, so adding
`"friend_request"` and routing it through the existing accept/decline endpoints is a
small change.

---

## 4. No moderation, at all

No block, no report, no way for a host to remove someone from their party. For an app
whose premise is *meeting strangers in a private room at night*, this is the gap to flag
hardest before any real deployment.

Even a minimal `POST /users/:username/block` — filtering that user out of search,
matches, and open-party listings — would matter.

---

## 5. Account management holes

- **No logout endpoint.** `App.tsx:120` clears client state, but the token stays valid on
  the server forever. One `POST /auth/logout` calling `setUserToken(user.id, null)` fixes it.
- **No password change** for a logged-in user. `/auth/forgot` is a documented mock, which
  is fine, but there is no `PUT /me/password` either.
- **No account deletion** (`DELETE /me`).

---

## 6. Notifications are thin

Only invites and review prompts exist. Nothing for: someone joined your party, a new chat
message, party starts in an hour, payment confirmed.

There is also no read/dismiss state — the badge is just "pending invites", so a declined
invite vanishes instead of becoming history.

---

## 7. Venue discovery is one-dimensional

`GET /venues` sorts by distance and stops there. Missing:

- Filters — price, room size, open now.
- Favouriting a venue.
- Browsing a venue's **upcoming public parties** from its detail page. This is the odd one:
  "I like this place, who's singing here?" is a natural path and the data is already there.

---

## Suggested starting point

**The setlist (#1).** It is the feature the rest of the app already implicitly promises —
you match people on song taste, seat them in a room together, and then the app goes quiet
about songs. It is also the most self-contained of the seven.
