import {createContext,useContext,useEffect,useRef,useState} from 'react';
import {authClient} from '../loyalty/client.js';
import {albertRequest} from './integrations-client.js';
import {initialSpaces,normalizeSpaces,applySpaceActions} from './albert-spaces-model.js';
const Context=createContext(null);
export const useAlbertSpaces=()=>useContext(Context);
export function AlbertSpacesProvider({children}){
 const[state,setState]=useState(initialSpaces),[owner,setOwner]=useState(''),[revision,setRevision]=useState(0),[status,setStatus]=useState('Sauvegarde locale'),[syncing,setSyncing]=useState(false),[undo,setUndo]=useState([]),[redo,setRedo]=useState([]);
 const current=useRef(state),ownerRef=useRef(''),syncLock=useRef(false);current.current=state;
 useEffect(()=>{
  let alive=true,authChanged=false;
  const load=session=>{
   const id=session?.user?.id||'';if(!alive||id===ownerRef.current)return;
   ownerRef.current=id;setOwner(id);setUndo([]);setRedo([]);setRevision(0);setStatus('Sauvegarde locale');
   try{const saved=JSON.parse(localStorage.getItem('3b-albert-spaces:'+id)||'null');setState(saved?normalizeSpaces(saved.state):initialSpaces());setRevision(Number.isSafeInteger(saved?.revision)?saved.revision:0);}catch{setState(initialSpaces());setStatus('Sauvegarde locale indisponible');}
  };
  authClient.auth.getSession().then(({data})=>{if(!authChanged)load(data.session);}).catch(()=>{if(alive)setStatus('Session indisponible');});
  const{data:{subscription}}=authClient.auth.onAuthStateChange((_event,session)=>{authChanged=true;load(session);});
  return()=>{alive=false;subscription.unsubscribe();};
 },[]);
 useEffect(()=>{if(owner)try{localStorage.setItem('3b-albert-spaces:'+owner,JSON.stringify({state,revision}));}catch{setStatus('Stockage local plein ou indisponible');}},[owner,state,revision]);
 function edit(fn,label='Espace modifié',checkpoint=true){
  if(checkpoint){setUndo(h=>[...h.slice(-19),current.current]);setRedo([]);}
  setState(s=>{const n=normalizeSpaces(typeof fn==='function'?fn(s):fn);n.journal=[...n.journal,{text:label,at:new Date().toISOString()}].slice(-40);current.current=n;return n;});
 }
 function back(){if(!undo.length)return;setRedo(h=>[...h,current.current]);setState(undo.at(-1));setUndo(h=>h.slice(0,-1));}
 function forward(){if(!redo.length)return;setUndo(h=>[...h,current.current]);setState(redo.at(-1));setRedo(h=>h.slice(0,-1));}
 async function sync(mode){
  if(!owner||syncLock.current)return;syncLock.current=true;setSyncing(true);const uid=owner,local=current.current;
  try{
   if(mode==='push'){const result=await albertRequest({action:'workspace_save',revision,payload:local});if(ownerRef.current!==uid)return;setRevision(result.revision);setStatus('Sauvegardé en ligne · révision '+result.revision);}
   else {const result=await albertRequest({action:'workspace_load'});if(ownerRef.current!==uid)return;if(!result.workspace){setStatus('Aucun espace en ligne. Publiez votre espace local.');return;}edit(normalizeSpaces(result.workspace.payload),'Version en ligne chargée');setRevision(Number(result.workspace.revision));setStatus('Version en ligne chargée · annulation disponible');}
  }catch(e){if(ownerRef.current===uid)setStatus(e.message);}
  finally{syncLock.current=false;setSyncing(false);}
 }
 const apply=actions=>{const next=applySpaceActions(current.current,actions);edit(next,'Composition par Albert');};
 const remember=(user,assistant)=>edit(s=>({...s,messages:[...s.messages,{role:'user',text:user},{role:'assistant',text:assistant}].slice(-12)}),'Conversation mémorisée',false);
 function forget(){setUndo([]);setRedo([]);edit(s=>({...s,messages:[]}),'Mémoire locale effacée — sauvegardez en ligne pour y appliquer cet effacement',false);}
 return <Context.Provider value={{state,edit,apply,remember,forget,back,forward,canUndo:!!undo.length,canRedo:!!redo.length,owner,status,syncing,sync}}>{children}</Context.Provider>;
}
