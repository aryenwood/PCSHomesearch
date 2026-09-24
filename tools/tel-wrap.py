import sys
from playwright.sync_api import sync_playwright
BASE=sys.argv[1]; pages=sys.argv[2:]
JS="""()=>{const out=[];document.querySelectorAll('a[href^="tel:"], a[href^="sms:"]').forEach(a=>{
  let e=a,hid=false;while(e){const cs=getComputedStyle(e);if(cs.display==='none'||e.hidden){hid=true;break}e=e.parentElement}if(hid)return;
  const tw=document.createTreeWalker(a,NodeFilter.SHOW_TEXT);let n;while((n=tw.nextNode())){const m=n.textContent.match(/[(]?\\d{3}[)]?[ -.]?\\d{3}-\\d{4}|\\d{3}-\\d{3}-\\d{4}/);if(!m)continue;
   const rg=document.createRange();rg.setStart(n,m.index);rg.setEnd(n,m.index+m[0].length);const tops=new Set([...rg.getClientRects()].map(r=>Math.round(r.top)));if(tops.size>1)out.push(m[0]);}});
  return {wrap:out,hscroll:document.documentElement.scrollWidth-innerWidth}}"""
tot=0
with sync_playwright() as p:
    b=p.chromium.launch()
    for pg_ in pages:
        for w in (440,390,375):
            pg=b.new_page(viewport={'width':w,'height':900}); pg.goto(f'{BASE}/{pg_}',wait_until='networkidle')
            r=pg.evaluate(JS); pg.close()
            if r['wrap'] or r['hscroll']>0: tot+=1; print(pg_,w,r)
    b.close()
print('ISSUES',tot)
