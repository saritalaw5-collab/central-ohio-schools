"""Render guide-src/guide.html to static/central-ohio-school-district-research-guide.pdf.
Usage: python3 guide-src/render.py   (needs Playwright + Chrome/Chromium)"""
import pathlib, sys
from playwright.sync_api import sync_playwright
root = pathlib.Path(__file__).resolve().parent.parent
src = (root / 'guide-src' / 'guide.html').as_uri()
out = root / 'static' / 'central-ohio-school-district-research-guide.pdf'
with sync_playwright() as p:
    exe = '/usr/bin/google-chrome' if pathlib.Path('/usr/bin/google-chrome').exists() else None
    br = p.chromium.launch(executable_path=exe) if exe else p.chromium.launch()
    pg = br.new_page()
    pg.goto(src); pg.wait_for_load_state('networkidle'); pg.evaluate('document.fonts.ready')
    over = pg.evaluate("""[...document.querySelectorAll('.page')].map((p,i)=>{
      const pr=p.getBoundingClientRect(); let worst=0;
      p.querySelectorAll('*').forEach(el=>{ if(el.closest('.folio')) return; const r=el.getBoundingClientRect(); worst=Math.max(worst, r.bottom-pr.bottom+ (el.closest('.back')?0:0.45*96)); });
      return [i+1, Math.round(worst)]; })""")
    print('overflow past folio line (px, >0 is bad):', [o for o in over if o[1] > 0] or 'none')
    print('fonts:', pg.evaluate("[...document.fonts].filter(f=>f.status==='loaded').map(f=>f.family+' '+f.weight)"))
    pg.pdf(path=str(out), width='8.5in', height='11in', print_background=True, prefer_css_page_size=True)
    br.close()
print('wrote', out)
