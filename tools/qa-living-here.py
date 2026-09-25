"""QA for /living-here: the family places finder (filters, kind select, show all, pick links), the
outdoors finder (activity chips checked against the data, show all, photo), the suggestion form's
intercepted POST, the map, and page errors. Run against the local server:
python3 tools/qa-living-here.py [base_url] [page_path]"""
import sys, json
from urllib.parse import parse_qs
from playwright.sync_api import sync_playwright

BASE = sys.argv[1] if len(sys.argv) > 1 else "http://127.0.0.1:8611"
PAGE = sys.argv[2] if len(sys.argv) > 2 else "/living-here.html"

# what the outdoors chips should show, worked out from the data independently of the page
import importlib.util
sys.dont_write_bytecode = True  # loading build-places.py must not leave a __pycache__ in tools/
spec = importlib.util.spec_from_file_location("bp", "tools/build-places.py"); bp = importlib.util.module_from_spec(spec); spec.loader.exec_module(bp)
OUT = [q for q in json.load(open("data/places.json")) if q["category"] in bp.OUT_KIND and q.get("confidence", "confirmed") == "confirmed"
       and (q.get("on_post") or (q.get("drive_min") is not None and q["drive_min"] <= 75))]
WANT = {k: sum(1 for q in OUT if k == "all" or k in bp.OUT_KIND[q["category"]][0] + q.get("also", [])) for k, _ in bp.OUT_CHIPS}
R, FAIL = {}, []
def need(k, ok):
    if not ok: FAIL.append(k)

with sync_playwright() as p:
    b = p.chromium.launch()
    pg = b.new_page(viewport={"width": 390, "height": 844})
    errs = []
    pg.on("pageerror", lambda e: errs.append(str(e)))
    pg.on("console", lambda m: errs.append(m.text) if m.type == "error" else None)
    posts = []
    pg.route(BASE + "/", lambda r: (posts.append(parse_qs(r.request.post_data or "")), r.fulfill(status=200, body="ok")) if r.request.method == "POST" else r.continue_())
    pg.goto(BASE + PAGE, wait_until="networkidle")
    vis = "[...document.querySelectorAll('#pfList .pf')].filter(r => r.offsetParent !== null).length"
    total = pg.evaluate("document.querySelectorAll('#pfList .pf').length")
    R["rows"] = total; R["visible_first"] = pg.evaluate(vis)
    need("first_page", R["visible_first"] == min(12, total))
    R["sorted"] = pg.evaluate("(() => { const m = [...document.querySelectorAll('#pfList .pf')].map(r => +r.dataset.min); return m.every((v, i) => i === 0 || v >= m[i-1]); })()")
    need("sorted", R["sorted"])
    pg.click("#pfMore"); R["after_show_all"] = pg.evaluate(vis); need("show_all", R["after_show_all"] == total)
    pg.click("#places .pf-tools button[data-f='free']")
    R["free_rows"] = pg.evaluate(vis)
    R["free_all_tagged"] = pg.evaluate("[...document.querySelectorAll('#pfList .pf')].filter(r => r.offsetParent !== null).every(r => r.dataset.f.split(' ').includes('free'))")
    need("free_filter", R["free_rows"] > 0 and R["free_all_tagged"])
    pg.select_option("#pfKind", "library")
    R["free_libraries"] = pg.evaluate(vis)
    R["count_text"] = pg.text_content("#pfCount")
    pg.click("#places .pf-tools button[data-f='all']"); pg.select_option("#pfKind", "all")
    # a photo pick opens its place in the list
    pg.click(".pick[data-open='Thompson Park']"); pg.wait_for_timeout(400)
    R["pick_opens"] = pg.evaluate("[...document.querySelectorAll('#pfList details[open]')].map(d => d.querySelector('.pf-name').textContent)")
    need("pick_opens", "Thompson Park" in R["pick_opens"])
    # every visible row has an official page link
    R["rows_without_official_link"] = pg.evaluate("[...document.querySelectorAll('#pfList .pf')].filter(r => !r.querySelector('.pf-links a[href^=\"http\"]')).map(r => r.querySelector('.pf-name').textContent)")
    need("official_links", not R["rows_without_official_link"])
    # the outdoors finder: its own list, chips that match the data, show all, an official link on every row
    ovis = "[...document.querySelectorAll('#odList .pf')].filter(r => r.offsetParent !== null)"
    R["od_rows"] = pg.evaluate("document.querySelectorAll('#odList .pf').length"); need("od_rows", R["od_rows"] == WANT["all"])
    R["od_visible_first"] = pg.evaluate(ovis + ".length"); need("od_first_page", R["od_visible_first"] == min(10, WANT["all"]))
    R["od_sorted"] = pg.evaluate("(() => { const m = [...document.querySelectorAll('#odList .pf')].map(r => +r.dataset.min); return m.every((v, i) => i === 0 || v >= m[i-1]); })()")
    need("od_sorted", R["od_sorted"])
    R["od_chips"] = {}
    pg.click("#odMore")
    for k in WANT:
        pg.click(f"#outdoors .chips button[data-f='{k}']")
        got = pg.evaluate(ovis + ".length")
        tagged = pg.evaluate(ovis + f".every(r => '{k}' === 'all' || r.dataset.f.split(' ').includes('{k}'))")
        R["od_chips"][k] = [got, WANT[k]]
        need("od_chip_" + k, got == WANT[k] and got > 0 and tagged)
    R["od_count_text"] = pg.text_content("#odCount"); need("od_count_text", "spots" in R["od_count_text"])
    pg.click("#outdoors .chips button[data-f='all']")
    R["od_rows_without_official_link"] = pg.evaluate("[...document.querySelectorAll('#odList .pf')].filter(r => !r.querySelector('.pf-links a[href^=\"http\"]')).map(r => r.querySelector('.pf-name').textContent)")
    need("od_official_links", not R["od_rows_without_official_link"])
    R["ocount"] = pg.evaluate("[...document.querySelectorAll('.ocount')].map(e => +e.textContent)"); need("ocount", R["ocount"] and all(n == WANT["all"] for n in R["ocount"]))
    pg.locator(".od-photo").scroll_into_view_if_needed(); pg.wait_for_timeout(800)
    R["od_photo_loaded"] = pg.evaluate("(() => { const i = document.querySelector('.od-photo img'); return i.complete && i.naturalWidth > 0; })()")
    need("od_photo", R["od_photo_loaded"])
    # suggestion form keeps its Netlify name
    pg.fill("#sgSuggestion", "QA test place"); pg.click("#suggestForm button[type=submit]"); pg.wait_for_timeout(400)
    R["suggest_form_name"] = posts[-1].get("form-name") if posts else None
    need("suggest_form", R["suggest_form_name"] == ["discover-suggestion"])
    R["hscroll"] = pg.evaluate("document.documentElement.scrollWidth - innerWidth"); need("hscroll", R["hscroll"] == 0)
    pg.locator("#groceryMap").scroll_into_view_if_needed(); pg.wait_for_timeout(2500)
    R["map_ready"] = pg.evaluate("!!document.querySelector('#groceryMap.leaflet-container')")
    R["page_errors"] = errs; need("errors", not errs)
    b.close()
print(json.dumps(R, indent=1)); print("FAIL:", FAIL or "none"); sys.exit(1 if FAIL else 0)
