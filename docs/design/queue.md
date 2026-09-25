# PCSHomes build queue

Updated 2026-09-25, after push #9 (outdoors live, c7bca24) and the photo + fact pass. Phase 3 is complete. Items run in
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

## 1b. Living Here: outdoors (done Sep 25, 61 spots)

- A separate "Hunt, fish, paddle, ride" section with its own finder (Fishing, Boat launches, Paddle &
  raft, Hunting & ranges, Sleds & ATVs) and four rule cards (resident-price licenses for soldiers
  stationed here over 30 days, the Fort Drum Recreational Access Pass, hunter education, snowmobile
  registration). Every rule was read on the DEC, Fort Drum iSportsman, DMV or Lewis County page.
- Research caught and removed: a $5 range fee that isn't on MWR's page, a 10 hp limit DEC gives for
  Sixberry and Lake of the Woods but not Payne Lake, a "reopened" note for Butterfield Lake, "youth
  pass free" (not on the iSportsman page), and unsourced lot sizes, superlatives and prices.
- Pins that are an area, not a point: the Salmon River public fishing stretch is pinned to the
  village of Pulaski; the four snowmobile clubs to their home hamlets; the Lewis County ATV system
  to the county permit office in Lowville.
- Left out (reasons in the research file): Indian Lake (no pin; also needs a Fort Drum pass), three
  village docks (for visiting boats), the Black River "whitewater park" (only a city feasibility
  study), Black River Outfitters (site's security certificate expired, no current season; B.O.B.
  Rafting closed for 2026 by its own notice), over 75 minutes (Independence River and Otter Creek
  state forests, Southern Tug Hill Sno-Riders, Wilson Hill WMA, St. Lawrence County trails).
- Gaps: no DEC-run public shooting range exists in the four counties; Fort Drum's own range is
  limited (archery by reservation, trap and skeet for groups). The on-post lake names for fishing
  are in Fort Drum's recreation map PDF, which didn't parse; worth a manual read.
- The free fishing days in the licenses card are 2026 dates: update them when DEC posts 2027.

## 2. Photos (done Sep 25, except the owner's question)

- Provenance audit: none of the older site photos traced to a free license (fingerprint matching
  against Commons, Openverse, Unsplash and Pexels; the Thompson Park aerial carries a
  photographer's signature). Every place photo was replaced with a licensed one and credited on its
  page; 22 unlicensed or unused files left the site. Record: docs/research-2026-09/photo-provenance.json.
- **Owner question:** the homecoming hero (servicemember-returning-home, kept by the Sep 24 ruling),
  its copy on Buying, the "Arriving this month" tile (military-family) and the PCS Checklist hero
  (the Fort Novosel file) have no traced license. If they weren't bought, a public-domain 2014 Fort
  Drum homecoming in UCP ("Waiting to be reunited", DVIDS) is on hand.
- Still no free photos: Dry Hill and Snow Ridge, maple sugaring in the North Country, Chaumont Bay,
  snowmobiling on the Tug Hill. Options: the owner's own photos, or asking the venue.
- Share card: a real screenshot of the Living Here hero (images/og-2026-09-25.jpg). When the
  homepage hero's license is settled, each page can get its own hero screenshot.

## 3. Fact re-verification on pages built before the rule

- Done Sep 25: **Spouse HQ** (four wrong phone numbers, the relicensing date, a past job fair, HEAP,
  the NYSED permit wording), **homepage** (Singer Castle's rate had been credited to Boldt, veteran
  exemption and NYSED lines, unsourced heating/waitlist numbers, Thompson Park acreage, review
  counts) and **glossary** (BAH range, the SCRA lease rule, unsourced numbers).
- Left: **Directory** (re-verify the ~60 non-crisis records; reconcile Mountain Community Homes
  836-4168 vs 955-6644). Mob/Dep has two official numbers (772-0509 on the garrison directory,
  772-2848 on MWR): the site uses 772-0509; worth a test call.
- Joe's review counts (66 Zillow + 54 Facebook) live in data/partners.json as partner-supplied
  figures; the homepage no longer shows counts. Settle them in the partner-network pass (item 4).

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

- Done Sep 25: the tab bar CSS (identical in all 13 pages) moved into `css/chassis.css`; proven by
  full-page pixel diffs (0 differing pixels). The chapter-only rules (crumb, ruled lists, ask band)
  are small and differ slightly per page; left in place.
- The final Fable audit of Phase 3 didn't run (monthly spend limit); an Opus 5.5 audit ran instead.
  Run the Fable pass when the limit resets if the owner wants it.
- The rename of the site itself comes last (Phoenix Phase 6).
