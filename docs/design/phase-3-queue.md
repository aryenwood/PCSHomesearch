# Phase 3 build queue — the Fort Drum guide becomes chapters

Queued 2026-09-24 (owner: "queue the next build"). Direction approved in the Phoenix plan;
the chassis (`css/chassis.css`, `docs/design/chassis-spec.md`) is the design law. Starts on
the owner's "go".

## Status (Sep 24 2026)

Chapters 1-6 and the hub are built: schools and pcs-checklist are live; buying, housing,
healthcare, winter and the rebuilt hub are committed, draft only. Every fact on the new pages
was re-checked against official sources first (owner rule: carrying a figure over is not
verifying it). Remaining: step 8 renames (Get Help, Living Here), and the Fable audit before
the push.

## Why

`pcshomes-fortdrum.html` is 278 KB, 916 inline styles, one URL. Nobody can land on "Fort Drum
schools" from Google or text a friend the schools page. It is also the last page on the old
design, so it is the visual seam on the live site.

## Measured starting point

| Section id | Size | Becomes |
|---|---|---|
| `base` (includes `#winter`) | 13 KB | Hub overview + **Winter** chapter |
| `onpost` | 8 KB | **Housing** chapter |
| `map` | 6 KB | **Housing** chapter (map as its hero) |
| `schools` | 83 KB | **Schools** chapter (the approved target frame IS this page) |
| `family` | 13 KB | Hub "safety net" block; spouse items move to Spouse HQ |
| `spouse-employment` | 9 KB | Merged into Spouse HQ #career (duplicate content) |
| `medical` | 6 KB | **Healthcare** chapter |
| `va` | 12 KB | **Buying** chapter (VA calculator) |
| `rvb` | 12 KB | **Buying** chapter (rent vs. buy calculator) |
| `pcs` | 56 KB | **PCS Checklist & Money** chapter |

Inbound links from other pages: 54, across 9 anchors (`#schools` 11, `#pcs` 10, `#va` 9,
`#map` 9, `#rvb` 8, `#winter` 2, `#onpost` 2, `#family` 2, `#medical` 1).

## URLs

Nova's clean scheme, served by Netlify Pretty URLs: `/fort-drum/schools`,
`/fort-drum/housing`, `/fort-drum/buying`, `/fort-drum/pcs-checklist`,
`/fort-drum/healthcare`, `/fort-drum/winter`. `pcshomes-fortdrum.html` stays as the hub.

Old deep links carry a `#hash`, which never reaches the server, so Netlify redirects cannot
move them. The hub keeps every old anchor id as a short summary block linking to its chapter,
plus a few lines of script that forward `pcshomes-fortdrum.html#schools` (and the other eight)
to the chapter URL. Nothing that anyone ever shared breaks.

## Build order (one verified chapter at a time)

1. **Schools** — build from the approved target frame. Carries the registrar directory, the
   district ledger, MIC3 rights, the SLO plate, and the schools ask band.
2. **PCS Checklist & Money** — the 56 KB section; keeps the entitlements tables and the corrected
   HHG deadline (180-day notice / 9-month claim / 12 months for pickups on or after May 15, 2026).
3. **Buying** — VA calculator + rent vs. buy. The calculators' scripts must move intact; their
   ask bands keep posting to `popup-lead` with offer context.
4. **Housing** — on-post (Mountain Community Homes) + the neighborhood map (OpenFreeMap tiles,
   pin CTA carries `?need=agent&area=<town>#contactForm`).
5. **Healthcare** and **Winter** — the two small chapters.
6. **Hub** — the new `pcshomes-fortdrum.html`: chapter cards as resolver rows, the forwarding
   script, the family safety-net block; spouse-employment content merged into Spouse HQ.
7. **Rewire** — repoint the 54 internal links, quick-links sheets, stage panels, directory
   links, sitemap, canonicals, and split the FAQ JSON-LD per chapter.
8. **Renames** (Phoenix plan): Contact + Network → **Get Help**; Discover → **Living Here**,
   with `_redirects` so old `.html` URLs 301.

## Acceptance per chapter

- Every number, link, and claim carried over verbatim unless a verified fix applies.
- Old anchor forwards land on the right chapter (test all 9).
- 390 / 768 / 1440 screenshots, console clean, no horizontal scroll, Lighthouse mobile
  100 / 100 / 100 held.
- Calculators and ask bands exercised; intercepted POST shows the right form name and fields.
- Draft preview first; production only on the owner's "push".

## Model routing (owner ruling 2026-09-24)

Chapter builds and reviews run on Opus 5.5. The 54-link rewire sweep and the link audit are
mechanical: Haiku or Sonnet subagents, verified by the builder. The final pass on the whole
restructure before push is a Fable audit.

## Queued behind Phase 3 (directory track)

- Re-verify the ~60 non-crisis directory records against their official sources (the 15 crisis
  lines and all unit desks were verified 2026-09-24).
- A quick-exit button on the Help Now section (DV safety pattern).
- Geocode the records server-side and add a directory map layer (never invent coordinates).
- A recurring freshness job on the schema's cadence (crisis 7 days, government/medical 30,
  P1 60, P2 90), proposing diffs for review instead of silently editing.
- Owner: test-call the two 2nd Mobile BCT numbers (774-2199 vs 772-2199) and keep the live one.
- Find Your North events layer — on hold until the owner's conversation with its owner.
