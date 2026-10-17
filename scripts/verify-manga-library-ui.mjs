// Local synthetic recipe. No account, outbound request, or external message.
import assert from 'node:assert/strict';
import {createServer} from 'vite';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import path from 'node:path';
import narrationManifest from '../src/world/narration-manifest.json' with {type:'json'};
import {STORY_CANON} from '../src/world/story-canon.js';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'@playwright/test');
const port=Number(process.env.MANGA_UI_PORT||5329),origin='http://127.0.0.1:'+port;
const out=path.resolve(process.env.MANGA_UI_OUT||'artifacts/application-ui/manga');
await mkdir(out,{recursive:true});
const server=await createServer({server:{host:'127.0.0.1',port,strictPort:true}});await server.listen();
const browser=await chromium.launch({headless:true,...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{}),args:['--no-sandbox','--disable-dev-shm-usage']});
const checks=[],errors=[];
const check=(label,ok)=>{assert.ok(ok,label);checks.push(label);console.log('PASS',label);};
try{
 for(const width of [390,1440]){
  const context=await browser.newContext({viewport:{width,height:width===390?844:1000},reducedMotion:'reduce',acceptDownloads:true});
  await context.route('**/*',route=>{const url=new URL(route.request().url());if(url.origin!==origin)return route.abort();if(url.pathname.startsWith('/api/'))return route.fulfill({contentType:'application/json',body:'{}'});return route.continue();});
  const page=await context.newPage();page.on('pageerror',error=>errors.push(error.message));
  await page.goto(origin+'/#manga');await page.locator('.manga-library').waitFor();
  const library=page.locator('.manga-library'),nav=page.getByRole('navigation',{name:'Repères du récit'}),reader=library.locator('.manga-library-reader');
  check(width+': twelve existing canon readings',await nav.getByRole('button').count()===12);
  check(width+': complete illustrated chapters are not advertised as available',await library.getByText(/Les chapitres illustrés complets seront annoncés/).count()===1);
  await reader.locator('.manga-library-audio>summary').click();await reader.getByText('Lire la transcription',{exact:true}).click();
  check(width+': prologue transcript is the existing narration',await reader.getByText(narrationManifest.clips.find(clip=>clip.id==='prologue').text,{exact:true}).isVisible());
  check(width+': prologue is a local asset without autoplay',await reader.locator('audio').getAttribute('src')==='/world/narration/fr/v1/prologue.mp3'&&await reader.locator('audio').getAttribute('autoplay')===null);
  await nav.getByRole('button',{name:/^Céliane/}).click();await reader.getByRole('heading',{name:'Céliane',exact:true}).waitFor();
  await reader.getByRole('button',{name:'Marquer comme lu',exact:true}).click();await reader.getByRole('button',{name:'Ajouter Céliane aux favoris',exact:true}).click();
  check(width+': read progress and favorites are real choices',await library.getByText('1/12 lus',{exact:true}).count()===1&&await reader.getByRole('button',{name:'Retirer Céliane des favoris'}).getAttribute('aria-pressed')==='true');
  await library.getByRole('searchbox').fill('algerie loyaute');check(width+': search accepts unaccented country and value',await nav.getByRole('button').count()===1&&await nav.getByRole('button',{name:/^Yliane/}).count()===1);
  await library.getByRole('searchbox').fill('');await page.reload();await reader.getByRole('heading',{name:'Céliane',exact:true}).waitFor();
  check(width+': reading location, progress and favorites survive reload',await library.getByText('1/12 lus',{exact:true}).count()===1&&await reader.getByRole('button',{name:'Retirer Céliane des favoris'}).count()===1);
  const pending=page.waitForEvent('download');await library.getByRole('button',{name:'Exporter mon carnet',exact:true}).click();const download=await pending;const file=path.join(out,'manga-suivi-'+width+'.json');await download.saveAs(file);const exported=JSON.parse(await readFile(file,'utf8'));
  check(width+': exported notebook contains chosen reading and preferences',exported.format==='3b-manga-library'&&exported.lastId==='france'&&exported.readIds.includes('france')&&exported.favoriteIds.includes('france'));
  const imported={format:'3b-manga-library',version:1,lastId:'kais',readIds:['kais'],favoriteIds:['estonie']};
  await library.locator('input[type=file]').setInputFiles({name:'manga-carnet.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(imported))});
  check(width+': import displays a confirmation preview',await library.locator('.manga-library-import').getByText(/Ajouter 1 repère lu et 1 favori/).count()===1&&await library.getByText('1/12 lus',{exact:true}).count()===1);
  await library.getByRole('button',{name:'Confirmer l’import',exact:true}).click();check(width+': import merges without replacing the current reading',await library.getByText('2/12 lus',{exact:true}).count()===1&&await reader.getByRole('heading',{name:'Céliane',exact:true}).count()===1&&await library.getByRole('button',{name:'Mes favoris · 2',exact:true}).count()===1);
  await nav.getByRole('button',{name:/^Le Cercle retrouvé/}).click();check(width+': finale is hidden until explicitly revealed',await reader.locator('.manga-library-paragraphs').count()===0&&await reader.getByRole('button',{name:'Marquer comme lu',exact:true}).isDisabled());
  await reader.getByRole('button',{name:'Afficher les révélations',exact:true}).click();check(width+': revealed finale remains the original canon',await reader.getByText(STORY_CANON.finale.victory,{exact:true}).count()===1);
  await nav.getByRole('button',{name:/^Céliane/}).click();check(width+': manga fits viewport',await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
  await page.evaluate(()=>window.scrollTo(0,0));await page.screenshot({path:path.join(out,'manga-'+width+'.png'),fullPage:true});await context.close();
 }
 check('No manga rendering errors',errors.length===0);
 await writeFile(path.join(out,'manga-results.json'),JSON.stringify({count:checks.length,checks,errors},null,2));console.log('MANGA_UI_OK',checks.length);
}finally{await browser.close();await server.close();}
