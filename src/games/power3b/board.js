import {NATIONS} from './constants.js';
const TAU=Math.PI*2,CX=800,CY=500;
const polar=(r,a)=>({x:Math.round(CX+Math.cos(a)*r),y:Math.round(CY+Math.sin(a)*r)});
const mod=n=>(n+8)%8;
const list=[];
for(let i=0;i<8;i++){
 const a=-Math.PI/2+i*TAU/8;
 const h=polar(410,a),f=polar(285,a),s=polar(155,a+TAU/16);
 list.push({id:'hq'+i,name:'QG '+NATIONS[i].name,type:'coast',hq:i,x:h.x,y:h.y});
 list.push({id:'front'+i,name:'Front '+NATIONS[i].code,type:'land',hq:null,x:f.x,y:f.y});
 list.push({id:'sea'+i,name:'Détroit '+(i+1),type:'sea',hq:null,x:s.x,y:s.y});
}
export const SECTORS=list;
export const SECTOR_BY_ID=new Map(SECTORS.map(s=>[s.id,s]));
export function neighbors(id){
 if(id.startsWith('hq')){const i=+id.slice(2);return['front'+i,'front'+mod(i-1),'sea'+i,'sea'+mod(i-1)];}
 if(id.startsWith('front')){const i=+id.slice(5);return['hq'+i,'hq'+mod(i+1),'front'+mod(i-1),'front'+mod(i+1),'sea'+i,'sea'+mod(i-1)];}
 if(id.startsWith('sea')){const i=+id.slice(3);return['sea'+mod(i-1),'sea'+mod(i+1),'front'+i,'front'+mod(i+1),'hq'+i,'hq'+mod(i+1)];}
 return[];
}
export function pathDistance(from,to,domain,max=9){
 if(from===to)return 0;const q=[[from,0]],seen=new Set([from]);
 while(q.length){const[cur,d]=q.shift();if(d>=max)continue;for(const n of neighbors(cur)){if(seen.has(n))continue;const s=SECTOR_BY_ID.get(n);if(domain==='land'&&!['land','coast'].includes(s.type))continue;if(domain==='sea'&&!['sea','coast'].includes(s.type))continue;if(domain==='air'&&s.type==='sea')continue;if(n===to)return d+1;seen.add(n);q.push([n,d+1]);}}
 return Infinity;
}
