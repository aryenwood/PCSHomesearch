"""QA for a Fort Drum chapter page and the guide hub it left. Run against the local server:
python3 tools/qa-chapter.py [base_url] [chapter_path] [hash_to_forward] [district_id or - to skip]
Checks: console clean, no horizontal scroll at 390/768/1440, screenshots, expander + hash-open,
ask-band POST body (intercepted, nothing sent), every same-site link resolves, and the hub's
old #hash forwards to the chapter, and the Housing chapter's map initializes."""
import json, sys, os
from urllib.parse import urljoin, urlparse
from playwright.sync_api import sync_playwright

BASE = sys.argv[1] if len(sys.argv) > 1 else "http://127.0.0.1:8611"
CHAPTER = sys.argv[2] if len(sys.argv) > 2 else "/fort-drum/schools.html"
HASH = sys.argv[3] if len(sys.argv) > 3 else "schools"
DISTRICT = sys.argv[4] if len(sys.argv) > 4 else "carthage"
OUT = os.environ.get("QA_OUT", ".")
report = {"chapter": CHAPTER}

with sync_playwright() as p:
    b = p.chromium.launch()
    # widths + console
    report["widths"] = {}
    for w, h in ((390, 844), (768, 1024), (1440, 900)):
        pg = b.new_page(viewport={"width": w, "height": h}, device_scale_factor=1)
        errs = []
        pg.on("console", lambda m, errs=errs: errs.append(m.text) if m.type == "error" else None)
        pg.on("pageerror", lambda e, errs=errs: errs.append(str(e)))
        bad = []
        pg.on("response", lambda r, bad=bad: bad.append(f"{r.status} {r.url}") if r.status >= 400 and urlparse(r.url).netloc == urlparse(BASE).netloc else None)
        pg.goto(BASE + CHAPTER, wait_until="networkidle")
        pg.evaluate("document.querySelectorAll('.rv').forEach(e=>e.classList.add('in'))")
        pg.wait_for_timeout(300)
        report["widths"][w] = {"hscroll": pg.evaluate("document.documentElement.scrollWidth - window.innerWidth"),
                               "console_errors": errs, "failed_requests": bad,
                               "css_loaded": pg.evaluate("getComputedStyle(document.body).backgroundColor")}
        pg.screenshot(path=os.path.join(OUT, f"chapter-{w}.png"), full_page=False)
        pg.close()

    pg = b.new_page(viewport={"width": 390, "height": 844})
    pg.goto(BASE + CHAPTER, wait_until="networkidle")
    if DISTRICT != "-" and pg.evaluate("!!document.querySelector('details.dx')"):
        # expander + hash-open (chapters that have district expanders)
        pg.goto(BASE + CHAPTER + "#" + DISTRICT, wait_until="networkidle")
        report["hash_opens_district"] = pg.evaluate(f"document.querySelector('#{DISTRICT} details.dx').open")
        pg.goto(BASE + CHAPTER, wait_until="networkidle")
        closed = pg.evaluate("[...document.querySelectorAll('details.dx')].every(d => !d.open)")
        pg.locator("details.dx summary").first.click()
        report["expanders_closed_by_default"] = closed
        report["expander_opens_on_tap"] = pg.evaluate("document.querySelector('details.dx').open")

    # ask band: intercept the POST, never send it
    posted = {}
    def handle(route):
        posted["body"] = route.request.post_data
        route.fulfill(status=200, body="ok")
    pg.route(BASE + "/", handle)
    if pg.locator(".ask-band").count():
        pg.fill(".ask-band [name=name]", "QA Test")
        pg.fill(".ask-band [name=contact]", "qa@example.com")
        pg.click(".ask-band button[type=submit]")
        pg.wait_for_timeout(500)
        report["ask_post_body"] = posted.get("body")
        report["ask_success_shown"] = pg.evaluate("getComputedStyle(document.querySelector('.ask-done')).display") != "none"
    else:
        # chapters next to crisis numbers (Healthcare) carry no lead form, by rule
        report["ask_post_body"] = "no ask band on this chapter"
        report["ask_success_shown"] = None

    # every same-site link resolves (clean /fort-drum/<x> URLs are Netlify pretty URLs: test the .html)
    hrefs = pg.evaluate("[...document.querySelectorAll('a[href]')].map(a => a.getAttribute('href'))")
    broken = []
    for h in sorted(set(hrefs)):
        if h.startswith(("tel:", "mailto:", "sms:", "http", "#")):
            continue
        path = h.split("#")[0]
        # clean URLs (/fort-drum/x, /get-help, /living-here) are Netlify pretty URLs: test the .html
        if path not in ("", "/") and "." not in path.rsplit("/", 1)[-1]:
            path = path.split("?")[0] + ".html"
        r = pg.request.get(urljoin(BASE + CHAPTER, path))
        if r.status >= 400:
            broken.append(f"{r.status} {h}")
    report["internal_links_checked"] = len([h for h in set(hrefs) if not h.startswith(("tel:", "mailto:", "sms:", "http", "#"))])
    report["broken_internal_links"] = broken

    # hub: old #hash forwards; map still boots
    nav = []
    pg2 = b.new_page()
    pg2.on("framenavigated", lambda f: nav.append(f.url) if f == pg2.main_frame else None)
    try:
        pg2.goto(BASE + "/pcshomes-fortdrum.html#" + HASH, wait_until="domcontentloaded", timeout=15000)
    except Exception:
        pass
    pg2.wait_for_timeout(800)
    report["hub_forward_navigations"] = nav[-2:]
    pg3 = b.new_page()
    errs3 = []
    pg3.on("pageerror", lambda e: errs3.append(str(e)))
    pg3.goto(BASE + "/pcshomes-fortdrum.html", wait_until="networkidle")
    report["hub_page_errors"] = errs3[:]
    # the neighborhood map moved from the hub to the Housing chapter (Sep 24 2026)
    pg3.goto(BASE + "/fort-drum/housing.html", wait_until="networkidle")
    pg3.wait_for_timeout(1500)
    report["housing_map_initialized"] = pg3.evaluate("!!document.querySelector('#drumMap.leaflet-container')")
    report["housing_page_errors"] = errs3[len(report["hub_page_errors"]):]
    b.close()

print(json.dumps(report, indent=1))
