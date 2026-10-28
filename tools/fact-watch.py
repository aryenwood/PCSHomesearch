#!/usr/bin/env python3
"""PCSHomes fact watch: re-checks what families rely on, every day, and says what to update.

Each run:
  1. Links: every outside link on the site is requested (tools/qa-resources.py). A link that fails on two runs
     in a row is reported, so one slow server is not an alarm. Moved links are reported with where they go now.
  2. Figures: each figure in tools/facts.json must still appear on its official source page. A figure whose
     change date (for example BAH on Jan 1, per diem on Oct 1) has passed since it was last verified is
     reported as due, even when the source page refuses scripts.
  3. Directory: records past their recheck date are checked. If the source page is up and still lists the
     record's phone number, it counts as holding; everything else is reported for a person to re-verify.

Nothing on the site changes by itself. The report names each item, the file it is in and the source to check,
and Bishop applies the update after it is verified. Run state lives in ~/.pcshomes-fact-watch/, outside the
repo, so a run never touches a file someone is editing.

  python3 tools/fact-watch.py               # full run: report to the vault, notify when something is new
  python3 tools/fact-watch.py --no-links    # skip the slow link pass
  python3 tools/fact-watch.py --quiet       # no desktop notification
"""
import concurrent.futures as cf
import html
import importlib.util
import json
import re
import subprocess
import sys
import urllib.parse
import urllib.request
from datetime import date, datetime
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
STATE_DIR = Path.home() / ".pcshomes-fact-watch"
STATE = STATE_DIR / "state.json"
LAST = STATE_DIR / "last-run.json"
REPORT = Path.home() / "WC-Vault/07 - PCS Homes/PCSHomes Fact Watch.md"
FACTS = ROOT / "tools/facts.json"
DIRECTORY = ROOT / "docs/research-2026-09/pcshomes_fort_drum_family_directory_v1.json"
PHONE_RE = re.compile(r"\(?\b(\d{3})\)?[\s.-]?(\d{3})[\s.-](\d{4})\b")

_spec = importlib.util.spec_from_file_location("qa_resources", ROOT / "tools/qa-resources.py")
qa = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(qa)


def page_text(url):
    """The page as plain text, or (None, reason) when it cannot be read."""
    req = urllib.request.Request(url, headers={"User-Agent": qa.UA, "Accept": "text/html,application/pdf,*/*"})
    try:
        with urllib.request.urlopen(req, timeout=25, context=qa.TLS) as r:
            raw = r.read(4_000_000)
            kind = r.headers.get("Content-Type", "")
    except Exception as e:  # HTTP errors, timeouts, TLS
        return None, getattr(e, "code", type(e).__name__)
    if "pdf" in kind:
        return None, "pdf (check by hand)"
    text = raw.decode("utf-8", errors="ignore")
    text = re.sub(r"(?is)<(script|style|noscript)\b.*?</\1>", " ", text)
    return html.unescape(re.sub(r"<[^>]+>", " ", text)), 200


def last_change(mmdd, today):
    """The most recent date on or before today that falls on month-day mmdd."""
    month, day = (int(x) for x in mmdd.split("-"))
    this_year = date(today.year, month, day)
    return this_year if this_year <= today else date(today.year - 1, month, day)


def where(value, files):
    """file:line for each place the site prints the figure (first value fragment)."""
    needle = value.split(" / ")[0].split(" to ")[0]
    hits = []
    for f in files:
        p = ROOT / f
        if p.exists():
            hits += [f"{f}:{i}" for i, line in enumerate(p.read_text(errors="ignore").splitlines(), 1) if needle in line][:2]
    return hits


def check_facts(today):
    out = []
    for fact in json.loads(FACTS.read_text())["facts"]:
        verified = datetime.strptime(fact["verified"], "%Y-%m-%d").date()
        due = [d for d in (last_change(m, today) for m in fact.get("changes", [])) if d > verified]
        expires = fact.get("expires")
        item = {"id": fact["id"], "label": fact["label"], "value": fact["value"], "source": fact["source"], "where": where(fact["value"], fact["files"])}
        if due:
            out.append({**item, "kind": "due", "why": f"scheduled to change {max(due).isoformat()}; last verified {fact['verified']}"})
        if expires and (datetime.strptime(expires, "%Y-%m-%d").date() - today).days <= 30:
            out.append({**item, "kind": "due", "why": f"program ends {expires}; confirm it was extended or take it down"})
        if fact.get("expect"):
            fy = today.year + 1 if today.month >= 10 else today.year  # federal fiscal year
            text, status = page_text(fact["source"].format(fy=fy))
            if text is None:
                item["source_status"] = status
                out.append({**item, "kind": "unreadable", "why": f"source page did not load for the script ({status}); check by hand when due"})
            else:
                missing = [x for x in fact["expect"] if x not in text]
                if missing:
                    out.append({**item, "kind": "changed", "why": f"source page no longer shows {', '.join(missing)}"})
    return out


def check_directory(today):
    data = json.loads(DIRECTORY.read_text())
    overdue = [r for r in data["records"] if r.get("recheck_at") and r["recheck_at"] < today.isoformat() and r.get("status", "active") == "active"]

    def one(r):
        phones = {re.sub(r"\D", "", r.get(k) or "")[-10:] for k in ("phone_primary", "phone_secondary")} - {""}
        phones = {p for p in phones if len(p) == 10}
        if not r.get("source_url"):
            return r, "no source page on file"
        text, status = page_text(r["source_url"])
        if text is None:
            return r, f"source page did not load ({status})"
        listed = {"".join(m.groups()) for m in PHONE_RE.finditer(text)}
        if phones and not phones & listed:
            return r, "source page no longer lists its phone number"
        return r, None

    holding, report = [], []
    with cf.ThreadPoolExecutor(8) as ex:
        for r, problem in ex.map(one, overdue):
            if problem:
                report.append({"id": r["id"], "name": r["name"], "category": r.get("category"), "recheck_at": r["recheck_at"], "source": r.get("source_url"), "why": problem})
            else:
                holding.append(r["id"])
    return {"overdue": len(overdue), "holding": holding, "report": report}


def harmless_redirect(url, final):
    """A bot wall, or a home page that only adds a language path (/en-US), is not a moved page."""
    if re.search(r"/(blocked|captcha)\b", final):
        return True
    a, b = urllib.parse.urlsplit(url), urllib.parse.urlsplit(final)
    if a.netloc.removeprefix("www.") != b.netloc.removeprefix("www."):
        return False
    locale = re.match(r"/[a-z]{2}(-[A-Za-z]{2})(?=/|$)", b.path or "")
    return bool(locale) and b.path[locale.end():].rstrip("/") == a.path.rstrip("/")


def curl_ok(url):
    """Some servers drop Python's TLS handshake but serve curl and browsers; ask curl before calling a link dead."""
    r = subprocess.run(["curl", "-s", "-L", "-m", "25", "-o", "/dev/null", "-A", qa.UA, "-w", "%{http_code}", url],
                       capture_output=True, text=True, check=False)
    return r.stdout.strip() == "200"


def check_links(state, today):
    urls, _ = qa.inventory()
    fails = state.setdefault("link_fails", {})
    dead, moved = [], []
    with cf.ThreadPoolExecutor(12) as ex:
        for url, status, final in ex.map(qa.fetch, urls):
            if status in (401, 403, 429) or status == "RemoteDisconnected":
                continue  # bot walls: checked by hand, not alarms
            if status == 200:
                fails.pop(url, None)
                if qa.moved(url, final) and not harmless_redirect(url, final):
                    moved.append({"url": url, "now": final, "in": sorted(urls[url])})
                continue
            if curl_ok(url):
                fails.pop(url, None)
                continue
            f = fails.setdefault(url, {"first": today.isoformat(), "runs": 0})
            f["runs"] += 1
            f["status"] = str(status)
            if f["runs"] >= 2:
                dead.append({"url": url, "status": str(status), "since": f["first"], "in": sorted(urls[url])})
    for url in [u for u in fails if u not in urls]:
        fails.pop(url)  # the site no longer links it
    return {"checked": len(urls), "dead": dead, "moved": moved}


def key(item):
    return f"{item.get('kind', '')}|{item.get('id') or item.get('url')}|{item.get('why', item.get('now', ''))}"


def write_report(run, new_keys):
    facts, d, links = run["facts"], run["directory"], run.get("links")
    lines = [
        "---", "status: active", "project: pcs-homes", "type: log", f"created: {run['date']}", "---",
        "# PCSHomes Fact Watch",
        "",
        f"Written by `tools/fact-watch.py` (PCS_Homes repo), which runs every morning on Aryen's Mac. Last run: **{run['when']}**. "
        "This page is rewritten each run. Nothing on the site changes by itself: Bishop re-verifies each item below against "
        "its official source, updates the site and tools/facts.json, and deploys after Aryen says push.",
        "",
        f"**Needs attention: {run['count']}** ({len([f for f in facts if f['kind'] in ('changed', 'due')])} figures, "
        f"{len(d['report'])} directory records, {len(links['dead']) + len(links['moved']) if links else 0} links). New since last run: {len(new_keys)}.",
        "",
        "## Figures",
    ]
    for f in facts:
        mark = " (new)" if key(f) in new_keys else ""
        lines.append(f"- **{f['label']}** ({f['value']}): {f['kind']}, {f['why']}{mark}. Source: {f['source']}. On the site: {', '.join(f['where']) or 'not found'}")
    if not facts:
        lines.append("- Every figure is still on its source page and none is due.")
    lines += ["", f"## Directory ({d['overdue']} past recheck; {len(d['holding'])} still match their source page)"]
    for r in d["report"]:
        lines.append(f"- {r['id']} {r['name']} ({r['category']}, recheck {r['recheck_at']}): {r['why']}. {r['source'] or ''}")
    if not d["report"]:
        lines.append("- Nothing to re-verify by hand.")
    if links:
        lines += ["", f"## Links ({links['checked']} checked; a link is listed after failing two runs in a row)"]
        lines += [f"- DEAD {x['status']} since {x['since']}: {x['url']} (in {', '.join(x['in'])})" for x in links["dead"]]
        lines += [f"- MOVED: {x['url']} now goes to {x['now']} (in {', '.join(x['in'])})" for x in links["moved"]]
        if not links["dead"] and not links["moved"]:
            lines.append("- Every link loads where it should.")
    REPORT.parent.mkdir(parents=True, exist_ok=True)
    REPORT.write_text("\n".join(lines) + "\n")


def notify(text):
    subprocess.run(["osascript", "-e", f'display notification "{text}" with title "PCSHomes fact watch"'], check=False)


def main():
    today = date.today()
    STATE_DIR.mkdir(exist_ok=True)
    state = json.loads(STATE.read_text()) if STATE.exists() else {}
    run = {"date": today.isoformat(), "when": datetime.now().strftime("%a %b %d, %Y %I:%M %p"),
           "facts": check_facts(today), "directory": check_directory(today)}
    if "--no-links" not in sys.argv:
        run["links"] = check_links(state, today)
    items = [f for f in run["facts"] if f["kind"] in ("changed", "due")] + run["directory"]["report"] \
        + (run["links"]["dead"] + run["links"]["moved"] if "links" in run else [])
    run["count"] = len(items)
    current = {key(i) for i in items}
    new_keys = current - set(state.get("reported", []))  # an item fixed and later broken again counts as new
    state["reported"] = sorted(current)
    STATE.write_text(json.dumps(state, indent=1))
    LAST.write_text(json.dumps(run, indent=1, default=str))
    write_report(run, new_keys)
    print(f"fact watch {run['date']}: {run['count']} need attention, {len(new_keys)} new. Report: {REPORT}")
    if new_keys and "--quiet" not in sys.argv:
        notify(f"{len(new_keys)} new item(s) to re-verify on PCSHomes")
    return 1 if items else 0


if __name__ == "__main__":
    sys.exit(main())
