import { escapeHtml as esc, safeHttps, spokenBiography, traceRelations, exportRecord, availableStops, createNarrator } from './discovery-core.js';
import { discoveryChapters as chapters, discoveryResources as resources } from './discovery-data.js';
const kinds = {audio:'ÉCOUTER',video:'REGARDER',document:'LIRE',collection:'EXPLORER'};
const names = {islam:'Islam',christianisme:'Christianisme',judaisme:'Judaïsme'};
const link = (url, label) => { const href=safeHttps(url); return href?`<a href="${esc(href)}" target="_blank" rel="noopener noreferrer">${esc(label)} <span aria-hidden="true">↗</span></a>`:''; };
function resourceCard(r) {
  return `<article class="discovery-resource"><small>${kinds[r.kind]} · ${esc(names[r.tradition]||'Regards croisés')}</small><h4>${esc(r.title)}</h4><p>${esc(r.description)}</p><p class="discovery-meta">${esc(r.publisher)} · ${esc(r.language)}</p>${link(r.url, r.kind==='collection'?'Ouvrir le catalogue':'Ouvrir le contenu complet')}</article>`;
}
function atlas(scope='all') {
  const list=chapters.filter(c=>scope==='all'||c.traditions.includes(scope)||c.traditions.includes('shared'));
  const media=resources.filter(r=>scope==='all'||r.tradition===scope);
  return `<section class="discovery-atlas" id="discovery-atlas" aria-labelledby="discovery-title"><header><p class="discovery-eyebrow">LES TEXTES DERRIÈRE LES BRANCHES</p><h2 id="discovery-title">Une histoire.<br><em>Ses sources. Ses nuances.</em></h2><p>Des parcours accompagnés, sans inventer les liens qui manquent.</p></header><div class="discovery-chapters">${list.map((c,i)=>`<button class="discovery-chapter" data-discovery-chapter="${c.id}"><span class="discovery-number">0${i+1}</span><small>${esc(c.eyebrow)}</small><h3>${esc(c.title)}</h3><p>${esc(c.paragraphs[0].slice(0,135))}…</p><span class="discovery-arrow">Lire et écouter <span aria-hidden="true">↗</span></span></button>`).join('')}</div><details class="discovery-media"><summary>${media.length} accès aux textes, films, écoutes et catalogues</summary><p>Contenus complets chez les éditeurs identifiés. Les catalogues sont signalés comme tels. Aucun lecteur tiers ne se charge sans votre action.</p><div class="discovery-resources">${media.map(resourceCard).join('')}</div></details><p class="discovery-footnote">Les résumés sont éditoriaux. La synthèse vocale lit ces résumés, pas une récitation sacrée. Les images de musée et les contenus précédents restent dans la bibliothèque.</p></section>`;
}
function audioControls(id) {
  return `<div class="discovery-audio" id="${id}"><button data-discovery-play>Écouter la fiche entière</button><button data-discovery-pause disabled>Pause</button><button data-discovery-stop disabled>Arrêter</button><label>Vitesse <select aria-label="Vitesse de lecture" data-discovery-rate><option value="0.85">0,85×</option><option value="1" selected>1×</option><option value="1.15">1,15×</option></select></label><span role="status" aria-live="polite" data-discovery-status>Lecture en français · voix de l’appareil</span></div>`;
}
function installInteractions() {
  const abort=new AbortController();
  let currentAudio=null, currentText='', opener=null;
  const narrator=createNarrator(window.speechSynthesis, window.SpeechSynthesisUtterance, value=>{
    if(!currentAudio?.isConnected)return;
    const busy=['reading','paused'].includes(value.state);
    currentAudio.querySelector('[data-discovery-pause]').disabled=!busy;
    currentAudio.querySelector('[data-discovery-stop]').disabled=!busy;
    currentAudio.querySelector('[data-discovery-pause]').textContent=value.state==='paused'?'Reprendre':'Pause';
    const messages={idle:'Lecture en français · voix de l’appareil',reading:`Lecture · passage ${value.index+1}/${value.total}`,paused:'Lecture en pause',ended:'Lecture terminée',error:'Lecture interrompue par l’appareil. Vous pouvez la relancer.',unavailable:'La synthèse vocale est indisponible sur cet appareil.'};
    currentAudio.querySelector('[data-discovery-status]').textContent=messages[value.state]||'';
  });
  function bindAudio(container, text) {
    container.dataset.discoveryText=text;
    container.addEventListener('click',e=>{
      const target=e.target.closest('button'); if(!target)return;
      if(target.hasAttribute('data-discovery-play')) {
        narrator.stop(); currentAudio=container; currentText=text;
        narrator.start(currentText, container.querySelector('[data-discovery-rate]').value);
      }
      if(target.hasAttribute('data-discovery-pause') && currentAudio===container)narrator.togglePause();
      if(target.hasAttribute('data-discovery-stop') && currentAudio===container)narrator.stop();
    },{signal:abort.signal});
    container.querySelector('[data-discovery-rate]').addEventListener('change',()=>{
      if(currentAudio===container)narrator.stop();
      container.querySelector('[data-discovery-status]').textContent='Vitesse choisie. Appuyez sur Écouter pour lire depuis le début.';
    },{signal:abort.signal});
  }
  let dialog=document.querySelector('#discovery-dialog');
  if(!dialog){dialog=document.createElement('dialog');dialog.id='discovery-dialog';dialog.className='discovery-dialog';document.body.append(dialog);}
  dialog.addEventListener('close',()=>{narrator.stop(); if(opener?.isConnected)opener.focus({preventScroll:true});},{signal:abort.signal});
  document.addEventListener('click',e=>{
    const button=e.target.closest('[data-discovery-chapter]');if(!button)return;
    const chapter=chapters.find(c=>c.id===button.dataset.discoveryChapter);if(!chapter)return;
    opener=button;narrator.stop();
    dialog.innerHTML=`<button class="discovery-close" aria-label="Fermer le dossier" autofocus>×</button><p class="discovery-eyebrow">${esc(chapter.eyebrow)}</p><h2 id="discovery-dialog-title">${esc(chapter.title)}</h2><span class="discovery-meta">Résumé éditorial · textes et perspectives identifiés</span>${chapter.paragraphs.map(p=>`<p>${esc(p)}</p>`).join('')}${audioControls('discovery-chapter-audio')}<h3>Lire les sources en entier</h3><div class="discovery-source-links">${chapter.sources.map(s=>link(s[1],s[0])).join('')}</div><h3>Poursuivre la découverte</h3><div class="discovery-resources">${resources.filter(r=>chapter.resources.includes(r.id)).map(resourceCard).join('')}</div>`;
    dialog.setAttribute('aria-labelledby','discovery-dialog-title');
    dialog.querySelector('.discovery-close').onclick=()=>dialog.close();
    bindAudio(dialog.querySelector('.discovery-audio'),[chapter.title,...chapter.paragraphs].join('. '));
    if(!dialog.open)dialog.showModal();
  },{signal:abort.signal});
  // Stop a chapter or profile reading before navigating to another source figure.
  document.addEventListener('click',e=>{if(e.target.closest('[data-person],#close-detail,[data-go],[data-dossier-voice],[data-stop-voice]'))narrator.stop();},{capture:true,signal:abort.signal});
  window.addEventListener('hashchange',()=>narrator.stop(),{signal:abort.signal});
  window.addEventListener('pagehide',e=>{narrator.stop();if(!e.persisted)abort.abort();},{signal:abort.signal});
  return {bindAudio,stop:()=>narrator.stop(),signal:abort.signal};
}
export function mountLibrary() {
  const main=document.querySelector('#main');if(!main||main.dataset.discoveryMounted)return;
  main.dataset.discoveryMounted='true'; installInteractions();
  function refresh(){
    if(main.querySelector('#discovery-atlas'))return;
    const route=location.hash.slice(1)||'home';
    if(!['home','histories','media','library','discover'].includes(route)&&!route.startsWith('religion/'))return;
    const scope=route.startsWith('religion/')?route.split('/')[1]:'all';
    const content=document.createElement('div');content.innerHTML=atlas(scope);main.append(content.firstElementChild);
  }
  const observer=new MutationObserver(refresh);observer.observe(main,{childList:true});refresh();
  window.addEventListener('pagehide',e=>{if(!e.persisted)observer.disconnect();});
}
export function mountTree(corpus) {
  const root=document.querySelector('#tree-app'),detail=document.querySelector('#detail');
  if(!root||!detail||root.dataset.discoveryMounted)return;
  root.dataset.discoveryMounted='true';
  const interactions=installInteractions(),byId=new Map(corpus.nodes.map(n=>[n.id,n]));
  const wrapper=document.createElement('div');wrapper.innerHTML=atlas();
  root.querySelector('main').insertBefore(wrapper.firstElementChild,root.querySelector('main > footer'));
  const tours=chapters.map(c=>({...c,stops:availableStops(corpus,c.people)})).filter(c=>c.stops.length);
  const dock=document.createElement('section');dock.className='discovery-tours';dock.setAttribute('aria-label','Parcours de découverte dans l’arbre');
  dock.innerHTML=`<label for="discovery-tour">Se laisser guider</label><select id="discovery-tour"><option value="">Choisir un parcours</option>${tours.map(c=>`<option value="${c.id}">${esc(c.title)}</option>`).join('')}</select><button data-tour-prev disabled aria-label="Étape précédente">←</button><button data-tour-next disabled aria-label="Étape suivante">→</button><p role="status" aria-live="polite">Un parcours de lecture n’est pas une chaîne de filiation.</p>`;
  root.querySelector('.tree-caption').after(dock);
  let tour=null,step=0;
  function visit(){
    if(!tour)return;const id=tour.stops[step];
    const branch=document.querySelector('#branch'),search=document.querySelector('#search');
    if(branch.value!=='all'){branch.value='all';branch.dispatchEvent(new Event('change',{bubbles:true}));}
    if(search.value){search.value='';search.dispatchEvent(new Event('input',{bubbles:true}));}
    const trigger=document.createElement('button');trigger.dataset.person=id;trigger.hidden=true;root.append(trigger);trigger.click();trigger.remove();
    dock.querySelector('p').textContent=`Étape ${step+1}/${tour.stops.length} · ${byId.get(id).name}. Ordre de découverte, pas filiation directe.`;
    dock.querySelector('[data-tour-prev]').disabled=step===0;dock.querySelector('[data-tour-next]').disabled=step===tour.stops.length-1;
  }
  dock.querySelector('select').onchange=e=>{tour=tours.find(c=>c.id===e.target.value)||null;step=0;if(tour)visit();else{dock.querySelectorAll('button').forEach(b=>b.disabled=true);dock.querySelector('p').textContent='Un parcours de lecture n’est pas une chaîne de filiation.';}};
  dock.querySelector('[data-tour-prev]').onclick=()=>{if(tour&&step>0){step--;visit();}};
  dock.querySelector('[data-tour-next]').onclick=()=>{if(tour&&step<tour.stops.length-1){step++;visit();}};
  let focusedId=null,lastOpener=null;
  root.addEventListener('click',e=>{const el=e.target.closest('[data-person]');if(el&&!el.hidden)lastOpener=el;},{capture:true,signal:interactions.signal});
  function enhanceDetail(){
    if(detail.hidden){if(focusedId){focusedId=null;lastOpener?.isConnected&&lastOpener.focus({preventScroll:true});}return;}
    if(detail.querySelector('.discovery-profile'))return;
    const id=location.hash.slice(1),node=byId.get(id);if(!node)return;
    const section=document.createElement('section');section.className='discovery-profile';
    section.innerHTML=`<h3>Explorer les liens, sans en inventer.</h3><div class="discovery-trace-controls"><label>Direction <select data-trace-direction><option value="ancestors">Ascendance du corpus</option><option value="descendants">Descendance du corpus</option></select></label><label class="discovery-checkbox"><input type="checkbox" data-trace-literary> Inclure les successions textuelles</label></div><p class="discovery-meta">Les unions et les fratries ne sont jamais transformées en filiations. Les étapes sont des liens du corpus, pas des générations historiquement prouvées.</p><div data-trace-results></div>${audioControls('discovery-profile-audio')}<button class="discovery-export" data-discovery-export>Enregistrer la fiche et ses sources · JSON</button><div class="discovery-profile-chapters">${chapters.filter(c=>c.people.includes(id)).map(c=>`<button data-discovery-chapter="${c.id}">${esc(c.title)} ↗</button>`).join('')}</div>`;
    detail.append(section);
    function renderTrace(){
      const result=traceRelations(corpus,id,section.querySelector('[data-trace-direction]').value,section.querySelector('[data-trace-literary]').checked);
      section.querySelector('[data-trace-results]').innerHTML=`<details class="discovery-trace"><summary>${result.length} figure${result.length>1?'s':''} reliée${result.length>1?'s':''} par ces critères</summary><p>Un chemin court par figure est affiché. Les chemins alternatifs peuvent exister ; consultez les relations directes pour comparer leurs sources.</p>${result.map(r=>`<article><button data-person="${esc(r.node.id)}">${esc(r.node.name)}</button><small>${r.steps} étape${r.steps>1?'s':''}${r.literary?' · succession textuelle incluse':''}</small><details><summary>Voir le chemin et ses références</summary><ol>${r.trail.map(e=>`<li>${esc(byId.get(e.source)?.name)} → ${esc(byId.get(e.target)?.name)}<br><small>${e.kind==='lineage'?'Succession textuelle':'Filiation selon le texte'} · ${esc(e.reference||'Voir la fiche source')}</small></li>`).join('')}</ol></details></article>`).join('')||'<p>Aucune filiation supplémentaire avec ces critères. Aucun raccord ne sera inventé.</p>'}</details>`;
    }
    section.querySelectorAll('[data-trace-direction],[data-trace-literary]').forEach(el=>el.addEventListener('change',renderTrace));renderTrace();
    interactions.bindAudio(section.querySelector('.discovery-audio'),spokenBiography(node));
    // Replace only old audio handlers; all old biography, references and actions remain.
    const oldSpeak=detail.querySelector('#speak'),oldStop=detail.querySelector('#stop');
    if(oldSpeak)oldSpeak.onclick=()=>section.querySelector('[data-discovery-play]').click();
    if(oldStop)oldStop.onclick=interactions.stop;
    section.querySelector('[data-discovery-export]').onclick=()=>{
      const record=exportRecord(corpus,id);const url=URL.createObjectURL(new Blob([JSON.stringify(record,null,2)],{type:'application/json;charset=utf-8'}));
      const a=document.createElement('a');a.href=url;a.download=`3b-religion-${id.replace(/[^a-z0-9-]/gi,'')}.json`;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
    };
    if(focusedId!==id){focusedId=id;const title=detail.querySelector('h2');title.id='discovery-selected-title';detail.setAttribute('aria-labelledby',title.id);title.focus({preventScroll:true});}
  }
  const observer=new MutationObserver(enhanceDetail);observer.observe(detail,{childList:true,attributes:true,attributeFilter:['hidden']});enhanceDetail();
  window.addEventListener('pagehide',e=>{if(!e.persisted)observer.disconnect();});
}
