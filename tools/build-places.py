"""Render the Living Here places finder from data/places.json.
python3 tools/build-places.py [data/places.json] [living-here.html]
Publishes only places whose facts were confirmed on an official page and that have a measured
drive time. The finder is written as static HTML between the PLACES markers (readable without
JavaScript and by search engines); the page's script only filters it."""
import html, json, sys, urllib.parse

DATA = sys.argv[1] if len(sys.argv) > 1 else "data/places.json"
PAGE = sys.argv[2] if len(sys.argv) > 2 else "living-here.html"
START, END = "<!--PLACES:START-->", "<!--PLACES:END-->"
SHOW_FIRST = 12

KIND = {  # category -> (finder group, label on the row)
    "park": ("parks", "Park"), "playground": ("parks", "Playground"), "splash-pad": ("water", "Splash pad"),
    "beach": ("water", "Beach"), "pool": ("water", "Pool"), "trail": ("nature", "Trail"),
    "nature-center": ("nature", "Nature center"), "waterfall": ("nature", "Waterfall"), "campground": ("nature", "Campground"),
    "museum": ("history", "Museum"), "historic-site": ("history", "Historic site"), "library": ("library", "Library"),
    "zoo-farm": ("animals", "Zoo & farm"), "pick-your-own": ("animals", "Farm"), "indoor-play": ("indoor", "Indoor play"),
    "bowling-skating": ("indoor", "Bowling & skating"), "theater": ("indoor", "Theater"), "winter": ("winter", "Winter fun"),
    "festival-venue": ("other", "Events"), "other": ("other", "More to do"),
}
GROUPS = [("all", "Any kind of place"), ("parks", "Parks & playgrounds"), ("water", "Beaches, pools & splash pads"),
          ("nature", "Trails & nature"), ("history", "Museums & history"), ("library", "Libraries"),
          ("animals", "Zoos & farms"), ("indoor", "Indoor fun"), ("winter", "Winter fun"), ("other", "More to do")]

def esc(s):
    return html.escape(str(s or ""), quote=True)

def row(p):
    group, label = KIND.get(p["category"], ("other", "More to do"))
    flags = []
    if p.get("cost") == "free": flags.append("free")
    if p.get("indoor"): flags.append("indoor")
    mins = p.get("drive_min")
    if (mins is not None and mins <= 20) or p.get("on_post"): flags.append("near")
    if p.get("on_post"): flags.append("post")
    if p["category"] == "winter" or "winter" in (p.get("season") or "").lower() or p.get("indoor"): flags.append("winter")
    meta = [esc(p.get("town")), label]
    if p.get("cost") == "free": meta.append("Free")
    if p.get("on_post"): meta.append("On post")
    facts = []
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

def main():
    places = json.load(open(DATA))
    # on-post places have no public map pin; they sort with the closest (post is where you start)
    live = [p for p in places if p.get("confidence", "confirmed") == "confirmed" and not p.get("closed")
            and (p.get("drive_min") is not None or p.get("on_post"))]
    live.sort(key=lambda p: (p["drive_min"] if p.get("drive_min") is not None else 5, p["name"]))
    groups_present = {KIND.get(p["category"], ("other",))[0] for p in live}
    opts = "".join(f'<option value="{k}">{v}</option>' for k, v in GROUPS if k == "all" or k in groups_present)
    rows = "\n".join(row(p) for p in live)
    block = f'''{START}
  <div class="pf-tools">
    <div class="chips" role="group" aria-label="Filter places">
      <button type="button" aria-pressed="true" data-f="all">All</button>
      <button type="button" aria-pressed="false" data-f="free">Free</button>
      <button type="button" aria-pressed="false" data-f="indoor">Indoor</button>
      <button type="button" aria-pressed="false" data-f="near">Under 20 min</button>
      <button type="button" aria-pressed="false" data-f="winter">Good in winter</button>
      <button type="button" aria-pressed="false" data-f="post">On post</button>
    </div>
    <label class="lf pf-kind"><span>Kind of place</span><select id="pfKind">{opts}</select></label>
  </div>
  <p class="pf-count" id="pfCount" role="status">{len(live)} places, closest first</p>
  <ul class="pf-list" id="pfList" data-show="{SHOW_FIRST}">
{rows}
  </ul>
  <button type="button" class="pf-more" id="pfMore">Show all {len(live)} places</button>
  {END}'''
    page = open(PAGE).read()
    if START not in page or END not in page:
        sys.exit(f"{PAGE} has no {START} ... {END} markers")
    i, j = page.index(START), page.index(END) + len(END)
    page = page[:i] + block + page[j:]
    page = page.replace("{{PLACES_COUNT}}", str(len(live)))
    open(PAGE, "w").write(page)
    print(f"published {len(live)} of {len(places)} places")

if __name__ == "__main__":
    main()
