# PCSHomes build queue

Updated 2026-09-25, after push #7 (Living Here live, a750aec). Phase 3 is complete. Items run in
this order unless the owner reorders them. Every fact is checked against an official source before
it ships (owner rule: carrying a figure over is not verifying it). Push only on the owner's "push".

## 1. Living Here: more places (in progress)

- **Pin 24 confirmed places** that no geocoder could place: small village parks in Watertown, West
  Carthage, Sackets Harbor, Chaumont and Lowville; land-trust preserves; Robert Moses State Park;
  Wilson Hill WMA; Tug Hill State Forest; Old McDonald's Farm. Coordinates need evidence (the
  official page, an OSM object in the right town, or the Census geocoder), never a town center.
- **Verify 30 leads** the first pass couldn't confirm: small-town libraries (Dexter, Black River,
  Theresa, Antwerp, Harrisville, Croghan), preserves, village parks, Carthage YMCA, Maple Ridge
  Snow Park, the Lewis County Historical Society, the Thousand Islands Arts Center.
- Rebuild with `python3 tools/build-places.py`, then `python3 tools/qa-living-here.py`.
- Research files: `docs/research-2026-09/living-here-places-research.json` (never served).

## 2. Photos

- **Gaps with no freely licensed photo:** Dry Hill and Snow Ridge ski areas, fall foliage in
  Jefferson and Lewis counties, maple sugaring, Chaumont Bay, Zoo New York animals, a Sackets Harbor
  village shot at full resolution. Options: the owner's own photos, direct permission from the
  venue, or licensed stock (record the license).
- **Provenance audit:** the older site photos (thompson-park, sackets-harbor, north-country-winter,
  thousand-islands, military-family, servicemember-returning-home, soldier-spouse-on-post) have no
  recorded source or license. Find each one's origin; replace anything unlicensed.
- The legacy `images/the-heights-evans-mills-ny-building-photo.jpg` looks like an apartments.com
  listing photo; it left the site with the old guide. Delete it from the repo once confirmed unused.

## 3. Fact re-verification on pages built before the rule

- **Spouse HQ:** SpouseWorks, relicensure, "1,000+ MSEP partner employers", the Nurse Licensure
  Compact line, childcare wait-list wording, NY expedited licensure terms.
- **Homepage and Glossary:** every number and superlative (the glossary DLA line was fixed Sep 24).
- **Directory:** re-verify the ~60 non-crisis records (the 15 crisis lines and the unit desks were
  verified Sep 24); reconcile the Mountain Community Homes number (the directory has 836-4168; the
  Welcome Home Center page says 955-6644).

## 4. Partner network (Phoenix Phase 5)

- Get Help's partner cards carry symmetry flags inherited from the old Network page (unequal tag
  rows, card rows that don't share a top edge, partner-form labels that wrap).
- Joe Murtha: #1 in Jefferson & Lewis County 5 years running is the owner's statement (Sep 24).
- Refresh the WC card (multi-division, woodconsultingllc.net).

## 5. Content gaps (Phoenix Phase 4)

- **Renting off post** is the biggest missing topic (the content review's #1 gap): how the Housing
  Services Office helps, lease terms, what BAH covers off post, winter utilities.

## 6. Directory track (queued since Phase 3)

- A quick-exit button on the Help now section (domestic-violence safety pattern).
- Geocode the directory records and add a map layer (never invent coordinates).
- A recurring freshness job on the schema's cadence (crisis 7 days, government/medical 30, P1 60,
  P2 90) that proposes diffs for review instead of editing silently.
- Owner: test-call the two 2nd Mobile BCT numbers (774-2199 vs 772-2199).
- Find Your North events layer: on hold until the owner talks with its owner. Until then the site
  may read its public pages only as a lead list, never copying its text, photos or data.

## 7. Housekeeping

- Move the chapter pages' repeated CSS (crumb, ruled lists, ask band, tab bar) into `css/chassis.css`.
- The final Fable audit of Phase 3 didn't run (monthly spend limit); an Opus 5.5 audit ran instead.
  Run the Fable pass when the limit resets if the owner wants it.
- The rename of the site itself comes last (Phoenix Phase 6).
