// Raw coordinates live only in this tracker. Only accepted aggregate metres are saved.
export function metresBetween(a,b){const rad=Math.PI/180,lat=(b.latitude-a.latitude)*rad,lon=(b.longitude-a.longitude)*rad;const h=Math.sin(lat/2)**2+Math.cos(a.latitude*rad)*Math.cos(b.latitude*rad)*Math.sin(lon/2)**2;return 6371000*2*Math.atan2(Math.sqrt(h),Math.sqrt(Math.max(0,1-h)));}
export function createWalkTracker(){
 let anchor=null,last=null;
 return {reset(){anchor=null;last=null;},accept(position){
  const p={latitude:position?.coords?.latitude,longitude:position?.coords?.longitude,accuracy:position?.coords?.accuracy,timestamp:position?.timestamp};
  if(!Object.values(p).every(Number.isFinite)||Math.abs(p.latitude)>90||Math.abs(p.longitude)>180||p.accuracy<0||p.accuracy>35)return{metres:0,status:'Signal imprécis · attends un endroit dégagé.'};
  if(last&&p.timestamp<=last.timestamp)return{metres:0,status:'Recherche du signal…'};
  if(!last){anchor=last=p;return{metres:0,status:'GPS prêt · marche à ton rythme.'};}
  const elapsed=(p.timestamp-last.timestamp)/1000,step=metresBetween(last,p);
  if(elapsed>45||step/elapsed>3.6||(Number.isFinite(position.coords.speed)&&position.coords.speed>3.6)){anchor=last=p;return{metres:0,status:'Distance en pause · reprends à pied.'};}
  last=p;const total=metresBetween(anchor,p),threshold=Math.max(7,(anchor.accuracy+p.accuracy)*.6);
  if(total<threshold)return{metres:0,status:'GPS actif · tes pas révèlent des échos.'};
  anchor=p;return{metres:Math.min(total,elapsed*3.6+threshold),status:'GPS actif · tes pas révèlent des échos.'};
 }};
}
