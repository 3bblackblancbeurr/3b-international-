import {useRef} from 'react';
import {WORLD_REALMS} from './world-living-data.js';
import HeritageSignalNetwork from './HeritageSignalNetwork.jsx';

// Accessible lightweight globe for mobile, battery-saving and reduced motion.
// This is an illustrated NASA globe; swiping changes the selected 3B realm.
export default function HeritageGlobeLite({selectedId='france',onSelect,zoom=1}){
 const origin=useRef(null);
 function advance(direction){
  const idx=WORLD_REALMS.findIndex(x=>x.id===selectedId);
  onSelect?.(WORLD_REALMS[(idx+(direction<0?7:1)+8)%8].id);
 }
 return <div className="th-earth3d th-earth3d-lite">
  <div className="th-earth-fallback" role="button" tabIndex={0}
   aria-label="Terre 3B illustrée : touche ou glisse pour sélectionner un royaume"
   style={{transform:'scale('+Math.max(.8,Math.min(1.34,zoom))+')'}}
   onPointerDown={event=>{
    if(event.pointerType==='mouse'&&event.button!==0)return;
    origin.current={x:event.clientX,y:event.clientY};
    try{event.currentTarget.setPointerCapture(event.pointerId);}catch{}
   }}
   onPointerUp={event=>{
    const started=origin.current;origin.current=null;
    if(!started)return;
    advance(event.clientX-started.x>26?-1:1);
   }}
   onPointerCancel={()=>{origin.current=null;}}
   onKeyDown={event=>{
    if(['Enter',' ','ArrowLeft','ArrowRight'].includes(event.key)){
     event.preventDefault();advance(event.key==='ArrowLeft'?-1:1);
    }
   }}>
   <img src="/art/earth/nasa-globe-disc-square.jpg" alt=""/>
   <HeritageSignalNetwork/>
  </div>
 </div>;
}
