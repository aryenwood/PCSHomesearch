# PCSHomes chassis spec (Phase 2)

Owner-approved Sep 23, 2026. The approved target frame is the Schools chapter mock:
https://claude.ai/artifact/PFp3DQxhYa4Ct7Y2r8bTmB

That frame is the design authority. Its tokens, type scale, spacing scale, rules,
plates, and reveal behavior were extracted verbatim into:

- `css/chassis.css` — the one stylesheet under every page
- `js/chassis.js` — reveals, reading progress, the contour ground

## The rules

1. **Type uses the `--t-*` scale, space uses the 8px `--s-*` scale.** No other sizes.
   Serif display sizes (h1/h2/h3, ledger numerals) are the display scale and live
   only in chassis.css.
2. **Body text is 18.5px/1.7 DM Sans.** Display is Libre Baskerville. Three sans
   weights: 400, 500, 700.
3. **Cards are scarce and mean "you can act on this."** Information lives on ruled
   patterns: resolver rows (`.resolve`), ledger rows (`.dist-row`), numbered rows
   (`.right-row`), the facts strip (`.facts`).
4. **The navy plate is the single conversion moment per page** (`.plate` +
   `canvas.ground`). Motion lives in the ground, never on controls. Paused
   offscreen, DPR capped at 2, static frame under reduced motion.
5. **Photos carry the warmth**: rounded 18px, `--shadow-photo`, chip captions.
   Bands (`.band`), trios (`.trio`), sticky sides (`.split .side`).
6. **One fixed layer on phones**: the tab bar. The top bar goes static below 780px.
7. **Form fields self-label inside the field** (`.field`), gold button (`.btn-gold`).
8. **Reveals** (`.rv`) are opt-in per element, staggered, killed by reduced motion.

## Page conversion status

- [x] index.html (Sep 2026)
- [ ] pcshomes-fortdrum.html (272KB — converts during the Phase 3 split into chapters)
- [ ] pcshomes-spouse.html
- [ ] pcshomes-discover.html (renames to Living Here in Phase 3)
- [x] pcshomes-network.html (Sep 2026; merges with contact into Get Help in Phase 3)
- [x] pcshomes-contact.html (Sep 2026)
- [x] pcshomes-glossary.html (Sep 2026)
- [x] privacy.html / terms.html (Sep 2026)
- [x] 404.html (Sep 2026, retokened in place, stays self-contained)
