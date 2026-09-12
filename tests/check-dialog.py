"""Isolated browser checks: actual dialog helper/CSS, not the deployed React app."""
from pathlib import Path
from playwright.sync_api import sync_playwright
import json
root = Path(__file__).resolve().parents[1]
helper = (root/'src/passport/nexus-dialog.js').read_text().replace('export function mountNexusDialog', 'function mountNexusDialog')
css = (root/'src/styles/passport-nexus-accessibility.css').read_text()
fixture = '''<html style="overflow:auto!important"><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>
body {margin:0;overflow:scroll} #app {transform:translateZ(0);height:180px;overflow:hidden} button {min-height:44px}
.passport-portal {position:fixed;inset:0;overflow:hidden auto;background:#000711;color:white;overscroll-behavior:contain}
.passport-portal-close {position:fixed;top:16px;right:16px;z-index:10005;width:44px;height:44px}
.passport-nexus {padding:80px 16px 24px}.passport-door-grid {display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}
.passport-nexus-door {height:150px}.motion {animation:motion 1s linear infinite}@keyframes motion {to{opacity:.6}}
</style><style>''' + css + '''</style></head><body><main id="app"><button id="opener">Passeport</button><button id="background">Arrière-plan</button></main>
<dialog class="passport-portal" aria-label="Nexus test" tabIndex="-1"><button class="passport-portal-close" id="close">×</button><section class="passport-nexus"><h2>NEXUS 3B</h2><div class="passport-door-grid">''' + ''.join(f'<button class="passport-nexus-door">Porte {i}</button>' for i in range(8)) + '''</div><p class="motion">Cercle</p><button id="last">Explorer</button></section></dialog></body></html>'''
results=[]
with sync_playwright() as p:
    browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
    for w,h in [(320,640),(390,844),(844,390),(1440,900)]:
        page=browser.new_page(viewport={'width':w,'height':h})
        page.set_content(fixture)
        page.add_script_tag(content=helper+'''\nwindow.openFixture=()=>{window.release=mountNexusDialog(document.querySelector('dialog'),()=>window.release());};document.querySelector('#opener').onclick=window.openFixture;document.querySelector('#close').onclick=()=>window.release();''')
        page.click('#opener')
        assert page.evaluate("document.activeElement.id")=='close'
        assert page.evaluate("document.querySelector('dialog').matches(':modal')")
        assert page.evaluate("document.body.style.overflow")=='hidden'
        assert page.evaluate("document.querySelector('dialog').getBoundingClientRect().width") == w
        assert page.evaluate("document.querySelector('dialog').getBoundingClientRect().height") == h
        page.locator('#last').focus(); page.keyboard.press('Tab')
        assert page.evaluate("document.activeElement.id")=='close'
        page.keyboard.press('Shift+Tab')
        assert page.evaluate("document.activeElement.id")=='last'
        page.evaluate("document.querySelector('#background').focus()")
        assert page.evaluate("document.querySelector('dialog').contains(document.activeElement)")
        page.keyboard.press('Escape')
        assert not page.evaluate("document.querySelector('dialog').open")
        assert page.evaluate("document.activeElement.id")=='opener'
        assert page.evaluate("getComputedStyle(document.body).overflow")=='scroll'
        assert page.evaluate("document.documentElement.style.overflow")=='auto'
        assert page.evaluate("document.documentElement.style.getPropertyPriority('overflow')")=='important'
        page.click('#opener'); page.click('#close')
        assert page.evaluate("document.activeElement.id")=='opener'
        # App quiet mode and operating-system preference both stop animations.
        page.click('#opener')
        page.evaluate("document.querySelector('dialog').dataset.reducedMotion='true'")
        assert page.locator('.motion').evaluate("e=>getComputedStyle(e).animationName")=='none'
        page.evaluate("document.querySelector('dialog').dataset.reducedMotion='false'")
        page.emulate_media(reduced_motion='reduce')
        assert page.locator('.motion').evaluate("e=>getComputedStyle(e).animationName")=='none'
        results.append({'viewport':f'{w}x{h}','status':'PASS','checks':['initial focus','native modal isolation','full viewport','Tab wrap','Shift+Tab wrap','background focus blocked','Escape','focus restored','overflow and priority restored','reopen','quiet mode','system reduced motion']})
        page.close()
    # Fallback path keeps and restores existing inert attributes.
    page=browser.new_page(); page.set_content(fixture)
    page.add_script_tag(content=helper)
    page.evaluate("() => { document.querySelector('#opener').focus(); document.querySelector('dialog').showModal=undefined; document.querySelector('#app').setAttribute('inert',''); window.release=mountNexusDialog(document.querySelector('dialog'),()=>window.release()); }")
    assert page.evaluate("document.querySelector('dialog').open")
    page.evaluate("window.release();window.release()")
    assert page.evaluate("document.querySelector('#app').hasAttribute('inert')")
    results.append({'mode':'non-native fallback and idempotent cleanup','status':'PASS'})
    browser.close()
(root/'tests/browser-results.json').write_text(json.dumps({'scope':'isolated helper fixture; not live Vercel or Samsung','results':results},ensure_ascii=False,indent=2))
print(json.dumps(results,ensure_ascii=False,indent=2))
