"""QA for /fort-drum/buying: both calculators against an independent computation, and both
ask bands' intercepted POST bodies. Run against the local server:
python3 tools/qa-buying.py [base_url] [page_path]
Pass a mutated copy as page_path to prove the checks fail when the math is wrong."""
import sys, json
from urllib.parse import parse_qs
from playwright.sync_api import sync_playwright

BASE = sys.argv[1] if len(sys.argv) > 1 else "http://127.0.0.1:8611"
PAGE = sys.argv[2] if len(sys.argv) > 2 else "/fort-drum/buying.html"
R, FAIL = {}, []

def pi(loan, pct):
    r = pct / 1200
    return loan * r / (1 - (1 + r) ** -360)

def bal(loan, pct, k):
    r = pct / 1200
    p = pi(loan, pct)
    return loan * (1 + r) ** k - p * ((1 + r) ** k - 1) / r

def fee(price, down, kind):
    if kind == "exempt": return 0
    s = down / price
    if s >= .10: return 1.25
    if s >= .05: return 1.5
    return 3.3 if kind == "subsequent" else 2.15

def expect(price, down, kind, pct, tax):
    loan = (price - down) * (1 + fee(price, down, kind) / 100)
    return loan, pi(loan, pct) + price * tax / 100 / 12

def dollars(t):
    return int(t.replace("$", "").replace(",", "").replace("+", "").replace("−", "-").strip() or 0)

def check(name, got, want, tol=1):
    ok = abs(got - want) <= tol
    R[name] = {"got": got, "want": round(want)}
    if not ok: FAIL.append(name)

with sync_playwright() as p:
    b = p.chromium.launch()
    pg = b.new_page(viewport={"width": 390, "height": 844})
    errs = []
    pg.on("pageerror", lambda e: errs.append(str(e)))
    pg.goto(BASE + PAGE, wait_until="networkidle")
    out = lambda: dollars(pg.text_content("#payOut"))

    # defaults: $200k, $0 down, first use, 7.0%, 1.5% tax
    _, want = expect(200000, 0, "first", 7, 1.5)
    check("default_payment", out(), want)
    # rank fills BAH in both calculators
    pg.select_option("#bahRank", label="E-5 with dependents ($1,665)")
    R["rank_fills_bah"] = [pg.input_value("#bah"), pg.input_value("#rvbBah")]
    if R["rank_fills_bah"] != ["1665", "1665"]: FAIL.append("rank_fills_bah")
    check("bah_left", dollars(pg.text_content("#bahNote").split(" a month")[0]), 1665 - round(want))
    # rate preset
    pg.click(".rates button[data-rate='6.5']")
    _, want = expect(200000, 0, "first", 6.5, 1.5)
    check("rate_6_5", out(), want)
    R["pressed"] = pg.evaluate("[...document.querySelectorAll('.rates button[aria-pressed=true]')].map(b=>b.dataset.rate)")
    if R["pressed"] != ["6.5"]: FAIL.append("pressed")
    # custom rate
    pg.click(".rates button[data-rate='custom']")
    R["custom_visible"] = pg.is_visible("#customRate")
    pg.fill("#customRate", "6.9")
    _, want = expect(200000, 0, "first", 6.9, 1.5)
    check("custom_6_9", out(), want)
    # funding fee: used before, exempt, 10% down tier
    pg.click(".rates button[data-rate='7']")
    pg.select_option("#feeType", "subsequent")
    _, want = expect(200000, 0, "subsequent", 7, 1.5); check("fee_subsequent", out(), want)
    pg.select_option("#feeType", "exempt")
    _, want = expect(200000, 0, "exempt", 7, 1.5); check("fee_exempt", out(), want)
    pg.select_option("#feeType", "first")
    pg.fill("#downPayment", "20000")
    _, want = expect(200000, 20000, "first", 7, 1.5); check("fee_10pct_down", out(), want)
    pg.fill("#downPayment", "0")
    pg.fill("#taxPct", "3")
    _, want = expect(200000, 0, "first", 7, 3); check("tax_3pct", out(), want)
    pg.fill("#taxPct", "1.5")

    # rent vs. buy: hidden until asked, then matches the independent math
    R["rvb_hidden_first"] = pg.evaluate("document.getElementById('rvbOut').hidden")
    pg.click("#rvbGo")
    R["rvb_shown"] = pg.is_visible("#rvbOut") and not pg.is_visible("#rvbGo")
    loan, house = expect(200000, 0, "first", 7, 1.5)
    check("rvb_house", dollars(pg.text_content("#cHouse1")), house)
    check("rvb_buy_total", dollars(pg.text_content("#cTotal1")), house + 350 + 125)
    check("rvb_rent_total", dollars(pg.text_content("#cTotal2")), 1400 + 350 + 125)
    check("rvb_left_buy", dollars(pg.text_content("#cLeft1").replace("/mo", "")), 1665 - (house + 475), tol=2)
    check("rvb_paid", dollars(pg.text_content("#cPaid")), loan - bal(loan, 7, 36))
    check("rvb_equity", dollars(pg.text_content("#cEquity")), 200000 * 1.03 ** 3 - bal(loan, 7, 36))
    pg.select_option("#rvbIncl", "yes")
    R["rvb_included"] = pg.text_content("#cWater2")
    if R["rvb_included"] != "Included": FAIL.append("rvb_included")
    check("rvb_rent_total_incl", dollars(pg.text_content("#cTotal2")), 1400 + 350)
    R["verdict"] = pg.text_content("#rvbVerdict")[:90]

    # both ask bands post to popup-lead with their own offer
    bodies = []
    pg.route(BASE + "/", lambda route: (bodies.append(route.request.post_data), route.fulfill(status=200, body="ok")))
    for i in range(2):
        band = pg.locator(".ask-band").nth(i)
        band.locator("[name=name]").fill("QA Test")
        band.locator("[name=contact]").fill("qa@example.com")
        band.locator("button[type=submit]").click()
        pg.wait_for_timeout(300)
    R["ask_offers"] = [parse_qs(x).get("offer", [None])[0] for x in bodies]
    R["ask_forms"] = [parse_qs(x).get("form-name", [None])[0] for x in bodies]
    if R["ask_offers"] != ["va-calculator", "rent-vs-buy"] or R["ask_forms"] != ["popup-lead"] * 2: FAIL.append("ask_bands")
    R["page_errors"] = errs
    if errs: FAIL.append("page_errors")
    b.close()

print(json.dumps(R, indent=1))
print("FAIL:", FAIL if FAIL else "none")
sys.exit(1 if FAIL else 0)
