import {CARDS,COUNTRIES,cardById,cardSlot} from '../world/catalog.js';

export const STARTERS=COUNTRIES.map(c=>CARDS.find(x=>x.country===c.id&&x.category==='Personnage classique'&&x.rarity==='Commun').id);
export const LOAN_TOOLS=['terrain','ambiance','energy','support','trap','fragment','pierre'].map(slot=>CARDS.find(c=>cardSlot(c)===slot)?.id).filter(Boolean);
export const ROLES={assaillant:{name:'Assaut',hp:102,hit:23,power:'Percée',description:'38 dégâts, ignore la moitié du bouclier.'},protecteur:{name:'Rempart',hp:124,hit:18,power:'Bastion',description:'26 dégâts et 20 points de bouclier.'},soigneur:{name:'Soin',hp:108,hit:18,power:'Renouveau',description:'24 dégâts et 25 points de soin.'},éclaireur:{name:'Éclaireur',hp:100,hit:21,power:'Embuscade',description:'32 dégâts et 10 de plus contre une carte affaiblie.'},mystique:{name:'Résonance',hp:104,hit:19,power:'Onde',description:'30 dégâts à la carte active et 9 aux réserves.'}};
const check=(ok,text)=>{if(!ok)throw Error(text);};
export function optionsFor(save){return {cards:CARDS.filter(c=>c.character&&(STARTERS.includes(c.id)||save.collection?.[c.id])),tools:CARDS.filter(c=>cardSlot(c)&&(LOAN_TOOLS.includes(c.id)||save.collection?.[c.id]))};}
export const defaultDeck=()=>({cards:STARTERS.slice(0,3),terrain:null,ambiance:null,relic:LOAN_TOOLS.find(id=>cardSlot(cardById[id])==='energy')});
export function validateDeck(deck,save){
 check(deck&&Array.isArray(deck.cards)&&deck.cards.length===3&&new Set(deck.cards).size===3,'Choisis trois personnages différents.');
 const allowed=optionsFor(save),ids=new Set(allowed.cards.map(c=>c.id)),tools=new Set(allowed.tools.map(c=>c.id));
 check(deck.cards.every(id=>ids.has(id)),'Une carte de cette équipe n’est pas disponible sur ton compte.');
 check(deck.cards.filter(id=>cardById[id].country==='3b').length<=1,'Un seul personnage de l’Union par équipe.');
 const next={cards:[...deck.cards],terrain:null,ambiance:null,relic:null};
 for(const slot of ['terrain','ambiance','relic'])if(deck[slot]){const id=deck[slot],kind=cardSlot(cardById[id]);check(tools.has(id)&&(slot==='relic'?!['terrain','ambiance'].includes(kind):kind===slot),'Équipement incompatible.');next[slot]=id;}
 return next;
}
export function fighter(id,terrain){const c=cardById[id],r=ROLES[c.role],max=r.hp+(terrain?8:0);return{id,role:c.role,hp:max,max,shield:0,focus:1};}
export function makeDuel(decks,first=0){return {version:1,turn:first===1?1:0,round:0,winner:null,reason:null,log:['Les cartes se matérialisent. Le duel commence.'],last:null,sides:decks.map(d=>({cards:d.cards.map(id=>fighter(id,d.terrain)),active:0,relic:d.relic,relicUsed:false,ambiance:!!d.ambiance,guarded:false}))};}
export function totalLife(side){return side.cards.reduce((sum,c)=>sum+c.hp/c.max,0);}
export function duelStep(input,side,action){
 check(input&&input.winner===null,'Ce duel est terminé.');check(side===0||side===1,'Joueur inconnu.');
 const s=structuredClone(input),me=s.sides[side],enemy=s.sides[1-side];
 if(action.type==='forfeit'||action.type==='timeout'){s.winner=1-side;s.reason=action.type;s.last={side,type:action.type};s.log=[...s.log,action.type==='timeout'?'Le temps de réflexion est écoulé.':'Un joueur se retire du duel.'].slice(-5);return s;}
 check(s.turn===side,'Attends ton tour.');check(['strike','guard','power','swap','relic'].includes(action.type),'Action inconnue.');
 const card=me.cards[me.active],target=enemy.cards[enemy.active],role=ROLES[card.role];let damage=0,pierce=false,note='';
 if(action.type==='swap'){
  check(Number.isInteger(action.index)&&action.index>=0&&action.index<3&&action.index!==me.active&&me.cards[action.index].hp>0,'Cette réserve n’est pas disponible.');me.active=action.index;me.cards[me.active].shield=Math.min(28,me.cards[me.active].shield+8);note='Une réserve entre avec 8 points de bouclier.';
 }else if(action.type==='guard'){
  check(!me.guarded,'Alterne la garde avec une autre action.');card.shield=Math.min(32,card.shield+22);card.focus=Math.min(3,card.focus+1);note='Garde : +22 bouclier, +1 concentration.';
 }else if(action.type==='strike'){damage=role.hit;card.focus=Math.min(3,card.focus+1);}
 else if(action.type==='power'){
  check(card.focus>=2,'Ce pouvoir demande deux concentrations.');card.focus-=2;
  if(card.role==='assaillant'){damage=38;pierce=true;}
  if(card.role==='protecteur'){damage=26;card.shield=Math.min(32,card.shield+20);}
  if(card.role==='soigneur'){damage=24;card.hp=Math.min(card.max,card.hp+25);}
  if(card.role==='éclaireur')damage=32+(target.hp<target.max/2?10:0);
  if(card.role==='mystique'){damage=30;enemy.cards.forEach((c,i)=>{if(i!==enemy.active)c.hp=Math.max(0,c.hp-9);});}
  if(me.ambiance)damage+=3;note=role.power+'. ';
 }else{
  check(me.relic&&!me.relicUsed,'Ta relique n’est plus disponible.');me.relicUsed=true;const kind=cardSlot(cardById[me.relic]);
  if(kind==='energy'){card.focus=Math.min(3,card.focus+2);note='Énergie : +2 concentrations.';}
  else if(kind==='support'){card.hp=Math.min(card.max,card.hp+35);note='Soutien : +35 vitalité.';}
  else if(kind==='pierre'){card.shield=Math.min(40,card.shield+30);note='Pierre : +30 bouclier.';}
  else{damage=kind==='trap'?26:24;pierce=true;note='Relique activée. ';}
 }
 if(damage){const blocked=Math.min(target.shield,pierce?Math.floor(damage/2):damage);target.shield-=blocked;target.hp=Math.max(0,target.hp-(damage-blocked));note+=`${damage-blocked} dégâts${blocked?' · '+blocked+' absorbés':''}.`;}
 me.guarded=action.type==='guard';s.round++;s.last={side,type:action.type,damage,card:card.id};
 for(const team of s.sides)if(team.cards[team.active].hp===0){const index=team.cards.findIndex(c=>c.hp>0);if(index>=0)team.active=index;}
 if(enemy.cards.every(c=>c.hp===0)){s.winner=side;s.reason='ko';note+=' Les trois cartes adverses sont épuisées.';}
 else if(s.round>=100){const a=totalLife(s.sides[0]),b=totalLife(s.sides[1]);s.winner=Math.abs(a-b)<.0001?2:a>b?0:1;s.reason='limit';note+=' Limite de 100 actions : vitalité restante comparée.';}
 else s.turn=1-side;
 s.log=[...s.log,note].slice(-5);return s;
}
export function practiceAction(state){const side=state.sides[state.turn],c=side.cards[side.active];if(c.focus>=2)return{type:'power'};if(!side.guarded&&c.hp<35&&c.shield<10)return{type:'guard'};return{type:'strike'};}
export const masteryLevel=xp=>Math.min(20,1+Math.floor(Math.sqrt(Math.max(0,xp)/40)));
