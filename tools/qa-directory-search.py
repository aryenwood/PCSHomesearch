"""Headless QA battery for pcshomes-directory.html search routing. Run: python3 tools/qa-directory-search.py [url] (default: local server on :8611). Needs python playwright."""
import json, sys
from playwright.sync_api import sync_playwright

URL = sys.argv[1] if len(sys.argv) > 1 else "http://127.0.0.1:8611/pcshomes-directory.html"

EXPECT = {
    "2-14": "2nd Mobile", "2-22 in": "1st Mobile", "1-87": "1st Mobile", "2-87": "2nd Mobile", "4-31 rear d": "2nd Mobile",
    "knighthawks": "Combat Aviation", "5-25 fa": "DIVARTY", "710th": "Sustainment", "41st engineer": "41st Engineer",
    "2-14 rear detachment": "2nd Mobile", "my husband is in 1-32 and i can't reach him": "1st Mobile",
    "chain of command": "LIST", "staff duty": "LIST", "rear detachment": "LIST", "commander": "LIST",
    "my husband just arrived and is in-processing": "Reception Company", "in-processing": "Reception Company",
    "my husband is at blc": "NCO Academy", "ncoa": "NCO Academy", "division band": "Band",
    "my wife is an airman in the 20th asos": "20th Air Support", "mountain training group": "Mountain Training",
    "my pay is wrong": "Military Pay", "travel voucher": "Military Pay", "finance": "Military Pay",
    "i need food": "Food Pantry", "food stamps": "SNAP", "i can't pay for heat": "HEAP", "i need daycare": "Child Care",
    "i need to get divorced": "Legal Assistance", "my husband hit me": "Family Advocacy Crisis",
    "i was sexually assaulted": "Safe Helpline", "i want to kill myself": "Crisis Line",
    "i need a va doctor": "Watertown VA", "help with my va claim": "Veterans Service Agency",
    "my kid has special needs": "Exceptional Family", "where is urgent care": "Urgent Care",
    "my furniture got damaged in the move": "Secure Hold", "where can i buy groceries": "Commissary",
    "who do i call": "Information & Referral",
}

JS = """(q) => { const got = __dirSearch(q) || "";
  const isList = document.getElementById('dirHint').style.display === 'block';
  return {got, isList}; }"""

with sync_playwright() as p:
    b = p.chromium.launch()
    pg = b.new_page()
    errors = []
    pg.on("console", lambda m: errors.append(m.text) if m.type == "error" else None)
    pg.on("pageerror", lambda e: errors.append(str(e)))
    pg.goto(URL, wait_until="networkidle")
    pg.wait_for_function("typeof DIR !== 'undefined' && DIR.length > 0")
    fails = []
    for q, want in EXPECT.items():
        r = pg.evaluate(JS, q)
        ok = r["isList"] if want == "LIST" else (want in r["got"] and not r["isList"])
        if not ok:
            fails.append({"q": q, "want": want, **r})
    order = pg.evaluate("""() => { __dirSearch('chain of command');
      return [...document.querySelectorAll('#dirResults .dir-row h3')].map(h => h.textContent.split(' — ')[0]); }""")
    loaded = pg.evaluate("DIR.length")
    # negative control: a query that must NOT route anywhere
    nc = pg.evaluate(JS, "zzqx nonsense string")
    b.close()

print(json.dumps({"loaded": loaded, "total": len(EXPECT), "passed": len(EXPECT) - len(fails),
                  "fails": fails, "generic_list_order": order,
                  "negative_control_empty": nc["got"] == "", "console_errors": errors}, indent=1))
