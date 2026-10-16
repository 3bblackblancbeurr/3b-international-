import {Button} from '../design-system/index.jsx';
import {useEffect,useRef,useState} from 'react';
import {BookHeart,Download,LockKeyhole,Mic,MicOff,Plus,ShieldCheck,Trash2,Upload,Volume2} from 'lucide-react';
import {encryptHeritage,decryptHeritage,heritageStorageKey,isEncryptedVault} from './heritage-crypto.js';
import {dayKey} from './routines.js';

function stored(key){try{const data=JSON.parse(localStorage.getItem(key)||'null');return isEncryptedVault(data)?data:null}catch{return null}}
function downloadText(name,content){
 const url=URL.createObjectURL(new Blob([content],{type:'application/json;charset=utf-8'}));
 const element=document.createElement('a');element.href=url;element.download=name;document.body.append(element);element.click();element.remove();
 window.setTimeout(()=>URL.revokeObjectURL(url),6000);
}
export default function HeritageVault({uid}){
 const key=heritageStorageKey(uid),passRef=useRef(''),audioStream=useRef(null),recorder=useRef(null),audioUrl=useRef(''),mounted=useRef(true);
 const [exists,setExists]=useState(()=>!!stored(key)),[unlocked,setUnlocked]=useState(false);
 const [phrase,setPhrase]=useState(''),[confirm,setConfirm]=useState(''),[stories,setStories]=useState([]);
 const [title,setTitle]=useState(''),[body,setBody]=useState(''),[busy,setBusy]=useState(false),[message,setMessage]=useState('');
 const [removeId,setRemoveId]=useState(''),[pendingImport,setPendingImport]=useState(null);
 const [recording,setRecording]=useState(false),[audioReady,setAudioReady]=useState('');
 useEffect(()=>{
  const onBackground=()=>{
   if(!document.hidden)return;
   passRef.current='';setUnlocked(false);setStories([]);setPhrase('');setConfirm('');setTitle('');setBody('');
   if(recorder.current?.state==='recording'){recorder.current.ondataavailable=null;recorder.current.onstop=null;recorder.current.stop();}
   audioStream.current?.getTracks().forEach(track=>track.stop());audioStream.current=null;setRecording(false);
   setAudioReady('');setMessage('Carnet verrouillé après le passage de 3B en arrière-plan.');
  };
  document.addEventListener('visibilitychange',onBackground);
  return()=>document.removeEventListener('visibilitychange',onBackground);
 },[]);
 useEffect(()=>{
  mounted.current=true;
  passRef.current='';setUnlocked(false);setStories([]);setExists(!!stored(key));setPhrase('');setConfirm('');setMessage('');
  return()=>{
   mounted.current=false;
   passRef.current='';
   if(recorder.current?.state==='recording'){recorder.current.ondataavailable=null;recorder.current.onstop=null;recorder.current.stop();}
   audioStream.current?.getTracks().forEach(track=>track.stop());
   if(audioUrl.current)URL.revokeObjectURL(audioUrl.current);
  };
 },[key]);
 async function establish(event){
  event.preventDefault();if(busy)return;
  setBusy(true);setMessage('');
  try{
   if(exists){
    const records=await decryptHeritage(stored(key),phrase);
    passRef.current=phrase;setStories(records);setUnlocked(true);
   }else{
    if(phrase!==confirm)throw Error('Les deux phrases secrètes doivent être identiques.');
    const payload=await encryptHeritage([],phrase);
    try{localStorage.setItem(key,JSON.stringify(payload))}catch{throw Error('Cet appareil ne peut pas conserver le carnet. Réessaie avec le stockage autorisé.')}
    passRef.current=phrase;setStories([]);setExists(true);setUnlocked(true);
   }
   setPhrase('');setConfirm('');
  }catch(error){setMessage(error.message||'Le carnet ne peut pas être ouvert.')}
  finally{setBusy(false)}
 }
 function lock(){
  passRef.current='';setStories([]);setUnlocked(false);setTitle('');setBody('');setRemoveId('');setAudioReady('');
  if(recorder.current?.state==='recording')recorder.current.stop();
  audioStream.current?.getTracks().forEach(t=>t.stop());
  setRecording(false);setMessage('Carnet verrouillé sur cet appareil.');
 }
 async function persist(next){
  if(!passRef.current){setMessage('Déverrouille ton carnet avant de le modifier.');return false;}
  setBusy(true);setMessage('');
  try{
   const payload=await encryptHeritage(next,passRef.current);
   try{localStorage.setItem(key,JSON.stringify(payload))}catch{throw Error('Sauvegarde impossible. Le carnet précédent est conservé.')}
   setStories(next);return true;
  }catch(error){setMessage(error.message||'Sauvegarde impossible.');return false}
  finally{setBusy(false)}
 }
 async function add(event){
  event.preventDefault();if(busy)return;
  if(title.trim().length<2||body.trim().length<4){setMessage('Ajoute un titre et quelques mots.');return}
  const next=[{id:crypto.randomUUID(),title:title.trim().slice(0,100),body:body.trim().slice(0,5000),date:new Date().toISOString()},...stories];
  if(await persist(next)){setTitle('');setBody('');setMessage('Souvenir chiffré et conservé uniquement sur cet appareil.')}
 }
 async function erase(id){
  if(removeId!==id){setRemoveId(id);return;}
  if(await persist(stories.filter(x=>x.id!==id))){setRemoveId('');setMessage('Souvenir supprimé du carnet local.')}
 }
 function backup(){
  const data=stored(key);
  if(!data){setMessage('Aucune sauvegarde chiffrée disponible.');return;}
  downloadText('3b-heritage-chiffre-'+dayKey()+'.json',JSON.stringify(data,null,2));
  setMessage('Sauvegarde chiffrée proposée au téléchargement. Conserve ta phrase secrète séparément.');
 }
 async function selectImport(event){
  const file=event.target.files?.[0];event.target.value='';
  if(!file)return;
  if(file.size>900000){setMessage('Fichier trop volumineux.');return;}
  try{
   const value=JSON.parse(await file.text());
   if(!isEncryptedVault(value))throw Error('Le fichier n’est pas une sauvegarde Héritage 3B valide.');
   setPendingImport(value);setMessage('Sauvegarde prête. Confirme son remplacement pour l’importer. La phrase secrète du fichier sera nécessaire.');
  }catch(error){setPendingImport(null);setMessage(error.message||'Fichier invalide.')}
 }
 function importBackup(){
  if(!pendingImport)return;
  try{localStorage.setItem(key,JSON.stringify(pendingImport));setExists(true);setPendingImport(null);lock();setMessage('Sauvegarde importée. Déverrouille-la avec sa phrase secrète.');}
  catch{setMessage('Import impossible : le stockage local est indisponible.')}
 }
 async function record(){
  if(recording){
   if(recorder.current?.state==='recording')recorder.current.stop();
   setRecording(false);return;
  }
  if(!navigator.mediaDevices?.getUserMedia||typeof MediaRecorder==='undefined'){setMessage('Enregistrement vocal non disponible ici.');return;}
  setMessage('');
  try{
   const stream=await navigator.mediaDevices.getUserMedia({audio:true,video:false});
   if(!mounted.current||document.hidden){stream.getTracks().forEach(track=>track.stop());return;}
   audioStream.current=stream;
   const parts=[];
   const options=['audio/webm;codecs=opus','audio/mp4'].find(type=>MediaRecorder.isTypeSupported?.(type));
   const item=new MediaRecorder(stream,options?{mimeType:options}:undefined);
   recorder.current=item;
   item.ondataavailable=e=>{if(e.data?.size)parts.push(e.data)};
   item.onstop=()=>{
    stream.getTracks().forEach(track=>track.stop());audioStream.current=null;
    if(!mounted.current)return;
    const mime=item.mimeType||'audio/webm';
    if(!parts.length){setMessage('Aucun son enregistré.');return;}
    if(audioUrl.current)URL.revokeObjectURL(audioUrl.current);
    audioUrl.current=URL.createObjectURL(new Blob(parts,{type:mime}));
    setAudioReady(mime.includes('mp4')?'m4a':'webm');
    setMessage('Ton fichier vocal est prêt. Télécharge-le sur ton appareil : il n’est pas conservé par 3B.');
   };
   item.onerror=()=>{stream.getTracks().forEach(track=>track.stop());setRecording(false);setMessage('Enregistrement interrompu.');};
   item.start();setRecording(true);setAudioReady('');
  }catch{setMessage('Microphone refusé ou non disponible. Aucun enregistrement lancé.')}
 }
 return <section className="now-feature" aria-labelledby="heritage-title">
  <p className="now-eyebrow">05 / CE QUI RESTE</p><h2 id="heritage-title">Transmets ce qui compte.</h2>
  <p className="now-intro">Un carnet personnel pour garder histoires, recettes, traditions et souvenirs. Le texte est chiffré localement avant d’être sauvegardé ; rien n’est publié.</p>
  {!unlocked?<form className="now-vault-form" onSubmit={establish}>
   <div className="now-lock-mark" aria-hidden="true"><LockKeyhole size={34}/></div>
   <h3>{exists?'Ouvrir mon carnet privé':'Créer mon carnet privé'}</h3>
   <label className="now-field">Phrase secrète (12 caractères minimum)
    <input type="password" autoComplete="off" minLength={exists?1:12} required value={phrase} onChange={e=>setPhrase(e.target.value)} placeholder="Une phrase personnelle que tu conserveras"/>
   </label>
   {!exists&&<label className="now-field">Confirmer la phrase secrète
    <input type="password" autoComplete="off" minLength={12} required value={confirm} onChange={e=>setConfirm(e.target.value)} placeholder="Répète ta phrase"/>
   </label>}
   <Button variant="neutral" className="now-primary" disabled={busy} type="submit"><ShieldCheck size={18}/>{busy?'Chiffrement…':exists?'Déverrouiller':'Créer le coffre privé'}</Button>
   <p className="now-discretion">Sans ta phrase, personne ne peut récupérer tes souvenirs. 3B ne peut pas réinitialiser ce coffre. Sur un appareil partagé, utilise ton propre compte et verrouille après consultation.</p>
  </form>:<>
   <div className="now-vault-toolbar">
    <span><BookHeart size={21}/> {stories.length} souvenir{stories.length>1?'s':''} sauvegardé{stories.length>1?'s':''}</span>
    <Button variant="neutral" type="button" className="now-quiet" onClick={lock}><LockKeyhole size={17}/> Verrouiller</Button>
   </div>
   <form className="now-help-form" onSubmit={add}>
    <label className="now-field">Un titre<input maxLength={100} minLength={2} required value={title} onChange={e=>setTitle(e.target.value)} placeholder="Le souvenir que je veux garder"/></label>
    <label className="now-field">Ton histoire<textarea rows={4} maxLength={5000} minLength={4} required value={body} onChange={e=>setBody(e.target.value)} placeholder="Écris librement ce que tu souhaites transmettre, sans obligation de le partager."/></label>
    <Button variant="neutral" className="now-primary" type="submit" disabled={busy}><Plus size={17}/> Enregistrer dans mon carnet</Button>
   </form>
   {stories.length>0&&<div className="now-stories">
    {stories.map(story=><article key={story.id} className="now-story">
     <div><small>{story.date?new Date(story.date).toLocaleDateString('fr-FR'):'Souvenir'}</small><h3>{story.title}</h3><p>{story.body}</p></div>
     <Button variant="neutral" type="button" disabled={busy} className="now-quiet" onClick={()=>erase(story.id)}><Trash2 size={16}/>{removeId===story.id?'Confirmer la suppression':'Supprimer'}</Button>
    </article>)}
   </div>}
   <div className="now-voice">
    <h3>Une voix à transmettre</h3><p>Un enregistrement local séparé du carnet chiffré : télécharge le fichier et conserve-le toi-même.</p>
    <div className="now-action-row">
     <Button variant="neutral" type="button" className={recording?'now-recording':'now-quiet'} onClick={record}>{recording?<MicOff size={18}/>:<Mic size={18}/>} {recording?'Arrêter l’enregistrement':'Enregistrer ma voix'}</Button>
     {audioReady&&<a className="now-primary" href={audioUrl.current} download={'3b-souvenir-audio-'+dayKey()+'.'+audioReady}><Volume2 size={18}/> Télécharger l’audio</a>}
    </div>
   </div>
  </>}
  <div className="now-vault-actions">
   <Button variant="neutral" type="button" className="now-quiet" onClick={backup} disabled={!exists}><Download size={18}/> Exporter le coffre chiffré</Button>
   <label className="now-file-input"><Upload size={18}/> Importer un coffre<input type="file" accept=".json,application/json" onChange={selectImport}/></label>
  </div>
  {pendingImport&&<div className="now-restore"><strong>Remplacer le carnet local ?</strong><p>Cette opération effacera le carnet actuellement enregistré sur cet appareil. Garde une copie chiffrée avant de continuer.</p><Button variant="neutral" type="button" className="now-primary" onClick={importBackup}>Je confirme le remplacement</Button><Button variant="neutral" type="button" className="now-quiet" onClick={()=>setPendingImport(null)}>Annuler</Button></div>}
  {message&&<p className="now-message" role="status">{message}</p>}
 </section>;
}
