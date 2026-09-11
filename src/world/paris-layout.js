// Paris reference district. Dimensions are world units; locations use country coordinates.
export const PARIS_LANES=[
 [[0,17],[0,5],[0,-7],[-3,-19],[-15,-28],[-23,-38],[-18,-53]],
 [[0,5],[-20,2],[-38,2],[-45,-14],[-56,-24],[-54,-47],[-28,-51],[-18,-53],[4,-48],[21,-39],[23,-22],[16,-12],[0,-7]],
 [[-56,-24],[-40,-26],[-25,-28],[-15,-28],[-3,-19],[16,-12],[23,-22]],
 [[-38,2],[-40,-15],[-40,-26]],
 [[-38,2],[-33,20],[-26,25],[-10,25],[0,17]],
];
export const PARIS_BOULEVARD=[[0,5],[12,-2],[18,-14],[23,-22],[25,-33],[49,-36]];
export const PARIS_BUILDINGS=[
 {id:'cafe',model:'Cafe',x:-11,z:-8,rotation:.65,width:20,depth:14,name:'Café des Liens'},
 {id:'maison',model:'Maison',x:-27,z:-14,rotation:.45,width:18,depth:14,name:'Maison des voyageurs'},
 {id:'galerie',model:'Galerie',x:9,z:-27,rotation:.6,width:23,depth:13,name:'Galerie des mémoires'},
 {id:'residence',model:'Residence',x:29,z:-5,rotation:-2.45,width:18,depth:14,name:'Résidence du Cercle'},
 {id:'angle',model:'Maison',x:37,z:-22,rotation:-2.45,width:18,depth:14,name:'Les Terrasses'},
 {id:'atelier',model:'Atelier',x:-18,z:17,rotation:0,width:20,depth:17,name:'Atelier des Verrières',interior:true},
 {id:'refuge',model:'Refuge',x:27,z:25,rotation:0,width:20,depth:17,name:'Refuge des Liens',interior:true},
 {id:'archives',model:'Galerie',x:-42,z:-36,rotation:.05,width:23,depth:13,name:'Les Archives'},
];
export const PARIS_DECOR=[
 {model:'Fountain',x:10,z:1,rotation:0,r:3.6},
 {model:'Kiosk',x:-30,z:4,rotation:.3,r:2.2},
 {model:'Pergola',x:17,z:13,rotation:.2,r:0},
];
export function parisSites(region,transform){return region==='france'?PARIS_BUILDINGS.map(b=>({...b,...transform(b.x,b.z),rotation:b.rotation+.24})):[];}
export function parisWalls(site){
 const {width:w,depth:d,rotation:a}=site,c=Math.cos(a),s=Math.sin(a);
 const pieces=site.interior?[
  {x:0,z:-d/2,width:w,depth:.55},{x:-w/2,z:0,width:.55,depth:d},{x:w/2,z:0,width:.55,depth:d},
  {x:-(w+4.4)/4,z:d/2,width:(w-4.4)/2,depth:.55},{x:(w+4.4)/4,z:d/2,width:(w-4.4)/2,depth:.55},
  {x:0,z:-4,width:4.4,depth:1.8},
 ]:[{x:0,z:0,width:w,depth:d}];
 return pieces.map(p=>({...p,x:site.x+p.x*c+p.z*s,z:site.z-p.x*s+p.z*c,rotation:a}));
}
export function parisInteriorAt(position,sites){return sites.find(s=>{if(!s.interior)return false;const c=Math.cos(s.rotation),n=Math.sin(s.rotation),x=(position.x-s.x)*c-(position.z-s.z)*n,z=(position.x-s.x)*n+(position.z-s.z)*c;return Math.abs(x)<s.width/2-.4&&Math.abs(z)<s.depth/2-.4;})||null;}
