import {COUNTRIES} from './countries.js';

export function worldScene(kind,zone,target){
 const name=COUNTRIES[zone]?.name||(zone==='france'?'France':'Sanctuaire');
 const copy={arrival:[name,'Un nouveau lieu, des habitants à rencontrer et des liens à reconstruire.'],trial:['Les deux plateaux','Le lien avec ton compagnon ouvre les Archives.'],restored:['La Justice revient','Le fragment est retrouvé. Rapporte-le au Sanctuaire.'],returned:['Un fragment retrouve sa place','Les huit portes restent ouvertes. Ton aventure continue.'],battle:['Face à l’Oubli','Observe son attaque, esquive, puis profite de son ouverture.'],victory:['Le quartier respire','Ta victoire permet de poursuivre la reconstruction.'],defeat:['Reprendre souffle','Ton compagnon te ramène à l’abri. Ta progression est conservée.'],garden:['Un lieu reprend vie','Les habitants retrouvent un jardin restauré.']};
 const [title,line]=copy[kind]||copy.arrival;return {type:kind,title,line,target,duration:kind==='arrival'?5:3.5};
}

export function createCinematicDirector(){
 let active=null,queue=[];
 const start=()=>{if(!active&&queue.length)active={...queue.shift(),elapsed:0,paused:false,reading:false};};
 return {
  get current(){return active;},
  enqueue(scene){if(!scene||active?.type===scene.type||queue.some(s=>s.type===scene.type))return false;queue.push(scene);queue=queue.slice(0,4);start();return true;},
  tick(dt){if(active&&!active.paused&&!active.reading){active.elapsed+=Math.max(0,Math.min(.1,dt));if(active.elapsed>=active.duration){active=null;start();}}},
  skip(){active=null;start();},pause(){if(active)active.paused=!active.paused;},read(){if(active)active.reading=!active.reading;},clear(){active=null;queue=[];}
 };
}
