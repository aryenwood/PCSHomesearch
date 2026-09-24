"""QA for /fort-drum/pcs-checklist: the stage timeline and the housing checklist keep the
same localStorage records the guide and homepage use. Run against the local server:
python3 tools/qa-pcs-checklist.py [base_url]
Each check seeds storage, reloads, and reads the page back; the negative controls must fail
the way a broken page would."""
import json, sys
from playwright.sync_api import sync_playwright

BASE = sys.argv[1] if len(sys.argv) > 1 else "http://127.0.0.1:8611"
URL = BASE + "/fort-drum/pcs-checklist.html"
R = {}

def fresh(b, seed=None):
    ctx = b.new_context(viewport={"width": 390, "height": 844})
    pg = ctx.new_page()
    errs = []
    pg.on("pageerror", lambda e: errs.append(str(e)))
    pg.goto(URL, wait_until="domcontentloaded")
    pg.evaluate("localStorage.clear()")
    for k, v in (seed or {}).items():
        pg.evaluate("([k, v]) => localStorage.setItem(k, v)", [k, v])
    pg.reload(wait_until="networkidle")
    return ctx, pg, errs

pressed = "[...document.querySelectorAll('.stage[aria-current=step]')].map(b => b.querySelector('.when').textContent)"
checked = "[...document.querySelectorAll('.checks input:checked')].map(i => i.dataset.key)"

with sync_playwright() as p:
    b = p.chromium.launch()
    # stage: nothing saved -> prompt visible, nothing pressed
    ctx, pg, errs = fresh(b)
    R["no_stage_prompt_visible"] = pg.evaluate("!document.getElementById('stagePrompt').hidden")
    R["no_stage_pressed"] = pg.evaluate(pressed)
    # tap 60 days out -> pressed, saved as 'sixty', survives reload
    pg.locator(".stage", has_text="60 days out").click()
    R["tap_saves"] = pg.evaluate("localStorage.getItem('pcshomes_stage')")
    pg.reload(wait_until="networkidle")
    R["tap_survives_reload"] = pg.evaluate(pressed)
    R["prompt_hidden_after"] = pg.evaluate("document.getElementById('stagePrompt').hidden")
    R["page_errors"] = errs
    ctx.close()
    # the homepage's 'orders' marks both orders rows; legacy '60-days' normalizes
    ctx, pg, _ = fresh(b, {"pcshomes_stage": "orders"}); R["orders_marks"] = pg.evaluate(pressed); ctx.close()
    ctx, pg, _ = fresh(b, {"pcshomes_stage": "60-days"}); R["legacy_60_days"] = pg.evaluate(pressed); ctx.close()
    # negative control: a homepage-only stage ('deployed') marks nothing and shows the prompt
    ctx, pg, _ = fresh(b, {"pcshomes_stage": "deployed"})
    R["control_deployed_marks_nothing"] = pg.evaluate(pressed) == [] and pg.evaluate("!document.getElementById('stagePrompt').hidden")
    ctx.close()

    # checklist: a v2 record written by the old guide restores
    v2 = json.dumps({"v": 2, "lists": {"pcs": ["coe", "winter-plan"]}, "updated": "2026-09-20T12:00:00Z"})
    ctx, pg, _ = fresh(b, {"pcshomes_checklist_v2": v2})
    R["v2_restores"] = pg.evaluate(checked)
    R["status_text"] = pg.evaluate("document.getElementById('checklistStatus').textContent")
    # tick one more by tapping its label text, reload, still there
    pg.locator(".checks label", has_text="Calculate BAH").click()
    pg.reload(wait_until="networkidle")
    R["tick_survives_reload"] = pg.evaluate(checked)
    R["saved_record"] = json.loads(pg.evaluate("localStorage.getItem('pcshomes_checklist_v2')"))["lists"]["pcs"]
    # the external link beside an item opens the link, it does not tick the box
    before = pg.evaluate(checked)
    R["link_is_outside_label"] = pg.evaluate("!document.querySelector('.checks .go').closest('label')")
    ctx.close()
    # oldest save format (indexes) migrates once and is removed
    ctx, pg, _ = fresh(b, {"pcshomes_checklist": "[0, 2]"})
    R["old_index_migrates"] = pg.evaluate(checked)
    R["old_key_removed"] = pg.evaluate("localStorage.getItem('pcshomes_checklist') === null")
    ctx.close()
    # negative control: garbage in storage must not break the page or tick anything
    ctx, pg, errs = fresh(b, {"pcshomes_checklist_v2": "{not json"})
    R["control_garbage_ticks_nothing"] = pg.evaluate(checked) == [] and not errs
    ctx.close()
    b.close()

want = {
    "no_stage_prompt_visible": True, "no_stage_pressed": [], "tap_saves": "sixty",
    "tap_survives_reload": ["60 days out"], "prompt_hidden_after": True, "page_errors": [],
    "orders_marks": ["120+ days out", "90 days out"], "legacy_60_days": ["60 days out"],
    "control_deployed_marks_nothing": True,
    "v2_restores": ["coe", "winter-plan"], "tick_survives_reload": ["coe", "bah-lookup", "winter-plan"],
    "saved_record": ["coe", "bah-lookup", "winter-plan"], "link_is_outside_label": True,
    "old_index_migrates": ["mch-waitlist", "bah-lookup"], "old_key_removed": True,
    "control_garbage_ticks_nothing": True,
}
fails = {k: R.get(k) for k, v in want.items() if R.get(k) != v}
R["status_text_ok"] = R.get("status_text", "").endswith("2 of 9 done")
if not R["status_text_ok"]: fails["status_text"] = R.get("status_text")
print(json.dumps({"passed": len(want) + 1 - len(fails), "total": len(want) + 1, "fails": fails}, indent=1))
sys.exit(1 if fails else 0)
