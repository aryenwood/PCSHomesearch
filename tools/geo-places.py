"""Locate each place on OpenStreetMap and measure the drive from Fort Drum's Main Gate.
python3 tools/geo-places.py data/places.json
- Nominatim (1 request a second, per its usage policy) finds lat/lon from the address, else the bare name
  (accepted only if the match is in the place's town or county), else name + town.
  The OSM id is kept as evidence; a place Nominatim can't find stays unlocated (never guessed).
- Street addresses with a house number go to the US Census Bureau geocoder first.
- OSRM (router.project-osrm.org) measures driving minutes and miles from the Main Gate
  (Lt. Gen. Paul Cerjan Gate, OSM node 212623068, 44.0514,-75.8254), no traffic or snow.
Writes the file back in place. Re-running skips places already located."""
import json, ssl, sys, time, urllib.parse, urllib.request
try:
    import certifi  # python.org builds on macOS ship without system CA certs
    CTX = ssl.create_default_context(cafile=certifi.where())
except ImportError:
    CTX = ssl.create_default_context()

GATE = (44.0514, -75.8254)
UA = {"User-Agent": "PCSHomes places builder (pcshomes.com; contact via site)"}
# keep geocodes inside the North Country so a common name can't land in another state
VIEWBOX = "-76.6,44.6,-74.9,43.3"

def get(url):
    req = urllib.request.Request(url, headers=UA)
    with urllib.request.urlopen(req, timeout=30, context=CTX) as r:
        return json.load(r)

def census(addr):
    """US Census Bureau geocoder: official, and better than OSM on rural house numbers."""
    url = "https://geocoding.geo.census.gov/geocoder/locations/onelineaddress?" + urllib.parse.urlencode(
        {"address": addr, "benchmark": "Public_AR_Current", "format": "json"})
    try:
        m = get(url)["result"]["addressMatches"]
    except Exception as e:
        print("  census error", e); return None
    if not m: return None
    c = m[0]["coordinates"]
    return float(c["y"]), float(c["x"]), "census:" + m[0]["matchedAddress"], addr

def geocode(p):
    import re
    addr0 = p.get("address") or ""
    if re.match(r"^\d+\s", addr0):
        g = census(addr0)
        if g: return g
    clean = re.sub(r"\s*\(.*?\)", "", p["name"]).strip()
    town, county = (p.get("town") or "").lower(), (p.get("county") or "").lower().replace(" county", "")
    # (query, must the result mention the place's town or county?)
    queries = []
    if p.get("address"): queries.append((p["address"], False))
    queries += [(clean, True), (f'{clean}, {p.get("town", "")}, New York', False)]
    # last resort: the street from the official address plus the town (lands on the right road, close enough for a drive time)
    addr = p.get("address") or ""
    street = re.sub(r"^\d+\s+", "", addr.split(",")[0]).strip()
    if street and not street.lower().startswith(("bldg", "off ", "trailhead", "end of", "about")):
        queries.append((f'{street}, {p.get("town", "").split("(")[0].strip()}, New York', False))
    for q, check in queries:
        url = "https://nominatim.openstreetmap.org/search?" + urllib.parse.urlencode(
            {"q": q, "format": "jsonv2", "limit": 3, "countrycodes": "us", "viewbox": VIEWBOX, "bounded": 1})
        time.sleep(1.1)
        try:
            res = get(url)
        except Exception as e:
            print("  nominatim error", e); continue
        for r in res:
            dn = r["display_name"].lower()
            # a bare-name match must land in the right town or county, so a same-named park elsewhere can't slip in
            # the town has to match; a county match alone let a same-named park in another village through
            if check and not (town and town.split(",")[0].split("(")[0].strip() in dn):
                continue
            return float(r["lat"]), float(r["lon"]), f'{r["osm_type"]}/{r["osm_id"]}', q
    return None

def main(path):
    places = json.load(open(path))
    for p in places:
        if p.get("lat") is not None: continue
        g = geocode(p)
        if g:
            p["lat"], p["lon"], p["osm"], p["geocoded_from"] = round(g[0], 5), round(g[1], 5), g[2], g[3]
            print("located", p["name"], p["lat"], p["lon"])
        else:
            p["lat"] = p["lon"] = None
            print("NOT FOUND", p["name"])
    located = [p for p in places if p.get("lat") is not None and p.get("drive_min") is None]
    for i in range(0, len(located), 90):
        batch = located[i:i + 90]
        coords = ";".join([f"{GATE[1]},{GATE[0]}"] + [f'{p["lon"]},{p["lat"]}' for p in batch])
        url = f"https://router.project-osrm.org/table/v1/driving/{coords}?sources=0&annotations=duration,distance"
        try:
            t = get(url)
            for p, d, m in zip(batch, t["durations"][0][1:], t["distances"][0][1:]):
                if d is not None:
                    p["drive_min"] = round(d / 60)
                    p["drive_mi"] = round(m / 1609.344, 1)
        except Exception as e:
            print("osrm error", e)
        time.sleep(1)
    json.dump(places, open(path, "w"), indent=1, ensure_ascii=False)
    print("located", sum(1 for p in places if p.get("lat") is not None), "of", len(places),
          "| with drive time", sum(1 for p in places if p.get("drive_min") is not None))

if __name__ == "__main__":
    main(sys.argv[1] if len(sys.argv) > 1 else "data/places.json")
