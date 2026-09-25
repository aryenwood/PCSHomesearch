# PCSHomes build queue

Updated 2026-09-25, after push #7 (Living Here live, a750aec). Phase 3 is complete. Items run in
this order unless the owner reorders them. Every fact is checked against an official source before
it ships (owner rule: carrying a figure over is not verifying it). Push only on the owner's "push".

## 1. Living Here: more places (done Sep 25, 104 places)

- 36 places added (68 to 104): pinned with evidence (official-page coordinates, OSM objects in the
  right town, or the Census geocoder) and every new lead confirmed on an official page first.
- Left out, with reasons in `docs/research-2026-09/living-here-places-research.json`:
  - over 75 minutes from the gate: Robert Moses State Park, Wilson Hill WMA, Keller Mohawk Hill,
    East Branch of Fish Creek, Tug Hill Traverse Trail;
  - no pin with evidence: Veteran's Memorial Park (Lowville), David S. Smith Preserve, Lyons Falls,
    the Great Lakes Seaway Trail (a 454-mile route, not a place);
  - not confirmed on an official page: Overlook Park (Black River), Port Leyden Village Park,
    Beaver Falls Town Park; Wellesley Island Preserve has no public access (its land trust says so);
  - closed or stale: Maple Ridge Snow Park (the BOCES isn't running the tubing hill), the Sci-Tech
    Center building (exhibits moved to Zoo New York), Dodge Farms (site stops at 2019/2020);
  - weak source only: Cape Vincent's East End Park (a non-government village site);
  - boat access only: Grindstone Island preserves, Canoe-Picnic Point;
  - duplicate: Northern Credit Union Community Arena is the Watertown Municipal Arena.
- To add more: put the record in the research file, run `python3 tools/geo-places.py` on it,
  regenerate `data/places.json`, then `python3 tools/build-places.py` and `tools/qa-living-here.py`.

## 2. Photos

- **Gaps with no freely licensed photo:** Dry Hill and Snow Ridge ski areas, fall foliage in
  Jefferson and Lewis counties, maple sugaring, Chaumont Bay, Zoo New York animals, a Sackets Harbor
  village shot at full resolution. Options: the owner's own photos, direct permission from the
  venue, or licensed stock (record the license).
- **Provenance audit:** the older site photos (thompson-park, sackets-harbor, north-country-winter,
  thousand-islands, military-family, servicemember-returning-home, soldier-spouse-on-post) have no
  recorded source or license. Find each one's origin; replace anything unlicensed.
- Done Sep 25: the legacy `the-heights-evans-mills-ny-building-photo` images (an apartments.com
  listing photo, unused since the old guide was retired) were removed from the repo.

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
