"""Type census: every visible text run on a page at a width -> size/weight/color buckets.
Usage: python3 type-census.py URL WIDTH [--list]"""
import sys, collections
from playwright.sync_api import sync_playwright
url, w = sys.argv[1], int(sys.argv[2]); LIST = '--list' in sys.argv
JS = r"""() => {
  const out = []; const tw = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  let n; while ((n = tw.nextNode())) {
    const t = n.textContent.replace(/\s+/g,' ').trim(); if (t.length < 2) continue;
    const el = n.parentElement; if (!el || el.closest('script,style,noscript,.popup-overlay,[hidden],[aria-hidden=true]')) continue;
    const r = el.getBoundingClientRect(), cs = getComputedStyle(el);
    if (!r.width || cs.visibility === 'hidden' || +cs.opacity === 0) continue;
    let e = el, hidden = false; while (e) { if (getComputedStyle(e).display === 'none') { hidden = true; break; } e = e.parentElement; } if (hidden) continue;
    out.push({ t: t.slice(0,60), fs: parseFloat(cs.fontSize), fw: +cs.fontWeight, c: cs.color, tag: el.tagName.toLowerCase(), cls: (el.className||'').toString().split(' ')[0], chars: t.length, fam: cs.fontFamily.split(',')[0], up: cs.textTransform === 'uppercase', tab: !!el.closest('.mobile-tab-bar'), field: !!el.closest('.field') });
  }
  return out; }"""
with sync_playwright() as p:
    b = p.chromium.launch(); pg = b.new_page(viewport={'width': w, 'height': 900})
    pg.goto(url, wait_until='networkidle'); pg.evaluate("document.querySelectorAll('.rv').forEach(e=>e.classList.add('in'))")
    runs = pg.evaluate(JS); b.close()
tot = sum(r['chars'] for r in runs)
bk = collections.Counter()
for r in runs:
    fs = r['fs']; k = '<13' if fs < 13 else '13-14.9' if fs < 15 else '15-16.9' if fs < 17 else '17+'
    bk[k] += r['chars']
print(f"{url} @ {w}px: {len(runs)} runs, {tot} chars")
for k in ['<13','13-14.9','15-16.9','17+']: print(f"  {k:8} {bk[k]:6} chars  {100*bk[k]/tot:5.1f}%")
fails = collections.Counter()
for r in runs:
    fs = r['fs']
    if r['tab']: bad = fs < 12
    elif r['field']: bad = fs < 13
    elif r['up']: bad = fs < 15
    else: bad = fs < 17
    if bad: fails[(fs, r['fw'], r['tag'], r['cls'], r['t'][:34])] += r['chars']
print(f"  GATE FAILS: {len(fails)} runs, {sum(fails.values())} chars")
if '--fails' in sys.argv:
    for (fs, fw, tag, cls, t), c in sorted(fails.items(), key=lambda x: -x[1]): print(f"    {fs:5}px w{fw} {tag}.{cls:16} {t}")
if LIST:
    seen = collections.Counter()
    for r in runs:
        if r['fs'] < 17: seen[(r['fs'], r['fw'], r['tag'], r['cls'])] += r['chars']
    for (fs, fw, tag, cls), c in sorted(seen.items(), key=lambda x: -x[1])[:30]: print(f"  {fs:5}px w{fw} {tag}.{cls:18} {c} chars")
