// Artistic, compact interpretations: the 3B worlds are not geographic replicas.
export const HERITAGE = {
 france:{name:'Tour Eiffel',city:'Paris',form:'Quatre piliers évasés, charpente ajourée et trois plateformes.',source:'https://www.toureiffel.paris/fr/le-monument/histoire'},
 italie:{name:'Colisée',city:'Rome',form:'Une enceinte elliptique, trois niveaux d’arcades et une couronne de pierre.',source:'https://colosseo.it/en/area/the-colosseum/'},
 estonie:{name:'Cathédrale Alexandre-Nevski',city:'Tallinn',form:'Cinq coupoles sombres, tambours percés et façades claires à arcatures.',source:'https://visittallinn.ee/eng/visitor/see-do/things-to-do/attractions-museums/307/alexander-nevsky-cathedral'},
 turquie:{name:'Tour de Galata',city:'Istanbul',form:'Une tour de pierre cylindrique, une galerie panoramique et une toiture conique.',source:'https://goturkiye.com/istanbul/blog/3-historical-towers-of-istanbul'},
 algerie:{name:'Mémorial du Martyr',city:'Alger',form:'Trois grandes palmes de béton se rejoignent au-dessus du parvis.',source:'https://dome.mit.edu/handle/1721.3/111924'},
 tunisie:{name:'Amphithéâtre d’El Jem',city:'El Jem',form:'Des arcades de pierre ocre sur trois niveaux, ouvertes sur le ciel.',source:'https://whc.unesco.org/en/list/38/'},
 maroc:{name:'Mosquée Hassan II',city:'Casablanca',form:'Un minaret carré orné, des toits verts et de longues galeries à arcades.',source:'https://fmh2.ma/en/mosque/outbuildings/minaret'},
 espagne:{name:'Sagrada Família',city:'Barcelone',form:'Une forêt de tours effilées, des contreforts et des portails sculptés.',source:'https://sagradafamilia.org/en/history-of-the-temple'},
};
export const LANDMARK_SITE={x:35,z:-35,radius:23,clearing:29};
// Arrive at the forecourt, outside the physical footprint, rather than routing
// through the monument. The same point is used by navigation and the atlas.
export const LANDMARK_APPROACH={x:35,z:-16};

export function heritageObstacles(region,center,angle){
 let local;
 if(region==='france')local=[-1,1].flatMap(x=>[-1,1].map(z=>({x:x*9.5,z:z*9.5,r:3})));
 else if(region==='algerie')local=[0,1,2].map(i=>({x:Math.cos(i*Math.PI*2/3)*12,z:-Math.sin(i*Math.PI*2/3)*12,r:3.5}));
 else if(region==='turquie')local=[{x:0,z:0,r:8.8}];
 else if(region==='estonie')local=[{x:0,z:0,width:20,depth:18}];
 else if(region==='maroc')local=[{x:0,z:-2,width:29,depth:19},{x:0,z:10,width:6.2,depth:6.2}];
 else if(region==='espagne')local=[{x:0,z:0,width:25,depth:25}];
 else local=[{x:0,z:0,width:39,depth:29.5}];
 local.push(...[-20,20].flatMap(x=>[-20,20].map(z=>({x,z,width:3.6,depth:3.6}))));
 const c=Math.cos(angle),s=Math.sin(angle);
 return local.map(p=>({...p,x:center.x+p.x*c+p.z*s,z:center.z-p.x*s+p.z*c,rotation:angle}));
}

export function civicSites(anchors){
 const result=[];
 for(const a of anchors){
  if(a.type==='atelier'&&!['hub:atelier','maroc:atelier'].includes(a.id))for(const side of [-1,1])result.push({kind:'atelier',x:a.x+side*8,z:a.z-4,width:4.6,depth:9,rotation:0,side,anchor:a});
  if(a.id.endsWith(':survey:city'))result.push({kind:'archives',x:a.x,z:a.z-11,width:14,depth:10,rotation:0,anchor:a});
 }
 return result;
}
