"""Render the Living Here finders from data/places.json.
python3 tools/build-places.py [data/places.json] [living-here.html]
Publishes only places whose facts were confirmed on an official page and that have a measured
drive time. Two finders, each written as static HTML between its markers (readable without
JavaScript and by search engines); the page's script only filters them:
  PLACES   family places (parks, beaches, museums...), filtered by flags and a kind select
  OUTDOORS fishing, boating, hunting, ranges and trail riding, filtered by activity"""
import html, json, sys, urllib.parse

DATA = sys.argv[1] if len(sys.argv) > 1 else "data/places.json"
PAGE = sys.argv[2] if len(sys.argv) > 2 else "living-here.html"
START, END = "<!--PLACES:START-->", "<!--PLACES:END-->"
OUT_START, OUT_END = "<!--OUTDOORS:START-->", "<!--OUTDOORS:END-->"
SHOW_FIRST = 12
OUT_SHOW_FIRST = 10

KIND = {  # category -> (finder group, label on the row)
    "park": ("parks", "Park"), "playground": ("parks", "Playground"), "splash-pad": ("water", "Splash pad"),
    "beach": ("water", "Beach"), "pool": ("water", "Pool"), "trail": ("nature", "Trail"),
    "nature-center": ("nature", "Nature center"), "waterfall": ("nature", "Waterfall"), "campground": ("nature", "Campground"),
    "museum": ("history", "Museum"), "historic-site": ("history", "Historic site"), "library": ("library", "Library"),
    "zoo-farm": ("animals", "Zoo & farm"), "pick-your-own": ("animals", "Farm"), "indoor-play": ("indoor", "Indoor play"),
    "bowling-skating": ("indoor", "Bowling & skating"), "theater": ("indoor", "Theater"), "winter": ("winter", "Winter fun"),
    "festival-venue": ("other", "Events"), "other": ("other", "More to do"),
}
OUT_KIND = {  # category -> (activities it belongs to, label on the row); the first activity is its group
    "fishing": (["fish"], "Fishing access"), "ice-fishing": (["fish"], "Ice fishing"),
    "boat-launch": (["launch"], "Boat launch"),
    "paddling": (["paddle"], "Paddling"), "rafting": (["paddle"], "Whitewater rafting"), "rental": (["paddle"], "Boat & gear rental"),
    "hunting": (["hunt"], "Hunting land"), "wildlife-area": (["hunt"], "Wildlife area"), "shooting-range": (["hunt"], "Shooting range"),
    "snowmobile": (["ride"], "Snowmobile trails"), "atv": (["ride"], "ATV trails"),
}
# six chips so the row splits evenly at every width (6, 3 + 3, 2 + 2 + 2)
OUT_CHIPS = [("all", "All"), ("fish", "Fishing"), ("launch", "Boat launches"), ("paddle", "Paddle & raft"),
             ("hunt", "Hunting & ranges"), ("ride", "Sleds & ATVs")]
GROUPS = [("all", "Any kind of place"), ("parks", "Parks & playgrounds"), ("water", "Beaches, pools & splash pads"),
          ("nature", "Trails & nature"), ("history", "Museums & history"), ("library", "Libraries"),
          ("animals", "Zoos & farms"), ("indoor", "Indoor fun"), ("winter", "Winter fun"), ("other", "More to do")]

def esc(s):
    return html.escape(str(s or ""), quote=True)

def row(p):
    if p["category"] in OUT_KIND:
        acts, label = OUT_KIND[p["category"]]
        acts = acts + [a for a in p.get("also", []) if a not in acts]
        group, flags = acts[0], list(acts)
    else:
        group, label = KIND.get(p["category"], ("other", "More to do"))
        flags = []
    mins = p.get("drive_min")
    if p["category"] not in OUT_KIND:
        if p.get("cost") == "free": flags.append("free")
        if p.get("indoor"): flags.append("indoor")
        if (mins is not None and mins <= 20) or p.get("on_post"): flags.append("near")
        if p.get("on_post"): flags.append("post")
        if p["category"] == "winter" or "winter" in (p.get("season") or "").lower() or p.get("indoor"): flags.append("winter")
    # an on-post row already says "On post"; naming the town Fort Drum as well only repeats it
    meta = ([] if p.get("on_post") and p.get("town") == "Fort Drum" else [esc(p.get("town"))]) + [label]
    if p.get("cost") == "free": meta.append("Free")
    if p.get("on_post"): meta.append("On post")
    facts = []
    if p["category"] in OUT_KIND and p.get("cost") and p["cost"] not in ("free", "paid", "fee varies", "unknown"):
        facts.append(f'<span><b>Cost:</b> {esc(p["cost"])}</span>')
    if p.get("species"): facts.append(f'<span><b>Fish:</b> {esc(", ".join(p["species"]))}</span>')
    if p.get("season"): facts.append(f'<span><b>When:</b> {esc(p["season"])}</span>')
    if p.get("address"): facts.append(f'<span><b>Where:</b> {esc(p["address"])}</span>')
    if p.get("phone"):
        digits = "".join(c for c in p["phone"] if c.isdigit())
        if len(digits) == 10: digits = "1" + digits
        facts.append(f'<span><b>Call:</b> <a href="tel:+{digits}">{esc(p["phone"])}</a></span>')
    links = []
    if p.get("official_url"):
        links.append(f'<a href="{esc(p["official_url"])}" target="_blank" rel="noopener">Official page &rarr;</a>')
    if p.get("lat") is not None:
        dest = f'{p["lat"]},{p["lon"]}'
        links.append(f'<a href="https://www.google.com/maps/dir/?api=1&amp;destination={urllib.parse.quote(dest)}" target="_blank" rel="noopener">Directions &rarr;</a>')
    body = f'<p>{esc(p.get("what_to_do"))}</p>'
    if p.get("good_for_kids"): body += f'<p class="pf-kids"><b>With kids:</b> {esc(p["good_for_kids"])}</p>'
    if facts: body += '<p class="pf-facts">' + "".join(facts) + "</p>"
    body += '<p class="pf-links">' + "".join(links) + "</p>"
    when = f"{mins} min" if mins is not None else "On post"
    return (f'      <li class="pf" data-group="{group}" data-f="{" ".join(flags)}" data-min="{mins if mins is not None else 5}">'
            f'<details><summary><span class="pf-name">{esc(p["name"])}</span>'
            f'<span class="pf-meta">{" &middot; ".join(meta)}</span>'
            f'<span class="pf-min">{when}</span></summary>'
            f'<div class="pf-body">{body}</div></details></li>')

def block(start, end, rows, tools, count_id, list_id, more_id, noun, show):
    n = len(rows)
    return f'''{start}
  <div class="finder" data-noun="{noun}">
  <div class="pf-tools{"" if "<select" in tools else " solo"}">
{tools}
  </div>
  <p class="pf-count" id="{count_id}" role="status">{n} {noun}, closest first</p>
  <ul class="pf-list" id="{list_id}" data-show="{show}">
{chr(10).join(rows)}
  </ul>
  <button type="button" class="pf-more" id="{more_id}">Show all {n} {noun}</button>
  </div>
  {end}'''

def chips(items, label):
    b = "".join(f'<button type="button" aria-pressed="{"true" if k == "all" else "false"}" data-f="{k}">{v}</button>' for k, v in items)
    return f'    <div class="chips" role="group" aria-label="{label}">{b}</div>'

def splice(page, start, end, text):
    if start not in page or end not in page:
        sys.exit(f"{PAGE} has no {start} ... {end} markers")
    i, j = page.index(start), page.index(end) + len(end)
    return page[:i] + text + page[j:]

def main():
    import re
    places = json.load(open(DATA))
    # on-post places have no public map pin; they sort with the closest (post is where you start)
    live = [p for p in places if p.get("confidence", "confirmed") == "confirmed" and not p.get("closed")
            and (p.get("drive_min") is not None or p.get("on_post"))]
    live.sort(key=lambda p: (p["drive_min"] if p.get("drive_min") is not None else 5, p["name"]))
    family = [p for p in live if p["category"] not in OUT_KIND]
    outdoors = [p for p in live if p["category"] in OUT_KIND]

    groups_present = {KIND.get(p["category"], ("other",))[0] for p in family}
    opts = "".join(f'<option value="{k}">{v}</option>' for k, v in GROUPS if k == "all" or k in groups_present)
    fam_tools = (chips([("all", "All"), ("free", "Free"), ("indoor", "Indoor"), ("near", "Under 20 min"),
                        ("winter", "Good in winter"), ("post", "On post")], "Filter places") +
                 f'\n    <label class="lf pf-kind"><span>Kind of place</span><select id="pfKind">{opts}</select></label>')
    acts = {a for p in outdoors for a in OUT_KIND[p["category"]][0] + p.get("also", [])}
    missing = [k for k, _ in OUT_CHIPS[1:] if k not in acts]
    if outdoors and missing:
        sys.exit(f"outdoors chips with no places: {missing} (a chip that shows nothing is a dead end)")

    page = open(PAGE).read()
    page = splice(page, START, END, block(START, END, [row(p) for p in family], fam_tools,
                                          "pfCount", "pfList", "pfMore", "places", SHOW_FIRST))
    if OUT_START in page:
        page = splice(page, OUT_START, OUT_END, block(OUT_START, OUT_END, [row(p) for p in outdoors],
                                                      chips(OUT_CHIPS, "Filter by activity"),
                                                      "odCount", "odList", "odMore", "spots", OUT_SHOW_FIRST))
    page = page.replace("{{PLACES_COUNT}}", str(len(family)))
    # every count on the page follows the data
    page = re.sub(r'<span class="pcount">\d+</span>', f'<span class="pcount">{len(family)}</span>', page)
    page = re.sub(r'<span class="ocount">\d+</span>', f'<span class="ocount">{len(outdoors)}</span>', page)
    open(PAGE, "w").write(page)
    print(f"published {len(family)} family places + {len(outdoors)} outdoors spots of {len(places)} records")

if __name__ == "__main__":
    main()
