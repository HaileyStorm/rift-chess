#!/usr/bin/env python3
"""Run real module-worker/Canvas tests and capture the actual Bend-rendered demo.

Container Chromium blocks all URL navigation. Tests therefore use about:blank,
rebased in-memory ESM imports and data-URL MODULE workers. No browser policy or
security flag is changed. Library logic is unchanged; only import locations and
application endpoint injection are rebased. This does not validate HTTP serving,
CSP, deployment caching, file:// module behavior or GPU execution.
"""
from __future__ import annotations
import argparse,base64,hashlib,json,re,shutil,time
from pathlib import Path
from playwright.sync_api import sync_playwright
from browser_fixture import ROOT,CACHE,RECORDS,module_url,install
LIB=ROOT/'bend2/lib/graphics/v2'

def data_module(source: str) -> str:
    """Encode a complete standalone module without any network fetch."""
    return 'data:text/javascript;base64,'+base64.b64encode(source.encode()).decode()

def save_canvas(page,path: Path) -> None:
    """Retain native 1024² canvas pixels, not a resized DOM screenshot."""
    value=page.evaluate("document.getElementById('canvas').toDataURL('image/png')")
    path.write_bytes(base64.b64decode(value.split(',',1)[1]))

def main() -> None:
    """Run positive/fault controls before generating browser visual evidence."""
    ap=argparse.ArgumentParser(description=__doc__);ap.add_argument('--chromium',default=shutil.which('chromium'));ap.add_argument('--skip-showcase',action='store_true');ap.add_argument('--output',type=Path,default=ROOT/'.artifacts/graphics-browser-local');args=ap.parse_args()
    if not args.chromium:ap.error('A local Chromium executable is required')
    out=args.output.resolve();out.mkdir(parents=True,exist_ok=True);visuals=out/'visuals';visuals.mkdir(exist_ok=True)
    reference=LIB/'review-third/receipts/native/reference.json'
    if not reference.exists():raise RuntimeError('Run native_third.py first to produce complete native fixture pixels')
    report={'method':__doc__,'errors':[],'showcase':[]};start=time.perf_counter()
    with sync_playwright() as p:
        browser=p.chromium.launch(executable_path=args.chromium,headless=True,args=['--no-sandbox','--disable-gpu']);report['browser']=browser.version
        page=browser.new_page(viewport={'width':1500,'height':1180},device_scale_factor=1)
        page.on('pageerror',lambda error:report['errors'].append(str(error)[:3000]));page.set_content('<!doctype html><html><body><h1>Offline worker protocol tests</h1></body></html>');install(page)
        page.evaluate('''o=>{window.__fixtureURL=o.fixture;window.__badWorkerURL=o.bad;window.__bendFixtureURL=o.bend;window.__nativePixels=o.native;}''',{'fixture':module_url(LIB/'tests/third/worker-task.mjs'),'bad':data_module((LIB/'tests/third/worker-bad-identity.mjs').read_text()),'bend':module_url(LIB/'tests/third/worker-bend.mjs'),'native':json.loads(reference.read_text())})
        page.evaluate('''url=>{window.__qaPromise=import(url).catch(e=>{window.__qaError=e.stack;});}''',module_url(LIB/'tests/third/browser.mjs'))
        page.wait_for_function('!!window.__qa||!!window.__qaError',timeout=120000)
        error=page.evaluate('window.__qaError??null')
        if error:
            (out/'failure.txt').write_text(error);raise AssertionError(error)
        report['protocol']=page.evaluate('window.__qa');print('Protocol groups',len(report['protocol']['groups']),flush=True)
        page.close()
        if not args.skip_showcase:
            page=browser.new_page(viewport={'width':1500,'height':1180},device_scale_factor=1);page.on('pageerror',lambda error:report['errors'].append(str(error)[:3000]));html=(LIB/'review-third/demo/index.html').read_text();html=re.sub(r'<link[^>]+stylesheet[^>]*>','',html);html=re.sub(r'<script type="module"[^>]*></script>','',html)
            page.set_content(html);page.add_style_tag(content=(LIB/'review-third/demo/style.css').read_text());install(page)
            page.evaluate('''url=>{window.__app=import(url).catch(e=>{document.body.dataset.error=e.message;});}''',module_url(LIB/'review-third/demo/app.mjs',True));page.wait_for_function("document.body.dataset.ready==='true'||!!document.body.dataset.error",timeout=180000)
            if page.evaluate('document.body.dataset.error??null'):raise RuntimeError(page.evaluate('document.body.dataset.error'))
            report['showcase'].append({'name':'aurora-cold','record':page.evaluate('window.prism.records.at(-1)')})
            for value in [.35,.65,.42]:page.evaluate('value=>window.prism.setPhase(value)',value);report['showcase'].append({'name':'aurora-dirty','record':page.evaluate('window.prism.records.at(-1)')})
            page.screenshot(path=str(visuals/'01-prism-workbench.png'),full_page=True);save_canvas(page,visuals/'02-aurora-canvas.png')
            for name,index in [('topology','03'),('instrument','04')]:
                page.evaluate('name=>window.prism.select(name)',name);report['showcase'].append({'name':name+'-cold','record':page.evaluate('window.prism.records.at(-1)')});page.evaluate('window.prism.setPhase(.57)');report['showcase'].append({'name':name+'-dirty','record':page.evaluate('window.prism.records.at(-1)')});save_canvas(page,visuals/f'{index}-{name}-canvas.png');print('Rendered',name,flush=True)
            # Click real controls and read the committed result, rather than DOM-only assertions.
            page.locator('#visible').uncheck();page.wait_for_function("document.getElementById('status').textContent.startsWith('Committed')");report['visibility_control']=page.evaluate('window.prism.last')
            page.set_viewport_size({'width':600,'height':1000});page.screenshot(path=str(visuals/'05-responsive-workbench.png'),full_page=True);assert page.evaluate('document.documentElement.scrollWidth<=innerWidth'),'Horizontal overflow in narrow view'
            report['showcase_sources']={'scene':hashlib.sha256((LIB/'review-third/demo/scene.mjs').read_bytes()).hexdigest(),'app':hashlib.sha256((LIB/'review-third/demo/app.mjs').read_bytes()).hexdigest()};page.close()
        browser.close()
    report.update(ok=True,seconds=time.perf_counter()-start,source_rebases=RECORDS,limitations='No HTTP/module URL navigation, CSP/deployment caching or GPU validation. Real Chrome module workers, actual compiled Bend, transferable bytes, Canvas2D and responsive DOM were executed. Browser rendering timings include this in-memory task transport, not HTTP startup.')
    (out/'summary.json').write_text(json.dumps(report,indent=2)+'\n');print(json.dumps({'ok':True,'groups':len(report['protocol']['groups']),'comparedBytes':report['protocol']['comparedBytes'],'showcaseFrames':len(report['showcase']),'errors':len(report['errors'])}),flush=True)

if __name__=='__main__':main()
