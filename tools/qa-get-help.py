"""QA for /get-help (Contact + Network merged, Sep 2026). Run against the local server:
python3 tools/qa-get-help.py [base_url]
Every form's POST is intercepted and read back; nothing is sent. Checks the four Netlify form
names are unchanged (submissions keep landing in the same Netlify forms), the ?need=&area=
prefill that old pcshomes-contact links carry, partner cards, filters, both modals, and anchors."""
import sys, json
from urllib.parse import parse_qs
from playwright.sync_api import sync_playwright

BASE = sys.argv[1] if len(sys.argv) > 1 else "http://127.0.0.1:8611"
URL = BASE + "/get-help.html"
R, FAIL = {}, []
def need(name, ok):
    if not ok: FAIL.append(name)

with sync_playwright() as p:
    b = p.chromium.launch()
    pg = b.new_page(viewport={"width": 390, "height": 844})
    errs = []
    pg.on("pageerror", lambda e: errs.append(str(e)))
    pg.on("console", lambda m: errs.append(m.text) if m.type == "error" else None)
    posts = []
    pg.route(BASE + "/", lambda r: (posts.append(parse_qs(r.request.post_data or "")), r.fulfill(status=200, body="ok")) if r.request.method == "POST" else r.continue_())

    # prefill from an old-style link: ?need=agent&area=Watertown#contactForm
    pg.goto(URL + "?need=agent&area=Watertown&utm_source=qa#contactForm", wait_until="networkidle")
    R["prefill_need"] = pg.evaluate("document.getElementById('needTypeInput').value")
    R["prefill_area"] = pg.evaluate("document.getElementById('areaInput').value")
    R["prefill_pressed"] = pg.evaluate("document.querySelector('.inquiry-type[aria-pressed=true]') && document.querySelector('.inquiry-type[aria-pressed=true]').dataset.type")
    need("prefill", R["prefill_need"] == "real-estate-agent" and R["prefill_area"] == "Watertown" and R["prefill_pressed"] == "real-estate-agent")
    R["anchors"] = pg.evaluate("['contactForm','network','partner-apply'].map(id => !!document.getElementById(id))")
    need("anchors", all(R["anchors"]))

    # 1. the contact form (the working lead path)
    pg.fill("#firstName", "QA"); pg.fill("#lastName", "Test"); pg.fill("#email", "qa@example.com")
    pg.click("#pcshomesForm button[type=submit]"); pg.wait_for_timeout(500)
    c = posts[-1] if posts else {}
    R["contact_post"] = {k: c.get(k, [None])[0] for k in ("form-name", "need-type", "area", "first-name", "email", "lead-source")}
    need("contact_post", c.get("form-name") == ["pcshomes-contact"] and c.get("need-type") == ["real-estate-agent"] and c.get("area") == ["Watertown"])
    R["contact_success"] = pg.is_visible("#successState")
    need("contact_success", R["contact_success"])

    # partner cards render from /data/partners.json; filters show and hide them
    pg.wait_for_selector(".vendor-card", timeout=5000)
    R["cards"] = pg.locator(".vendor-card").count()
    need("cards", R["cards"] >= 1)
    pg.locator(".filter-btn", has_text="VA Lenders").click()
    R["filter_lenders_visible"] = pg.evaluate("[...document.querySelectorAll('.vendor-card')].filter(c => c.style.display !== 'none').length")
    pg.locator(".filter-btn", has_text="All").click()
    R["filter_all_visible"] = pg.evaluate("[...document.querySelectorAll('.vendor-card')].filter(c => c.style.display !== 'none').length")
    need("filters", R["filter_all_visible"] == R["cards"])

    # 2. Request Info modal on a partner card
    btn = pg.locator("[data-request-name]").first
    if btn.count():
        btn.scroll_into_view_if_needed(); btn.click(); pg.wait_for_timeout(300)
        R["modal_open"] = pg.evaluate("document.getElementById('vendorModal').classList.contains('open')")
        pg.fill("#vrName", "QA Test"); pg.fill("#vrContact", "qa@example.com")
        pg.click("#vendorRequestForm button[type=submit]"); pg.wait_for_timeout(500)
        v = posts[-1]
        R["vendor_post"] = {k: v.get(k, [None])[0] for k in ("form-name", "vendor-name", "name")}
        need("vendor_post", v.get("form-name") == ["vendor-request"] and bool(v.get("vendor-name")))
        pg.keyboard.press("Escape")
    else:
        R["vendor_post"] = "no Request Info button on any active card"
        FAIL.append("vendor_post")

    # 3. partner application on the plate
    pg.fill("#paCompany", "QA Co"); pg.fill("#paContactName", "QA Test"); pg.fill("#paEmail", "qa@example.com")
    pg.select_option("#paCategory", "Home Services")
    pg.click("#partnerForm button[type=submit]"); pg.wait_for_timeout(500)
    a = posts[-1]
    R["application_post"] = {k: a.get(k, [None])[0] for k in ("form-name", "company", "category")}
    need("application_post", a.get("form-name") == ["vendor-application"])

    # 4. partner inquiry modal
    pg.evaluate("openPartnerModal()"); pg.wait_for_timeout(200)
    pg.fill("#piFullName", "QA Test"); pg.fill("#piBusinessName", "QA Co"); pg.select_option("#piBusinessType", "Other")
    pg.fill("#piPhone", "3155550100"); pg.fill("#piEmail", "qa@example.com")
    pg.evaluate("submitPartnerInquiry()"); pg.wait_for_timeout(500)
    q = posts[-1]
    R["inquiry_post"] = {k: q.get(k, [None])[0] for k in ("form-name", "business-name")}
    need("inquiry_post", q.get("form-name") == ["partner-inquiry"])

    R["forms_in_html"] = pg.evaluate("[...document.querySelectorAll('form[data-netlify=true]')].map(f => f.getAttribute('name'))")
    need("forms_in_html", sorted(R["forms_in_html"]) == sorted(["pcshomes-contact", "vendor-request", "vendor-application", "partner-inquiry"]))
    R["page_errors"] = errs
    need("page_errors", not errs)
    b.close()

print(json.dumps(R, indent=1))
print("FAIL:", FAIL if FAIL else "none")
sys.exit(1 if FAIL else 0)
