"""Numbers never wrap (owner rule). For every page and width, flag:
 - a phone number inside a tel:/sms: link that breaks across lines
 - any number token ($200,000 / 1,665 / 18k+ / 7.03%) that breaks across lines, anywhere
 - any word split mid-word where the text is allowed to break anywhere (overflow-wrap:anywhere)
 - horizontal page scroll
Usage: python3 tools/tel-wrap.py BASE page1 page2 ...
Widths: phones (440, 390, 375), tablet (768) and desktop (1440)."""
import sys
from playwright.sync_api import sync_playwright
BASE = sys.argv[1]; pages = sys.argv[2:]
JS = r"""() => {
  const out = { wrap: [], split: [] };
  const hidden = el => { let e = el; while (e) { const cs = getComputedStyle(e); if (cs.display === 'none' || e.hidden || cs.visibility === 'hidden') return true; e = e.parentElement; } return false; };
  const lines = (n, i, len) => { const rg = document.createRange(); rg.setStart(n, i); rg.setEnd(n, i + len); return new Set([...rg.getClientRects()].filter(r => r.width > 0).map(r => Math.round(r.top))).size; };
  const tw = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  let n;
  while ((n = tw.nextNode())) {
    const el = n.parentElement;
    if (!el || !n.textContent.trim() || el.closest('script, style, noscript, .leaflet-container') || hidden(el)) continue;
    const t = n.textContent, anywhere = /anywhere|break-word/.test(getComputedStyle(el).overflowWrap) || getComputedStyle(el).wordBreak === 'break-all';
    // phone numbers and money/number tokens
    for (const m of t.matchAll(/\(?\d{3}\)?[ .-]?\d{3}-\d{4}|\d-\d{3}-\d{3}-\d{4}|[$~]?\d[\d,.]*\d(?:%|k\+?)?|\$\d/g))
      if (lines(n, m.index, m[0].length) > 1) out.wrap.push(m[0]);
    // mid-word splits where the text may break anywhere
    if (anywhere) for (const m of t.matchAll(/[A-Za-z]{4,}/g))
      if (lines(n, m.index, m[0].length) > 1) out.split.push(m[0]);
  }
  out.hscroll = document.documentElement.scrollWidth - innerWidth;
  return out;
}"""
tot = 0
with sync_playwright() as p:
    b = p.chromium.launch()
    for pg_ in pages:
        for w in (440, 390, 375, 768, 1440):
            pg = b.new_page(viewport={'width': w, 'height': 900})
            pg.goto(f'{BASE}/{pg_}', wait_until='networkidle')
            pg.evaluate("document.querySelectorAll('.rv').forEach(e => e.classList.add('in'))")
            r = pg.evaluate(JS); pg.close()
            if r['wrap'] or r['split'] or r['hscroll'] > 0:
                tot += 1; print(pg_, w, r)
    b.close()
print('ISSUES', tot)
