import {createContext,useContext,useEffect,useState} from 'react';
import {ALBERT_MODULES} from './albert-model.js';
const Context=createContext(null);
function load(){
 try{
  const raw=JSON.parse(localStorage.getItem('3b-albert-layout')||'{}');
  return {order:[...new Set([...(Array.isArray(raw.order)?raw.order:[]).filter(x=>ALBERT_MODULES.includes(x)),...ALBERT_MODULES])],wide:raw.wide&&typeof raw.wide==='object'?raw.wide:{}};
 }catch{return {order:ALBERT_MODULES,wide:{}};}
}
export function AlbertModules({children}){
 const[layout,setLayout]=useState(load),[drag,setDrag]=useState(null),[last,setLast]=useState(null);
 useEffect(()=>{try{localStorage.setItem('3b-albert-layout',JSON.stringify(layout));}catch{}},[layout]);
 function update(fn){setLast(layout);setLayout(fn);}
 function move(id,offset){
  const i=layout.order.indexOf(id),j=i+offset;if(i<0||j<0||j>=layout.order.length)return;
  update(current=>{const order=[...current.order];[order[i],order[j]]=[order[j],order[i]];return {...current,order};});
 }
 return <Context.Provider value={{layout,drag,setDrag,update,move}}><div className="albert-module-heading"><span>VOTRE COCKPIT · Modules réorganisables</span><button disabled={!last} onClick={()=>{setLayout(last);setLast(null);}}>Annuler la disposition</button></div><div className="albert-module-grid">{children}</div></Context.Provider>;
}
export function AlbertModule({id,label,children}){
 const{layout,drag,setDrag,update,move}=useContext(Context);
 return <div className={'albert-module-slot'+(layout.wide[id]?' wide':'')} style={{order:layout.order.indexOf(id)}}
  onDragOver={e=>{if(drag)e.preventDefault();}}
  onDrop={e=>{e.preventDefault();if(drag&&drag!==id)update(current=>{const order=current.order.filter(x=>x!==drag);order.splice(order.indexOf(id),0,drag);return {...current,order};});setDrag(null);}}>
  <div className="albert-module-toolbar" draggable onDragStart={e=>{e.dataTransfer.setData('text/plain',id);setDrag(id);}} onDragEnd={()=>setDrag(null)}>
   <span>⠿ {label}</span><details><summary aria-label={'Organiser '+label}>···</summary><div><button onClick={()=>move(id,-1)}>Déplacer avant</button><button onClick={()=>move(id,1)}>Déplacer après</button><button onClick={()=>update(current=>({...current,wide:{...current.wide,[id]:!current.wide[id]}}))}>{layout.wide[id]?'Demi-largeur':'Pleine largeur'}</button></div></details>
  </div>{children}
 </div>;
}
