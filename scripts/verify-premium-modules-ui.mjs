// Isolated UI recipe: synthetic local data, blocked external network, no account or message sent.
import assert from 'node:assert/strict';
import {createServer} from 'vite';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import path from 'node:path';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'@playwright/test');
const port=Number(process.env.PREMIUM_MODULES_UI_PORT||5328);
const mediaSaveDelayMs=Math.max(0,Math.min(3000,Number(process.env.PREMIUM_MODULES_MEDIA_SAVE_DELAY_MS)||0));
const server=await createServer({server:{host:'127.0.0.1',port,strictPort:true}});
await server.listen();
const origin='http://127.0.0.1:'+port;
const out=path.resolve(process.env.PREMIUM_MODULES_UI_OUT||'artifacts/application-ui/premium-modules');
await mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:true,...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{}),args:['--no-sandbox','--disable-dev-shm-usage']});
const checks=[],errors=[],externalRequests=[];
const check=(label,value)=>{assert.ok(value,label);checks.push(label);console.log('PASS',label);};
const navigate=async(page,name,selector)=>{await page.locator('.mx-rail').getByRole('button',{name,exact:true}).click();await page.locator(selector).waitFor();return page.locator(selector);};
async function setup(context){
 if(mediaSaveDelayMs)await context.addInitScript(delay=>{
  if(!navigator.locks?.request)return;
  const original=navigator.locks.request.bind(navigator.locks);
  navigator.locks.request=(name,options,callback)=>{
   const execute=typeof options==='function'?options:callback;
   const delayed=async lock=>{if(name==='threeb_media_library_v1')await new Promise(resolve=>setTimeout(resolve,delay));return execute(lock);};
   return typeof options==='function'?original(name,delayed):original(name,options,delayed);
  };
 },mediaSaveDelayMs);
 await context.route('**/*',route=>{
  const url=new URL(route.request().url());
  if(url.origin!==origin){externalRequests.push(url.origin);return route.abort();}
  if(url.pathname.startsWith('/api/'))return route.fulfill({contentType:'application/json',body:JSON.stringify({items:[],services:[],total:0})});
  return route.continue();
 });
}
async function openPage(context){const page=await context.newPage();page.setDefaultTimeout(15000);page.on('pageerror',error=>errors.push(error.message));await page.goto(origin+'/tests/member-preview.html',{waitUntil:'domcontentloaded',timeout:45000});await page.locator('.mx-shell').waitFor({timeout:30000});return page;}
async function download(page,button,name){const pending=page.waitForEvent('download');await button.click();const file=await pending;await file.saveAs(path.join(out,name));return readFile(path.join(out,name),'utf8');}
const fits=page=>page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+1);
async function waitForStoredMedia(page,expected,phase,successNotice=''){
 try{
  await page.waitForFunction(expected=>{
   let state;try{state=JSON.parse(localStorage.getItem('threeb_media_library_v1')||'null');}catch{return false;}
   return Array.isArray(state?.entries)&&state.entries.some(entry=>Object.entries(expected).every(([field,value])=>entry[field]===value));
  },expected);
  if(successNotice)await page.locator('.med3b-notice').getByText(successNotice,{exact:true}).waitFor();
 }catch(error){
  const observed=await page.evaluate(()=>({stored:localStorage.getItem('threeb_media_library_v1'),notice:document.querySelector('.med3b-notice')?.textContent||''})).catch(()=>({unavailable:true}));
  throw new Error(`Media persistence failed (${phase}): expected ${JSON.stringify(expected)}; observed ${JSON.stringify(observed)}. ${error.message}`,{cause:error});
 }
}

try{
 for(const width of [390,1440]){
  const context=await browser.newContext({viewport:{width,height:width===390?844:1000},timezoneId:'Europe/Paris',reducedMotion:'reduce',acceptDownloads:true});await setup(context);
  const page=await openPage(context),prefix=width+': ';
  let travel=await navigate(page,'Voyage 3B','.travel-notebook');
  check(prefix+'travel starts with no invented trips',await travel.locator('.travel-empty').count()===1);
  await travel.getByRole('button',{name:'Créer mon premier carnet',exact:true}).click();
  await page.locator('#travel-title').fill('Mon itinéraire Paris · recette QA');
  await page.locator('#travel-country').selectOption('FR');
  await page.locator('#travel-start').fill('2026-11-03');await page.locator('#travel-end').fill('2026-11-09');
  await page.locator('#travel-notes').fill('Exemple de carnet personnel pour vérifier les parcours.');
  await travel.getByRole('button',{name:'Enregistrer mon voyage',exact:true}).click();
  await travel.locator('.travel-current').getByText('Mon itinéraire Paris · recette QA',{exact:true}).waitFor();
  await travel.getByRole('button',{name:'Une étape',exact:true}).click();
  await page.locator('#travel-step-title').fill('Balade culturelle · recette QA');await page.locator('#travel-step-place').fill('Paris');
  await page.locator('#travel-step-date').fill('2026-11-04');await page.locator('#travel-step-cost').fill('25,50');
  await travel.getByRole('button',{name:'Enregistrer l’étape',exact:true}).click();
  check(prefix+'travel itinerary and exact user budget',await travel.locator('.travel-timeline h5').count()===1&&/25,50/.test(await travel.locator('.travel-stats').innerText()));
  await travel.getByRole('button',{name:/^Mes préparatifs/}).click();await travel.locator('.travel-check-toggle').first().click();
  await page.locator('#travel-new-check').fill('Télécharger un plan hors ligne · recette QA');await travel.locator('.travel-add-check').getByRole('button',{name:'Ajouter',exact:true}).click();
  check(prefix+'travel custom checklist can be checked',await travel.locator('.travel-checklist li').count()===6&&await travel.locator('.travel-check-toggle[aria-pressed=true]').count()===1);
  const text=await download(page,travel.getByRole('button',{name:'Exporter ce voyage',exact:true}),'voyage-'+width+'.txt');
  check(prefix+'offline travel text includes saved itinerary',text.includes('Balade culturelle · recette QA')&&text.includes('25,50'));
  const tripBackup=await download(page,travel.getByRole('button',{name:'Sauvegarde JSON',exact:true}),'voyage-'+width+'.json');
  check(prefix+'travel JSON is a restorable local notebook',JSON.parse(tripBackup).trips.length===1);
  await travel.getByRole('button',{name:'Mes étapes',exact:true}).click();await travel.screenshot({path:path.join(out,'voyage-'+width+'.png')});
  check(prefix+'travel fits viewport',await fits(page));
  await page.reload();await page.locator('.mx-shell').waitFor();travel=await navigate(page,'Voyage 3B','.travel-notebook');
  check(prefix+'travel dates, itinerary and checklist persist after reload',await travel.locator('.travel-timeline h5').count()===1&&/1 \/ 6 cochés/.test(await travel.locator('.travel-stats').innerText()));
  const other=await openPage(context),otherTravel=await navigate(other,'Voyage 3B','.travel-notebook');
  await travel.getByRole('button',{name:/^Mes préparatifs/}).click();await travel.locator('.travel-check-toggle').nth(1).click();
  await otherTravel.getByRole('button',{name:/^Mes préparatifs/}).click();await otherTravel.locator('.travel-check-toggle').first().click();
  check(prefix+'stale travel tab cannot overwrite newer checklist',await otherTravel.locator('.travel-feedback.is-error').count()===1);
  await otherTravel.getByRole('button',{name:'Recharger les carnets',exact:true}).click();
  check(prefix+'travel conflict reload restores latest snapshot',/2 \/ 6 cochés/.test(await otherTravel.locator('.travel-stats').innerText()));await other.close();

  let admin=await navigate(page,'Administratif','.aj-shell');
  check(prefix+'admin starts without invented dossiers',await admin.locator('.aj-empty').count()===1);
  await admin.getByRole('button',{name:'Nouvelle démarche',exact:true}).click();
  await admin.getByLabel('Intitulé de la démarche',{exact:true}).fill('Préparer mon rendez-vous · recette QA');
  await admin.getByLabel(/^Catégorie/).selectOption('identity');
  await admin.locator('.aj-editor input[type=date]').fill('2026-11-03');await admin.getByRole('button',{name:'Créer ma démarche',exact:true}).click();
  await admin.locator('.aj-tasks input[type=checkbox]').first().check();
  await admin.getByLabel('Ajouter une étape',{exact:true}).fill('Relire la procédure · recette QA');await admin.getByRole('button',{name:'Ajouter cette étape',exact:true}).click();
  await admin.getByLabel(/^État de la démarche/).selectOption('sent');
  check(prefix+'admin tasks, personal deadline and status are editable',await admin.locator('.aj-tasks li').count()===4&&await admin.getByLabel(/^État de la démarche/).inputValue()==='sent');
  check(prefix+'admin authority link remains on official service',new URL(await admin.locator('.aj-official-link').getAttribute('href')).hostname==='www.service-public.gouv.fr');
  const adminBackup=await download(page,admin.getByRole('button',{name:'Exporter',exact:true}),'demarches-'+width+'.json');
  check(prefix+'admin JSON preserves checklist and chosen deadline',JSON.parse(adminBackup).data.cases[0].dueDate==='2026-11-03'&&JSON.parse(adminBackup).data.cases[0].tasks[0].done===true);
  await admin.screenshot({path:path.join(out,'demarches-'+width+'.png')});check(prefix+'administrative tracker fits viewport',await fits(page));
  await page.reload();await page.locator('.mx-shell').waitFor();admin=await navigate(page,'Administratif','.aj-shell');
  check(prefix+'admin personal progress survives reload',await admin.locator('.aj-tasks input[type=checkbox]:checked').count()===1&&await admin.getByLabel(/^État de la démarche/).inputValue()==='sent');

  let cinema=await navigate(page,'Cinéma','.med3b');
  await cinema.getByRole('button',{name:'Ajouter un titre',exact:true}).click();
  await cinema.getByLabel('Titre du film ou de la série',{exact:true}).fill('Film personnel · recette QA');
  await cinema.getByLabel('Réalisateur ou créateur',{exact:true}).fill('Créateur de test');
  await cinema.getByRole('button',{name:'Enregistrer dans ma liste',exact:true}).click();
  await waitForStoredMedia(page,{title:'Film personnel · recette QA',status:'planned'},prefix+'initial title','Titre ajouté à ta liste locale.');
  await cinema.getByLabel('État de Film personnel · recette QA',{exact:true}).selectOption('watched');
  await waitForStoredMedia(page,{title:'Film personnel · recette QA',status:'watched'},prefix+'initial watched status');
  await cinema.getByRole('button',{name:'Modifier Film personnel · recette QA',exact:true}).click();
  await cinema.getByLabel('Titre du film ou de la série',{exact:true}).fill('Film personnel modifié · recette QA');
  await cinema.getByLabel(/^Pourquoi tu veux le découvrir/).fill('Une note personnelle modifiée pendant la recette.');
  await cinema.getByRole('button',{name:'Enregistrer les modifications',exact:true}).click();
  await waitForStoredMedia(page,{title:'Film personnel modifié · recette QA',status:'watched',notes:'Une note personnelle modifiée pendant la recette.'},prefix+'edited title and notes','Titre et notes mis à jour.');
  check(prefix+'cinema title and notes can be edited without resetting status',await cinema.getByLabel('État de Film personnel modifié · recette QA',{exact:true}).inputValue()==='watched'&&await cinema.getByText('Une note personnelle modifiée pendant la recette.',{exact:true}).count()===1);
  await cinema.getByRole('button',{name:'Modifier Film personnel modifié · recette QA',exact:true}).click();
  await cinema.getByLabel('Titre du film ou de la série',{exact:true}).fill('Modification annulée');
  await cinema.locator('.med3b-form').getByRole('button',{name:'Annuler',exact:true}).click();
  check(prefix+'cinema editor cancellation preserves the saved title',await cinema.getByLabel('État de Film personnel modifié · recette QA',{exact:true}).count()===1&&await cinema.getByText('Modification annulée',{exact:true}).count()===0);
  // Reproduce an editor left open while another tab changes a different field.
  await cinema.getByRole('button',{name:'Modifier Film personnel modifié · recette QA',exact:true}).click();
  const secondCinemaPage=await openPage(context);let secondCinema=await navigate(secondCinemaPage,'Cinéma','.med3b');
  await secondCinema.getByRole('button',{name:'Modifier Film personnel modifié · recette QA',exact:true}).click();
  const remoteNote='Note récente du second onglet · recette QA';
  await secondCinema.getByLabel(/^Pourquoi tu veux le découvrir/).fill(remoteNote);
  await secondCinema.getByRole('button',{name:'Enregistrer les modifications',exact:true}).click();
  await waitForStoredMedia(secondCinemaPage,{title:'Film personnel modifié · recette QA',status:'watched',notes:remoteNote},prefix+'first second-tab note','Titre et notes mis à jour.');
  await cinema.getByLabel('État de Film personnel modifié · recette QA',{exact:true}).selectOption('watching');
  await waitForStoredMedia(page,{title:'Film personnel modifié · recette QA',status:'watching',notes:remoteNote},prefix+'merge of second-tab note');
  await cinema.locator('.med3b-watchlist').getByText(remoteNote,{exact:true}).waitFor();
  await cinema.getByLabel('Titre du film ou de la série',{exact:true}).fill('Film personnel vérifié · recette QA');
  await cinema.getByRole('button',{name:'Enregistrer les modifications',exact:true}).click();
  // Closing the editor and rendering the new title are optimistic. Reloading
  // the second tab must wait for both the stored rename and its success state.
  await waitForStoredMedia(page,{title:'Film personnel vérifié · recette QA',status:'watching',notes:remoteNote},prefix+'rename before second-tab reload','Titre et notes mis à jour.');
  check(prefix+'cinema stale editor preserves notes merged from another tab',await cinema.getByLabel('État de Film personnel vérifié · recette QA',{exact:true}).inputValue()==='watching'&&await cinema.locator('.med3b-watchlist').getByText(remoteNote,{exact:true}).count()===1);
  await cinema.getByRole('button',{name:'Modifier Film personnel vérifié · recette QA',exact:true}).click();
  await cinema.getByLabel(/^Pourquoi tu veux le découvrir/).fill('Ma modification non enregistrée dans le formulaire A');
  await secondCinemaPage.reload();await secondCinemaPage.locator('.mx-shell').waitFor();secondCinema=await navigate(secondCinemaPage,'Cinéma','.med3b');
  await secondCinema.getByRole('button',{name:'Modifier Film personnel vérifié · recette QA',exact:true}).click();
  const newestNote='Notes plus récentes de B · recette QA';
  await secondCinema.getByLabel(/^Pourquoi tu veux le découvrir/).fill(newestNote);
  await secondCinema.getByRole('button',{name:'Enregistrer les modifications',exact:true}).click();
  await waitForStoredMedia(secondCinemaPage,{title:'Film personnel vérifié · recette QA',status:'watching',notes:newestNote},prefix+'newest second-tab note','Titre et notes mis à jour.');
  await cinema.getByLabel('État de Film personnel vérifié · recette QA',{exact:true}).selectOption('watched');
  await waitForStoredMedia(page,{title:'Film personnel vérifié · recette QA',status:'watched',notes:newestNote},prefix+'watched status before conflict assertion');
  await cinema.locator('.med3b-watchlist').getByText(newestNote,{exact:true}).waitFor();
  await cinema.getByRole('button',{name:'Enregistrer les modifications',exact:true}).click();
  check(prefix+'cinema refuses conflicting dirty fields and keeps the draft editable',await cinema.locator('.med3b-form').count()===1&&/depuis l’ouverture/.test(await cinema.locator('.med3b-notice').innerText())&&await cinema.getByLabel(/^Pourquoi tu veux le découvrir/).inputValue()==='Ma modification non enregistrée dans le formulaire A');
  check(prefix+'cinema conflicting draft never overwrites the stored remote note',await page.evaluate(note=>JSON.parse(localStorage.getItem('threeb_media_library_v1')).entries[0].notes===note,newestNote));
  await cinema.locator('.med3b-form').getByRole('button',{name:'Annuler',exact:true}).click();await secondCinemaPage.close();
  const mediaBackup=await download(page,cinema.locator('.med3b-backup').getByRole('button',{name:'Exporter',exact:true}),'mediatheque-'+width+'.json');
  check(prefix+'personal cinema list exports selected status',JSON.parse(mediaBackup).entries[0].status==='watched');
  await cinema.screenshot({path:path.join(out,'cinema-'+width+'.png')});
  await cinema.getByRole('button',{name:'Trouver un film',exact:true}).click();await cinema.getByLabel('Quel film cherches-tu ?').fill('La Haine');
  check(prefix+'cinema finds official provider without claiming availability',new URL(await cinema.locator('.mx-cinema-primary').getAttribute('href')).hostname==='www.arte.tv');
  await page.reload();await page.locator('.mx-shell').waitFor();cinema=await navigate(page,'Cinéma','.med3b');
  check(prefix+'cinema personal entry persists on reload',await cinema.getByLabel('État de Film personnel vérifié · recette QA',{exact:true}).inputValue()==='watched');
  const origins=await navigate(page,'3B Origins TV','.med3b');
  check(prefix+'Origins presents nine existing audio narratives',await origins.locator('.med3b-episode').count()===9);
  await origins.getByRole('button',{name:'Garder ce récit',exact:true}).click();
  await page.waitForFunction(()=>JSON.parse(localStorage.getItem('threeb_media_library_v1')||'null')?.savedNarrations?.includes('prologue')===true);
  await origins.screenshot({path:path.join(out,'origins-'+width+'.png')});
  const narrative=await origins.locator('.med3b-feature-copy>p').innerText();
  await page.route('**/world/narration/**',route=>route.abort());
  await origins.locator('audio').evaluate(element=>{element.load();element.play().catch(()=>{});});
  await origins.getByRole('alert').filter({hasText:'lecture audio est indisponible'}).waitFor();
  check(prefix+'audio failure retains full original narration text',narrative.length>30&&await origins.locator('.med3b-feature-copy>p').innerText()===narrative);
  check(prefix+'media library fits viewport',await fits(page));

  for(const [space,name,button] of [['association','Association 3B','Préparer une initiative'],['partners','Partenaires','Préparer une collaboration'],['join','Nous recherchons','Préparer ma candidature']]){
   let studio=await navigate(page,name,'.col3b-studio');await studio.getByRole('button',{name:button,exact:true}).click();
   await studio.locator('#col3b-title').fill('Projet '+space+' · recette QA');
   await studio.locator('#col3b-objective').fill('Objectif culturel clair pour une recette locale.');
   await studio.locator('#col3b-proposal').fill('Organiser un premier atelier à relire.');
   await studio.locator('#col3b-contribution').fill('Du temps et des compétences de création.');
   await studio.locator('#col3b-timing').fill('Disponibilités à discuter');
   await studio.locator('#col3b-contactName').fill('Recette QA');
   await studio.locator('#col3b-contactEmail').fill('recette@example.test');
   for(const checkbox of await studio.locator('.col3b-checklist input[type=checkbox]').all())await checkbox.check();
   await studio.getByRole('button',{name:'Marquer prêt à relire',exact:true}).click();
   const mail=studio.getByRole('link',{name:/Ouvrir (le mail préparé|un mail à compléter)/});
   check(prefix+space+' brief becomes ready only after personal fields and checklist',await mail.count()===1&&(await mail.getAttribute('href')).startsWith('mailto:'));
   await studio.getByLabel('Prochaine action',{exact:true}).fill('Relire le brief · recette QA');
   await studio.getByLabel('Date pour reprendre ce dossier',{exact:true}).fill('2026-11-05');
   await studio.getByLabel('Ajouter une note de suivi',{exact:true}).fill('Recette locale : aucun message envoyé.');
   await studio.getByRole('button',{name:'Ajouter la note',exact:true}).click();
   const brief=await download(page,studio.getByRole('button',{name:'Dossier texte',exact:true}),space+'-'+width+'.txt');
   check(prefix+space+' text export preserves local activity without transmitting',brief.includes('Recette locale : aucun message envoyé.')&&brief.includes('AUCUNE TRANSMISSION AUTOMATIQUE'));
   await studio.screenshot({path:path.join(out,space+'-'+width+'.png')});check(prefix+space+' workspace fits viewport',await fits(page));
   await navigate(page,'Fidélité','.mx-stage-body');studio=await navigate(page,name,'.col3b-studio');
   check(prefix+space+' brief persists when leaving and returning',await studio.locator('.col3b-draft').filter({hasText:'Projet '+space+' · recette QA'}).count()===1);
  }
  await context.close();
 }
 const homeContext=await browser.newContext({viewport:{width:1440,height:1000},timezoneId:'Europe/Paris',reducedMotion:'reduce'});await setup(homeContext);
 const home=await homeContext.newPage();home.on('pageerror',error=>errors.push(error.message));
 await home.goto(origin+'/#accueil');await home.locator('.atlas3b').waitFor({timeout:30000});
 check('home world map has no central 3B pin',await home.locator('.atlas3b-world-pin').count()===0);
 await home.locator('.atlas3b-stage').screenshot({path:path.join(out,'accueil-sans-logo-central.png')});
 await home.setViewportSize({width:390,height:844});await home.goto(origin+'/#manga');
 const manga=home.locator('.manga-library');await manga.waitFor({timeout:30000});
 check('390: manga presents twelve canonical story references',await manga.locator('.manga-library-list button').count()===12);
 await manga.getByRole('button',{name:'Ajouter Kaïs aux favoris',exact:true}).click();
 await manga.getByRole('button',{name:'Marquer comme lu',exact:true}).click();
 check('390: manga favorite and read mark update personal notebook',/1\/12 lus/.test(await manga.locator('.manga-library-shelf-title').innerText())&&await manga.getByRole('button',{name:'Retirer Kaïs des favoris',exact:true}).getAttribute('aria-pressed')==='true');
 await manga.getByRole('searchbox',{name:'Rechercher un personnage, une valeur ou un héritage',exact:true}).fill('Céliane');
 await manga.locator('.manga-library-list button').filter({hasText:'Céliane'}).first().click();
 await home.reload();await home.locator('.manga-library').waitFor({timeout:30000});
 check('390: manga last reference, favorite and read progress survive reload',await manga.locator('#manga-reading-title').innerText()==='Céliane'&&/1\/12 lus/.test(await manga.locator('.manga-library-shelf-title').innerText()));
 const mangaBackup=await download(home,manga.getByRole('button',{name:'Exporter mon carnet',exact:true}),'manga-390.json');
 check('390: manga export contains actual saved favorite and read ids',JSON.parse(mangaBackup).favoriteIds.includes('kais')&&JSON.parse(mangaBackup).readIds.includes('kais'));
 await manga.screenshot({path:path.join(out,'manga-smoke-390.png')});check('390: manga fits mobile viewport',await fits(home));
 await homeContext.close();
 const blocked=await browser.newContext({viewport:{width:390,height:844},timezoneId:'Europe/Paris',reducedMotion:'reduce'});await setup(blocked);
 await blocked.addInitScript(()=>{Object.defineProperty(window,'localStorage',{configurable:true,get(){throw new DOMException('Storage blocked for QA','SecurityError');}});});
 const page=await openPage(blocked),travel=await navigate(page,'Voyage 3B','.travel-notebook');
 await travel.getByRole('button',{name:'Créer mon premier carnet',exact:true}).click();await page.locator('#travel-title').fill('Carnet en mémoire · recette QA');
 await travel.getByRole('button',{name:'Enregistrer mon voyage',exact:true}).click();
 check('blocked storage: travel remains usable and warns about memory-only save',await travel.locator('.travel-current h4').count()===1&&await travel.locator('.travel-feedback.is-warning').count()===1);
 const admin=await navigate(page,'Administratif','.aj-shell');await admin.getByRole('button',{name:'Nouvelle démarche',exact:true}).click();await admin.getByLabel('Intitulé de la démarche',{exact:true}).fill('Suivi en mémoire · recette QA');await admin.getByRole('button',{name:'Créer ma démarche',exact:true}).click();
 check('blocked storage: admin remains usable without claiming persistence',await admin.locator('.aj-detail').count()===1&&await admin.locator('.aj-notice').count()>=1);
 check('blocked storage: no horizontal overflow',await fits(page));await blocked.close();
 check('all modules render without uncaught browser errors',errors.length===0);
 await writeFile(path.join(out,'results.json'),JSON.stringify({passed:true,count:checks.length,checks,errors,mediaSaveDelayMs,externalNetworkBlocked:true,blockedOrigins:[...new Set(externalRequests)],syntheticDataOnly:true},null,2));
 console.log('PREMIUM_MODULES_UI_OK',checks.length);
}catch(error){
 await writeFile(path.join(out,'results.json'),JSON.stringify({passed:false,count:checks.length,checks,errors,mediaSaveDelayMs,failure:error.message,externalNetworkBlocked:true,syntheticDataOnly:true},null,2));
 throw error;
}finally{await browser.close();await server.close();}
