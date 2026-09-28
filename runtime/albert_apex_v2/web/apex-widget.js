(()=>{
 const API='http://127.0.0.1:8766';
 const id='albert-apex-v2-root';
 if(document.getElementById(id))return;
 const root=document.createElement('div');root.id=id;root.innerHTML=`
  <button class="aax-orb" type="button" aria-label="Ouvrir ALBERT APEX OS"><span></span><b>APEX</b></button>
  <section class="aax-panel" aria-label="ALBERT APEX OS V2" hidden>
   <header><div><small>ALBERT APEX / LOCAL CORE</small><strong>OS V2</strong></div><button class="aax-close" type="button">×</button></header>
   <div class="aax-status"><i></i><span>Connexion au Core…</span></div>
   <div class="aax-grid">
    <article><small>MODE</small><strong data-k="mode">—</strong></article>
    <article><small>PROFIL</small><strong data-k="profile">—</strong></article>
    <article><small>GPU</small><strong data-k="gpu">—</strong></article>
    <article><small>MODÈLES</small><strong data-k="models">—</strong></article>
    <article><small>READINESS</small><strong data-k="readiness">—</strong></article>
    <article><small>ROUTINES</small><strong data-k="routines">—</strong></article>
   </div>
   <div class="aax-switches" data-group="mode">
    <button>AUTO</button><button>LOCAL</button><button>HYBRID</button><button>INTERNET</button>
   </div>
   <div class="aax-switches" data-group="profile">
    <button>ECO</button><button>NORMAL</button><button>APEX</button>
   </div>
   <div class="aax-section">
    <div><small>TÂCHES</small><strong data-k="tasks">—</strong></div>
    <div><small>PREUVES</small><strong data-k="verified">—</strong></div>
   </div>
   <details><summary>Constitution APEX</summary><ol class="aax-constitution"></ol></details>
   <details><summary>Modèles locaux</summary><div class="aax-model-list">Aucun modèle détecté.</div></details>
   <footer><button class="aax-stop" type="button">STOP ALBERT</button><span>Fail-closed · preuves avant succès</span></footer>
  </section>`;
 document.body.appendChild(root);
 const panel=root.querySelector('.aax-panel'),orb=root.querySelector('.aax-orb'),close=root.querySelector('.aax-close');
 const status=root.querySelector('.aax-status'),stop=root.querySelector('.aax-stop');
 let last=null,timer=0;
 const json=async(path,body)=>{
  const response=await fetch(API+path,{method:body?'POST':'GET',headers:body?{'Content-Type':'application/json'}:{},body:body?JSON.stringify(body):undefined,cache:'no-store'});
  const data=await response.json().catch(()=>({}));
  if(!response.ok)throw new Error(data.error||('HTTP '+response.status));
  return data;
 };
 function set(key,value){const node=root.querySelector('[data-k="'+key+'"]');if(node)node.textContent=value;}
 function active(group,value){
  root.querySelectorAll('[data-group="'+group+'"] button').forEach(button=>button.classList.toggle('active',button.textContent===value));
 }
 function render(data){
  const s=data?.status||data;last=s;
  status.className='aax-status '+(s.kill_switch?'bad':'good');
  status.querySelector('span').textContent=s.kill_switch?'STOP ALBERT ACTIF':'CORE LOCAL ARMÉ';
  set('mode',s.mode||'—');set('profile',s.resource?.profile||'—');
  set('gpu',s.gpu?.name?s.gpu.name.replace(/^NVIDIA\s*/i,'').slice(0,24):'—');
  set('models',Array.isArray(s.models)?String(s.models.length):'0');
  set('readiness',s.readiness?String(s.readiness.passed||0)+'/'+String(s.readiness.total||0):'—');
  set('routines',Array.isArray(s.routines)?String(s.routines.length):'0');
  set('tasks',String(s.tasks?.running||0)+' actives');
  set('verified',String(s.tasks?.verified||0)+' vérifiées');
  active('mode',s.mode);active('profile',s.resource?.profile);
  const rules=root.querySelector('.aax-constitution');rules.innerHTML='';
  (s.constitution?.principles||[]).forEach(rule=>{const li=document.createElement('li');li.textContent=rule;rules.appendChild(li);});
  const models=root.querySelector('.aax-model-list');models.textContent=(s.models||[]).join(' · ')||'Aucun modèle local détecté.';
  stop.textContent=s.kill_switch?'RÉARMER LE CORE':'STOP ALBERT';
  stop.classList.toggle('resume',Boolean(s.kill_switch));
 }
 async function refresh(){
  try{render(await json('/status'));}catch{
   status.className='aax-status bad';status.querySelector('span').textContent='CORE LOCAL HORS LIGNE';
   set('mode','—');set('profile','—');set('gpu','—');set('models','—');set('readiness','—');set('routines','—');
  }
 }
 orb.addEventListener('click',()=>{panel.hidden=false;orb.hidden=true;refresh();});
 close.addEventListener('click',()=>{panel.hidden=true;orb.hidden=false;});
 root.querySelectorAll('[data-group="mode"] button').forEach(button=>button.addEventListener('click',async()=>{try{await json('/settings/mode',{mode:button.textContent});await refresh();}catch{}}));
 root.querySelectorAll('[data-group="profile"] button').forEach(button=>button.addEventListener('click',async()=>{try{await json('/settings/resource',{resource_profile:button.textContent});await refresh();}catch{}}));
 stop.addEventListener('click',async()=>{try{await json(last?.kill_switch?'/core/resume':'/core/stop',{});await refresh();}catch{}});
 timer=window.setInterval(()=>{if(!panel.hidden)refresh();},5000);
 window.addEventListener('beforeunload',()=>window.clearInterval(timer),{once:true});
})();