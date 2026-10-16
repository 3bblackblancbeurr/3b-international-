import {useEffect,useRef,useState} from 'react';
import {ArrowDownToLine,BookHeart,KeyRound,LockKeyhole,Plus,ShieldCheck,Trash2,Upload,UnlockKeyhole,X} from 'lucide-react';
import {HERITAGE_VAULT_KEY,createHeritageVault,openHeritageVault,sealHeritage,validateHeritageEntries} from './heritage-vault.js';

function storedEnvelope(){
 try{return window.localStorage.getItem(HERITAGE_VAULT_KEY);}catch{return null;}
}
function downloadEncrypted(text){
 const url=URL.createObjectURL(new Blob([text],{type:'application/json;charset=utf-8'}));
 const a=document.createElement('a');a.href=url;a.download='3B-Heritage-coffre-chiffre.json';a.click();
 window.setTimeout(()=>URL.revokeObjectURL(url),1200);
}
export default function HeritagePanel(){
 const [locked,setLocked]=useState(true);
 const [exists,setExists]=useState(()=>Boolean(storedEnvelope()));
 const [password,setPassword]=useState('');
 const [confirmation,setConfirmation]=useState('');
 const [entries,setEntries]=useState([]);
 const [title,setTitle]=useState('');
 const [story,setStory]=useState('');
 const [busy,setBusy]=useState(false);
 const [notice,setNotice]=useState('');
 const [error,setError]=useState('');
 const [deleteConfirm,setDeleteConfirm]=useState('');
 const keyRef=useRef(null),saltRef=useRef(''),fileRef=useRef(null);
 useEffect(()=>()=>{keyRef.current=null;saltRef.current='';},[]);
 function lockNow(){keyRef.current=null;saltRef.current='';setEntries([]);setTitle('');setStory('');setPassword('');setConfirmation('');setLocked(true);setNotice('Ton coffre est verrouillé.');}
 async function enter(event){
  event.preventDefault();if(busy)return;setError('');setNotice('');
  if(!exists&&(password.length<12||password!==confirmation)){
   setError(password.length<12?'Choisis une phrase secrète de 12 caractères minimum.':'Les phrases secrètes ne correspondent pas.');return;
  }
  setBusy(true);
  try{
   if(exists){
    const raw=storedEnvelope();
    if(!raw)throw Error('Sauvegarde introuvable sur cet appareil.');
    const opened=await openHeritageVault(raw,password);
    keyRef.current=opened.key;saltRef.current=opened.envelope.salt;setEntries(opened.entries);
   }else{
    const created=await createHeritageVault(password,[]);
    localStorage.setItem(HERITAGE_VAULT_KEY,JSON.stringify(created.envelope));
    keyRef.current=created.key;saltRef.current=created.envelope.salt;setEntries([]);setExists(true);
   }
   setLocked(false);setPassword('');setConfirmation('');setNotice('Ton coffre privé est ouvert sur cet appareil.');
  }catch(e){setError(e?.message||'Ouverture impossible, sans suppression des données.');}
  finally{setBusy(false);}
 }
 async function addEntry(event){
  event.preventDefault();if(busy||locked)return;
  setError('');setNotice('');
  const t=title.trim(),s=story.trim();
  if(!t||!s){setError('Ajoute un titre et un souvenir avant de sauvegarder.');return;}
  setBusy(true);
  try{
   const next=validateHeritageEntries([{id:crypto.randomUUID(),title:t,story:s,created:new Date().toISOString().slice(0,10)},...entries]);
   const envelope=await sealHeritage(next,keyRef.current,saltRef.current);
   localStorage.setItem(HERITAGE_VAULT_KEY,JSON.stringify(envelope));
   setEntries(next);setTitle('');setStory('');setNotice('Souvenir chiffré et enregistré sur cet appareil.');
  }catch(e){setError(e?.message||'Sauvegarde locale impossible. Aucun souvenir effacé.');}
  finally{setBusy(false);}
 }
 async function removeEntry(id){
  if(busy||locked||!window.confirm('Supprimer définitivement ce souvenir du coffre local ?'))return;
  setBusy(true);setError('');
  try{
   const next=entries.filter(e=>e.id!==id);
   const envelope=await sealHeritage(next,keyRef.current,saltRef.current);
   localStorage.setItem(HERITAGE_VAULT_KEY,JSON.stringify(envelope));setEntries(next);setNotice('Souvenir supprimé du coffre local.');
  }catch(e){setError(e?.message||'Suppression impossible.');}
  finally{setBusy(false);}
 }
 function exportVault(){
  try{const raw=storedEnvelope();if(!raw)throw Error('Coffre introuvable.');downloadEncrypted(raw);setNotice('Copie chiffrée exportée. Conserve ta phrase secrète séparément.');}
  catch(e){setError(e?.message||'Export impossible.');}
 }
 async function importVault(event){
  const file=event.target.files?.[0];event.target.value='';
  if(!file)return;
  if(busy)return;
  if(file.size>200000){setError('Sauvegarde trop volumineuse.');return;}
  if(!password){setError('Indique d’abord la phrase secrète du fichier à importer.');return;}
  if(exists&&!window.confirm('L’import remplacera le coffre actuel sur cet appareil. As-tu conservé une sauvegarde ?'))return;
  setBusy(true);setError('');setNotice('');
  try{
   const raw=await file.text();
   const opened=await openHeritageVault(raw,password);
   localStorage.setItem(HERITAGE_VAULT_KEY,JSON.stringify(opened.envelope));
   keyRef.current=opened.key;saltRef.current=opened.envelope.salt;setEntries(opened.entries);setLocked(false);setExists(true);setPassword('');setConfirmation('');setNotice('Sauvegarde chiffrée importée, coffre déverrouillé.');
  }catch(e){setError(e?.message||'Import impossible. Coffre existant inchangé.');}
  finally{setBusy(false);}
 }
 function eraseAll(){
  if(deleteConfirm!=='EFFACER'||busy)return;
  try{localStorage.removeItem(HERITAGE_VAULT_KEY);lockNow();setExists(false);setDeleteConfirm('');setNotice('Coffre local effacé de cet appareil.');}
  catch{setError('Impossible d’effacer le coffre sur cet appareil.');}
 }
 return <section className="now-pane now-heritage" aria-labelledby="now-heritage-title">
  <p className="now-overline"><BookHeart size={16}/> MÉMOIRES · TRANSMISSION · VIE PRIVÉE</p>
  <h2 id="now-heritage-title">Ce qui mérite de rester.</h2>
  <p className="now-lead">Une histoire de famille, un souvenir, une recette, une tradition. Ici, tu peux les préserver dans un coffre chiffré qui reste sur ton appareil.</p>
  <div className="now-privacy-line"><ShieldCheck size={18}/><span>Chiffrement local AES-256-GCM · aucune synchronisation 3B · aucune publication automatique</span></div>
  {locked?<div className="now-heritage-lock">
   <LockKeyhole className="now-lock-art" size={54} strokeWidth={1.1}/>
   <form className="now-stack" onSubmit={enter}>
    <h3>{exists?'Ouvrir mon coffre':'Créer mon coffre privé'}</h3>
    <label>Phrase secrète
     <input type="password" autoComplete={exists?'current-password':'new-password'} value={password} onChange={e=>setPassword(e.target.value)} minLength={exists?1:12} maxLength={200} required/>
    </label>
    {!exists&&<label>Confirmer la phrase secrète
     <input type="password" autoComplete="new-password" value={confirmation} onChange={e=>setConfirmation(e.target.value)} minLength={12} maxLength={200} required/>
    </label>}
    <button className="now-cta" disabled={busy} type="submit">{busy?'Chiffrement en cours…':exists?'Déverrouiller mon coffre':'Créer mon coffre chiffré'} <UnlockKeyhole size={18}/></button>
   </form>
   <div className="now-backup">
    <button type="button" className="now-text-action" disabled={busy} onClick={()=>fileRef.current?.click()}><Upload size={16}/> Importer une sauvegarde chiffrée</button>
    <input ref={fileRef} type="file" accept=".json,application/json" hidden aria-label="Importer un coffre Héritage chiffré" onChange={importVault}/>
   </div>
  </div>:<div className="now-heritage-open">
   <div className="now-heritage-top"><span><UnlockKeyhole size={18}/> Coffre déverrouillé · {entries.length} souvenir{entries.length>1?'s':''}</span><button type="button" className="now-text-action" onClick={lockNow}><LockKeyhole size={16}/> Verrouiller</button></div>
   <form onSubmit={addEntry} className="now-stack">
    <label>Titre du souvenir<input maxLength={100} value={title} onChange={e=>setTitle(e.target.value)} placeholder="La recette de ma grand-mère…" required/></label>
    <label>Mon histoire<textarea rows={5} maxLength={3000} value={story} onChange={e=>setStory(e.target.value)} placeholder="Écris avec tes mots. Rien n’est partagé." required/></label>
    <button type="submit" className="now-cta" disabled={busy||entries.length>=40}><Plus size={18}/> {busy?'Sauvegarde…':'Chiffrer et conserver ce souvenir'}</button>
   </form>
   {entries.length>0&&<div className="now-heritage-list" aria-label="Souvenirs chiffrés ouverts">{entries.map(e=><article key={e.id}><div><small>{e.created}</small><h3>{e.title}</h3><p>{e.story}</p></div><button type="button" aria-label={'Supprimer '+e.title} onClick={()=>removeEntry(e.id)} disabled={busy}><Trash2 size={17}/></button></article>)}</div>}
  </div>}
  {error&&<p className="now-error" role="alert">{error}</p>}
  {notice&&<p className="now-notice" role="status">{notice}</p>}
  {exists&&<div className="now-heritage-tools">
   <button type="button" className="now-text-action" onClick={exportVault}><ArrowDownToLine size={17}/> Télécharger la sauvegarde chiffrée</button>
   <details><summary>Effacer définitivement ce coffre</summary>
    <label>Écris EFFACER pour confirmer<input value={deleteConfirm} onChange={e=>setDeleteConfirm(e.target.value)} placeholder="EFFACER" maxLength={7}/></label>
    <button type="button" disabled={deleteConfirm!=='EFFACER'||busy} onClick={eraseAll}><X size={16}/> Effacer le coffre local</button>
   </details>
  </div>}
  <p className="now-disclaimer">Important : si tu perds la phrase secrète ou ton appareil sans sauvegarde, 3B ne peut pas récupérer les souvenirs. Le contenu est lisible en mémoire uniquement tant que le coffre est ouvert ; un appareil compromis peut exposer les données affichées. Ne conserve pas ici des mots de passe ou documents d’identité.</p>
 </section>;
}
