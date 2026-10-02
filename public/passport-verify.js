const API='https://ttvhcezucsbbmnafrotq.supabase.co/functions/v1/passport-verify';
const PUBLIC_KEY='sb_publishable_MQUCR8oNdpEgeO2iMKnLQw_wj5XdNC4';
const card=document.getElementById('verify-card');
const title=document.getElementById('verify-title');
const message=document.getElementById('verify-message');
const data=document.getElementById('passport-data');
const note=document.getElementById('official-note');
const text=(id,value)=>{document.getElementById(id).textContent=value||'—';};

async function verify(){
 const ticket=new URLSearchParams(location.hash.slice(1)).get('ticket')||'';
 history.replaceState(null,'',location.pathname);
 if(!/^[0-9a-f]{64}$/i.test(ticket))throw new Error('Code absent, invalide ou déjà utilisé.');
 const response=await fetch(API,{
  method:'POST',
  headers:{apikey:PUBLIC_KEY,'Content-Type':'application/json'},
  body:JSON.stringify({ticket}),
  cache:'no-store',
  referrerPolicy:'no-referrer',
  signal:AbortSignal.timeout(12000)
 });
 const result=await response.json().catch(()=>({}));
 if(!response.ok||result.valid!==true){
  const error=new Error(result.error||'Ce code ne peut pas être vérifié.');
  error.status=response.status;
  throw error;
 }
 const passport=result.passport||{};
 card.dataset.status='valid';
 title.textContent='Passeport 3B valide';
 message.textContent='Ce code à usage unique a été vérifié par le serveur 3B.';
 text('holder',passport.displayName+(passport.handle?' · @'+passport.handle:''));
 text('number',passport.number);
 text('country',passport.country);
 text('issued',passport.issuedAt?new Date(passport.issuedAt).toLocaleDateString('fr-FR'):'—');
 text('version','v'+(passport.version||2));
 data.hidden=false;
 if(passport.identityVerified){
  const assurance=passport.identityAssuranceLevel==='high_assurance'?'assurance renforcée':'identité vérifiée';
  note.textContent='Identité civile vérifiée · '+assurance+(passport.title?' · '+passport.title:'');
  note.hidden=false;
 } else if(passport.publicBadgeVerified&&passport.title){
  note.textContent=passport.title+' · badge public 3B. Identité civile non vérifiée.';
  note.hidden=false;
 } else {
  note.textContent='Passeport numérique privé 3B · identité civile non vérifiée. L’acceptation externe dépend du partenaire.';
  note.hidden=false;
 }
}
verify().catch(error=>{
 card.dataset.status='invalid';
 const unavailable=error?.status>=500||error?.name==='TypeError'||error?.name==='TimeoutError'||error?.name==='AbortError';
 title.textContent=unavailable?'Vérification indisponible':'Passeport non vérifié';
 message.textContent=unavailable?'Le service ne peut pas confirmer ce passeport actuellement. Demande un nouveau code et réessaie avec une connexion Internet.':error?.message||'Le code est invalide ou expiré.';
 data.hidden=true;
 note.hidden=true;
});
