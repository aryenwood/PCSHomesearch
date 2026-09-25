"""QA for /living-here: the places finder (filters, kind select, show all, pick links),
the suggestion form's intercepted POST, the map, and page errors. Run against the local server:
python3 tools/qa-living-here.py [base_url]"""
import sys, json
from urllib.parse import parse_qs
from playwright.sync_api import sync_playwright

BASE = sys.argv[1] if len(sys.argv) > 1 else "http://127.0.0.1:8611"
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
    pg.goto(BASE + "/living-here.html", wait_until="networkidle")
    vis = "[...document.querySelectorAll('#pfList .pf')].filter(r => r.offsetParent !== null).length"
    total = pg.evaluate("document.querySelectorAll('#pfList .pf').length")
    R["rows"] = total; R["visible_first"] = pg.evaluate(vis)
    need("first_page", R["visible_first"] == min(12, total))
    R["sorted"] = pg.evaluate("(() => { const m = [...document.querySelectorAll('#pfList .pf')].map(r => +r.dataset.min); return m.every((v, i) => i === 0 || v >= m[i-1]); })()")
    need("sorted", R["sorted"])
    pg.click("#pfMore"); R["after_show_all"] = pg.evaluate(vis); need("show_all", R["after_show_all"] == total)
    pg.click(".pf-tools button[data-f='free']")
    R["free_rows"] = pg.evaluate(vis)
    R["free_all_tagged"] = pg.evaluate("[...document.querySelectorAll('#pfList .pf')].filter(r => r.offsetParent !== null).every(r => r.dataset.f.split(' ').includes('free'))")
    need("free_filter", R["free_rows"] > 0 and R["free_all_tagged"])
    pg.select_option("#pfKind", "library")
    R["free_libraries"] = pg.evaluate(vis)
    R["count_text"] = pg.text_content("#pfCount")
    pg.click(".pf-tools button[data-f='all']"); pg.select_option("#pfKind", "all")
    # a photo pick opens its place in the list
    pg.click(".pick[data-open='Thompson Park']"); pg.wait_for_timeout(400)
    R["pick_opens"] = pg.evaluate("[...document.querySelectorAll('#pfList details[open]')].map(d => d.querySelector('.pf-name').textContent)")
    need("pick_opens", "Thompson Park" in R["pick_opens"])
    # every visible row has an official page link
    R["rows_without_official_link"] = pg.evaluate("[...document.querySelectorAll('#pfList .pf')].filter(r => !r.querySelector('.pf-links a[href^=\"http\"]')).map(r => r.querySelector('.pf-name').textContent)")
    need("official_links", not R["rows_without_official_link"])
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
