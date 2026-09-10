import {BaseGame,COUNTRIES,shuffle} from './core.js';
export const CITY_NAMES=['Paris','Rome','Tallinn','Istanbul','Alger','Tunis','Marrakech','Barcelone'];
export const STORIES=[
 ['Les fenêtres de Paris se rallument, une rue après l’autre.','Les voisins reconnaissent les voix de leur quartier.','Le monument retrouve la mémoire de ceux qui l’ont bâti.'],
 ['Les cours de Rome accueillent à nouveau les passants.','Un artisan se souvient des couleurs de sa première mosaïque.','La place rassemble les générations autour de son monument.'],
 ['Les pavés de Tallinn résonnent sous les pas retrouvés.','Les maisons se souviennent des longues soirées d’hiver.','La tour de la ville retrouve son nom.'],
 ['À Istanbul, les ruelles renouent leurs chemins.','Un musicien se rappelle une mélodie oubliée.','La place unit les deux rives dans un même souvenir.'],
 ['Les terrasses d’Alger s’éveillent au-dessus de la mer.','Une famille retrouve le chemin de sa maison.','Le monument recueille les histoires de tout le quartier.'],
 ['Les portes de Tunis s’ouvrent sur des jardins retrouvés.','Les senteurs de la médina réveillent les souvenirs.','La place retrouve ses récits et ses couleurs.'],
 ['Les murs de Marrakech retrouvent leur lumière.','Un jardin redonne aux habitants le souvenir de la pluie.','Le monument devient le cœur vivant de la ville.'],
 ['Les quartiers de Barcelone se rejoignent sous le soleil.','Les ateliers retrouvent les couleurs des fêtes.','Le monument raconte à nouveau l’histoire des habitants.']];
const DIR=[[0,-1],[1,0],[0,1],[-1,0]];
export function edges(t){if(!t)return[];if(t.type!=='road')return[0,1,2,3];return t.shape==='straight'?[t.rot%4,(t.rot+2)%4]:[t.rot%4,(t.rot+1)%4];}
export function connectedTiles(board){const q=[24],seen=new Set(q);for(let k=0;k<q.length;k++){const i=q[k],t=board[i];if(t?.type!=='road'&&i!==24)continue;for(const d of edges(t)){const[dx,dy]=DIR[d],x=i%7+dx,y=Math.floor(i/7)+dy,j=y*7+x;if(x<0||x>=7||y<0||y>=7||seen.has(j)||!board[j]||!edges(board[j]).includes((d+2)%4))continue;seen.add(j);q.push(j);}}return[...seen];}
export class Cities extends BaseGame {
 constructor(saved,seed){super(seed);this.countryIndex=0;this.world=structuredClone(saved?.world||{});this.completed=[...(saved?.completed||[])];this.countryIndex=saved?.countryIndex||0;this.cursor={x:3,y:2};this.moveClock=0;this.selected=0;this.rot=0;this.loadCity(this.countryIndex);}
 loadCity(index){this.countryIndex=index;this.country=COUNTRIES[index];this.cityName=CITY_NAMES[index];const old=this.world[index];this.board=old?.board?.map(t=>t?{...t}:null)||Array(49).fill(null);if(!old)this.board[24]={type:'monument',rot:0,center:true};this.turn=old?.turn||0;this.hand=old?.hand||this.newHand();this.selected=0;this.rot=0;this.connected=connectedTiles(this.board);this.score=old?.score||0;this.history=[];this.message=STORIES[index][0];this.status='playing';this.assess();}
 newHand(){return[{type:'road',shape:'straight',rot:0},{type:'road',shape:'corner',rot:0},...shuffle([{type:'house',rot:0},{type:'garden',rot:0},{type:'monument',rot:0}],this.random).slice(0,2)];}
 canPlace(x,y){if(x<0||x>6||y<0||y>6||this.board[y*7+x])return false;return DIR.some(([dx,dy])=>x+dx>=0&&x+dx<7&&y+dy>=0&&y+dy<7&&this.board[(y+dy)*7+x+dx]);}
 place(x,y){if(this.status!=='playing'||!this.canPlace(x,y)){this.message='Pose une tuile sur une case vide voisine de la ville.';return;}this.history.push({board:this.board.map(t=>t?{...t}:null),hand:this.hand.map(t=>({...t})),turn:this.turn,score:this.score});if(this.history.length>30)this.history.shift();this.board[y*7+x]={...this.hand[this.selected],rot:this.rot};this.turn++;this.hand=this.newHand();this.selected=0;this.rot=0;this.assess();this.stash();}
 click(x,y){const s=76,ox=(620-s*7)/2,oy=42;this.place(Math.floor((x-ox)/s),Math.floor((y-oy)/s));}
 select(i){if(this.hand[i]){this.selected=i;this.rot=0;}}
 action(){this.rot=(this.rot+1)%4;this.message='Tuile tournée à '+this.rot*90+'°.';}
 undo(){const old=this.history.pop();if(!old)return;Object.assign(this,old);this.selected=0;this.rot=0;this.assess();this.stash();}
 assess(){this.connected=connectedTiles(this.board);const houses=this.connected.filter(i=>this.board[i]?.type==='house').length,gardens=this.connected.filter(i=>this.board[i]?.type==='garden').length,monuments=this.connected.filter(i=>i!==24&&this.board[i]?.type==='monument').length;this.houses=houses;this.gardens=gardens;this.monuments=monuments;this.score=houses*70+gardens*45+monuments*120+this.connected.length*10;const level=houses>=4&&gardens>=2&&monuments>=1?2:houses>=2?1:0;this.message=STORIES[this.countryIndex][level];this.restored=level===2;if(this.restored&&!this.completed.includes(this.countryIndex))this.completed.push(this.countryIndex);if(this.board.every(Boolean)&&!this.restored)this.message='La ville est pleine. Retire la dernière pose avec Annuler, ou recommence cette ville.';}
 stash(){this.world[this.countryIndex]={board:this.board.map(t=>t?{...t}:null),hand:this.hand.map(t=>({...t})),turn:this.turn,score:this.score};}
 changeCountry(i){if(i<0||i>7)return;this.stash();this.loadCity(i);}
 restartCity(){this.world[this.countryIndex]=null;this.loadCity(this.countryIndex);}
 snapshot(){this.stash();return{world:structuredClone(this.world),countryIndex:this.countryIndex,completed:[...this.completed]};}
 confirm(){this.place(this.cursor.x,this.cursor.y);}
 update(dt,input={}){this.tick(dt);this.moveClock-=dt;if(this.moveClock<=0&&(input.x||input.y)){const dx=Math.abs(input.x)>=Math.abs(input.y)?Math.sign(input.x):0,dy=dx?0:Math.sign(input.y);this.cursor={x:Math.max(0,Math.min(6,this.cursor.x+dx)),y:Math.max(0,Math.min(6,this.cursor.y+dy))};this.moveClock=.16;}}
 hud(){return [['Pays restaurés',`${this.completed.length} / 8`],['Maisons',`${this.houses} / 4`],['Jardins',`${this.gardens} / 2`],['Monument',`${this.monuments} / 1`]];}
}
