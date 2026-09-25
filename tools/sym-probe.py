"""Generic symmetry probe (owner rule, Sep 24): for every page and width, flag
 - ORPHAN: a set of like items (grid/flex-wrap children) whose last row holds fewer
   items than the first row and does not span the full row
 - UNEQUAL: like items in one row with different widths (grid/flex sets, > 2px)
 - TOPS: items in one row whose top edges differ (> 2px)
 - HUGGER: a lone header CTA sitting against the logo instead of the right edge
 - DASHLINE: an em/en dash that starts a rendered line inside a heading
Usage: python3 sym-probe.py BASE page1 page2 ...
"""
import sys, json
from playwright.sync_api import sync_playwright

BASE = sys.argv[1].rstrip('/')
PAGES = sys.argv[2:] or ['index.html']
WIDTHS = [440, 390, 375, 1440]

JS = r"""
() => {
  const out = [];
  const vis = el => { const r = el.getBoundingClientRect(); const cs = getComputedStyle(el);
    return r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && cs.display !== 'none' && cs.position !== 'absolute' && cs.position !== 'fixed'; };
  const name = el => el.tagName.toLowerCase() + (el.id ? '#' + el.id : '') + (el.className && typeof el.className === 'string' ? '.' + el.className.trim().split(/\s+/).slice(0,2).join('.') : '');
  const inViewTree = el => !el.closest('[hidden], .popup-overlay, details:not([open]) > :not(summary)');
  for (const box of document.querySelectorAll('body *')) {
    if (!inViewTree(box)) continue;
    const cs = getComputedStyle(box);
    const isGrid = cs.display.includes('grid');
    const isWrap = cs.display.includes('flex') && cs.flexWrap === 'wrap' && cs.flexDirection.startsWith('row');
    const isRowFlex = cs.display.includes('flex') && cs.flexDirection.startsWith('row');
    if (!isGrid && !isWrap && !isRowFlex) continue;
    const kids = [...box.children].filter(vis);
    if (kids.length < 2) continue;
    // like items: same tag + same first class
    const sig = k => k.tagName + '|' + ((typeof k.className === 'string' && k.className.trim().split(/\s+/)[0]) || '');
    const sigs = new Set(kids.map(sig));
    if (sigs.size !== 1) continue;
    const rows = [];
    for (const k of kids) {
      const r = k.getBoundingClientRect();
      let row = rows.find(rw => Math.abs(rw.top - r.top) < r.height * 0.5);
      if (!row) { row = { top: r.top, items: [] }; rows.push(row); }
      row.items.push({ el: k, r });
    }
    rows.sort((a,b) => a.top - b.top);
    const bw = box.getBoundingClientRect().width;
    if ((isGrid || isWrap) && rows.length > 1) {
      const first = rows[0].items.length, last = rows[rows.length-1].items;
      const lastW = last.reduce((s,i) => s + i.r.width, 0);
      if (last.length < first && lastW < bw * 0.9)
        out.push({ kind: 'ORPHAN', where: name(box), detail: rows.map(r => r.items.length).join('+') });
    }
    for (const row of rows) {
      if (row.items.length < 2) continue;
      const ws = row.items.map(i => Math.round(i.r.width)), ts = row.items.map(i => Math.round(i.r.top));
      if ((isGrid || isWrap) && Math.max(...ws) - Math.min(...ws) > 2)
        out.push({ kind: 'UNEQUAL', where: name(box), detail: ws.join('/') });
      if (Math.max(...ts) - Math.min(...ts) > 2 && cs.alignItems !== 'baseline')
        out.push({ kind: 'TOPS', where: name(box), detail: ts.join('/') });
    }
  }
  // header CTA hugging the logo
  const bar = document.querySelector('.bar-in');
  if (bar) {
    const cta = [...bar.querySelectorAll('.bar-cta')].find(vis);
    if (cta) { const gap = bar.getBoundingClientRect().right - cta.getBoundingClientRect().right;
      if (gap > 40) out.push({ kind: 'HUGGER', where: '.bar-cta', detail: 'right gap ' + Math.round(gap) + 'px' }); }
  }
  // dash starting a rendered line in headings
  for (const h of document.querySelectorAll('h1, h2, h3')) {
    if (!vis(h)) continue;
    const walker = document.createTreeWalker(h, NodeFilter.SHOW_TEXT);
    let n; while ((n = walker.nextNode())) {
      const t = n.textContent;
      for (let i = 0; i < t.length; i++) {
        if (t[i] !== '—' && t[i] !== '–') continue;
        const rg = document.createRange(); rg.setStart(n, i); rg.setEnd(n, i + 1);
        const rd = rg.getBoundingClientRect(), hr = h.getBoundingClientRect();
        if (false) out.push({});
      }
    }
  }
  // GUTTER: text touching the screen edge (phones), outside full-bleed chrome
  if (innerWidth < 800) {
    const tw = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT); let n; const seenEl = new Set();
    while ((n = tw.nextNode())) {
      if (n.textContent.trim().length < 2) continue;
      const el = n.parentElement; if (!el || seenEl.has(el) || el.closest('script,style,.mobile-tab-bar,.popup-overlay,[hidden],.leaflet-container,.snav,#sectionNav,.skip')) continue;
      let e = el, hid = false; while (e) { const cs = getComputedStyle(e); if (cs.display === 'none' || cs.visibility === 'hidden' || cs.position === 'fixed') { hid = true; break; } e = e.parentElement; } if (hid) continue;
      const rg = document.createRange(); rg.selectNodeContents(n);
      for (const r of rg.getClientRects()) { if (r.width < 1) continue;
        if (r.left < 12 || r.right > innerWidth - 12) { seenEl.add(el); out.push({ kind: 'GUTTER', where: name(el), detail: n.textContent.trim().slice(0, 40) + ' @' + Math.round(r.left) + '..' + Math.round(r.right) }); break; } }
    }
  }
  // ALIGN: sibling cards in one grid row with the same structure must line up part by part
  for (const box of document.querySelectorAll('body *')) {
    if (!inViewTree(box) || !getComputedStyle(box).display.includes('grid')) continue;
    const kids = [...box.children].filter(vis); if (kids.length < 2) continue;
    const n0 = kids[0].children.length; if (n0 < 2 || kids.some(k => k.children.length !== n0)) continue;
    const ksig = k => k.tagName + '.' + ((typeof k.className === 'string' && k.className.trim().split(/\s+/)[0]) || '');
    if (kids.some(k => ksig(k) !== ksig(kids[0]))) continue;
    const rows = {}; kids.forEach(k => { const t = Math.round(k.getBoundingClientRect().top); (rows[t] = rows[t] || []).push(k); });
    for (const row of Object.values(rows)) { if (row.length < 2) continue;
      for (let i = 1; i < n0; i++) { if (row.some(k => getComputedStyle(k.children[i]).position === 'absolute')) continue;
        const tops = row.map(k => Math.round(k.children[i].getBoundingClientRect().top));
        if (Math.max(...tops) - Math.min(...tops) > 2) { out.push({ kind: 'ALIGN', where: name(box), detail: 'part ' + (i + 1) + ' tops ' + tops.join('/') }); break; } } }
  }
  // DASH: any em dash in visible text (copy rule), and any dash that starts a rendered line
  { const tw = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT); let n, count = 0;
    while ((n = tw.nextNode())) { const t = n.textContent; if (!/[\u2014\u2013]/.test(t)) continue;
      const el = n.parentElement; if (!el || el.closest('script,style,noscript')) continue;
      let e = el, hid = false; while (e) { if (getComputedStyle(e).display === 'none') { hid = true; break; } e = e.parentElement; } if (hid) continue;
      for (let i = 0; i < t.length; i++) { if (t[i] !== '\u2014' && t[i] !== '\u2013') continue; if (t[i] === '\u2014') count++;
        const rg = document.createRange(); rg.setStart(n, i); rg.setEnd(n, i + 1); const rd = rg.getBoundingClientRect();
        const lb = el.getBoundingClientRect(); const cs = getComputedStyle(el);
        const startX = lb.left + parseFloat(cs.paddingLeft) + parseFloat(cs.textIndent || 0);
        if (rd.width && Math.abs(rd.left - startX) < 3 && i > 0) out.push({ kind: 'DASHLINE', where: name(el), detail: t.trim().slice(0, 40) }); } }
    if (count) out.push({ kind: 'EMDASH', where: 'page', detail: count + ' visible em dashes' }); }
  // LABELWRAP: short all-caps labels that break onto a second line
  for (const el of document.querySelectorAll('body *')) {
    if (el.children.length || !inViewTree(el)) continue; const cs = getComputedStyle(el);
    if (cs.textTransform !== 'uppercase' || !vis(el)) continue; const t = el.textContent.trim(); if (t.length < 3 || t.length > 60) continue;
    const rg = document.createRange(); rg.selectNodeContents(el); const tops = new Set([...rg.getClientRects()].map(r => Math.round(r.top)));
    if (tops.size > 1) out.push({ kind: 'LABELWRAP', where: name(el), detail: t.slice(0, 44) });
  }
  // OVERFLOW: text that can't wrap (a number, a nowrap label) spilling out of its column or into a neighbour
  for (const el of document.querySelectorAll('body *')) {
    if (!inViewTree(el) || !vis(el) || el.closest('.leaflet-container, svg, select, option')) continue;
    if (!el.childNodes.length || ![...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim())) continue;
    let box = el.parentElement;
    while (box && getComputedStyle(box).display.startsWith('inline')) box = box.parentElement;
    if (!box) continue;
    // measure the glyphs, not the element box: touch targets widened with padding and negative margins are fine
    const tr = document.createRange(); tr.selectNodeContents(el);
    const r = tr.getBoundingClientRect(), br = box.getBoundingClientRect(), bs = getComputedStyle(box);
    const right = br.right + 5;  // past the column's border edge, not into its padding (touch-target margins are fine)
    if (r.right > right && bs.overflowX === 'visible') out.push({ kind: 'OVERFLOW', where: name(el), detail: el.textContent.trim().slice(0, 40) + ' +' + Math.round(r.right - right) + 'px' });
  }
  return out;
}
"""

total = 0
with sync_playwright() as p:
    b = p.chromium.launch()
    for page_path in PAGES:
        for w in WIDTHS:
            ctx = b.new_context(viewport={'width': w, 'height': 900}, device_scale_factor=1)
            pg = ctx.new_page()
            pg.goto(f'{BASE}/{page_path}', wait_until='networkidle')
            pg.evaluate("document.querySelectorAll('.rv').forEach(e => e.classList.add('in'))")
            pg.wait_for_timeout(900)
            res = pg.evaluate(JS)
            seen = set()
            for r in res:
                key = (r['kind'], r['where'], r['detail'])
                if key in seen: continue
                seen.add(key)
                total += 1
                print(f"{page_path:32} {w:5}  {r['kind']:8} {r['where'][:60]:60} {r['detail']}")
            ctx.close()
    b.close()
print('TOTAL', total)
