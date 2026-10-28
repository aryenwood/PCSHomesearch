#!/usr/bin/env python3
"""Resource inventory and live link check for every page a family reads.

Lists every outside link and phone number the site publishes (pages, data files, the emailed checklist),
and with --live requests each link to catch dead, blocked and moved ones. The resource ledger
(tools/resource-ledger.json) records who verified each one against its official source and when.

  python3 tools/qa-resources.py            # inventory + ledger coverage, no network
  python3 tools/qa-resources.py --live     # also request every link
"""
import concurrent.futures as cf
import json
import re
import sys
import urllib.error
import urllib.request
from datetime import date, datetime
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SOURCES = sorted(
    [p for p in ROOT.glob("*.html")]
    + [p for p in (ROOT / "fort-drum").glob("*.html")]
    + [p for p in (ROOT / "data").glob("*.json")]
    + [ROOT / "netlify/functions/_lib/checklist.js", ROOT / "js/render-partner-card.js"]
)
SKIP_HOSTS = ("fonts.googleapis.com", "fonts.gstatic.com", "cdn.jsdelivr.net", "www.googletagmanager.com", "schema.org", "www.w3.org")
URL_RE = re.compile(r"""https?://[^\s"'<>]+""")
PHONE_RE = re.compile(r"(?:1-)?(?:\(\d{3}\)\s?|\b\d{3}[-.])\d{3}[-.]\d{4}\b")
LEDGER = ROOT / "tools/resource-ledger.json"
MAX_AGE_DAYS = 90
UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15"


def inventory():
    urls, phones = {}, {}
    for path in SOURCES:
        if not path.exists():
            continue
        text = path.read_text(errors="ignore")
        rel = str(path.relative_to(ROOT))
        for u in URL_RE.findall(text):
            u = u.rstrip(".,;&").replace("&amp;", "&")
            if any(h in u for h in SKIP_HOSTS) or "pcshomes.com" in u:
                continue
            urls.setdefault(u, set()).add(rel)
        for m in PHONE_RE.finditer(text):
            digits = re.sub(r"\D", "", m.group())[-10:]
            phones.setdefault(digits, set()).add(rel)
    return urls, phones


def _tls():
    import ssl
    try:  # python.org builds ship without the system roots; certifi carries them
        import certifi
        return ssl.create_default_context(cafile=certifi.where())
    except ImportError:
        return ssl.create_default_context()


TLS = _tls()


def fetch(url):
    req = urllib.request.Request(url, headers={"User-Agent": UA, "Accept": "text/html,*/*"})
    try:
        with urllib.request.urlopen(req, timeout=20, context=TLS) as r:
            return url, r.status, r.geturl()
    except urllib.error.HTTPError as e:
        return url, e.code, url
    except Exception as e:  # timeouts, DNS, TLS
        return url, type(e).__name__, url


def moved(url, final):
    a = re.sub(r"^https?://(www\.)?", "", url).rstrip("/")
    b = re.sub(r"^https?://(www\.)?", "", final).rstrip("/")
    return a.split("?")[0] != b.split("?")[0]


def main():
    urls, phones = inventory()
    ledger = json.loads(LEDGER.read_text()) if LEDGER.exists() else {"links": {}, "phones": {}}
    today = date.today()
    print(f"{len(urls)} outside links, {len(phones)} phone numbers in {len(SOURCES)} files")

    missing_l = [u for u in urls if u not in ledger["links"]]
    missing_p = [p for p in phones if p not in ledger["phones"]]
    stale = [k for kind in ("links", "phones") for k, v in ledger[kind].items()
             if (today - datetime.strptime(v["verified"], "%Y-%m-%d").date()).days > MAX_AGE_DAYS]
    print(f"ledger: {len(urls) - len(missing_l)}/{len(urls)} links and {len(phones) - len(missing_p)}/{len(phones)} phones verified; {len(stale)} older than {MAX_AGE_DAYS} days")

    report = {"links": {u: sorted(p) for u, p in urls.items()}, "phones": {p: sorted(s) for p, s in phones.items()}}
    if "--live" in sys.argv:
        dead, blocked, moved_list = [], [], []
        with cf.ThreadPoolExecutor(12) as ex:
            for url, status, final in ex.map(fetch, urls):
                if status == 200 and moved(url, final):
                    moved_list.append((url, final))
                elif status in (401, 403, 429) or status == "RemoteDisconnected":
                    blocked.append((url, status))
                elif status != 200:
                    dead.append((url, status))
        print(f"live: {len(dead)} dead, {len(blocked)} refuse robots (check by hand), {len(moved_list)} redirect elsewhere")
        for u, s in sorted(dead, key=str):
            print(f"  DEAD {s}  {u}  <- {', '.join(sorted(urls[u]))}")
        for u, f in sorted(moved_list):
            print(f"  MOVED  {u}  ->  {f}")
        for u, s in sorted(blocked, key=str):
            print(f"  BLOCKED {s}  {u}")
        report.update(dead=dead, blocked=blocked, moved=moved_list)
    out = ROOT / "tools/.resource-inventory.json"
    out.write_text(json.dumps(report, indent=1, default=str))
    print("inventory:", out.relative_to(ROOT))
    return 1 if (missing_l or missing_p or stale) and "--strict" in sys.argv else 0


if __name__ == "__main__":
    sys.exit(main())
