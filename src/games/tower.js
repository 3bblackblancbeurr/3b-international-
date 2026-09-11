import {BaseGame,shuffle,rng} from './core.js';
import {doorDifficulty,readDoorCampaign,doorPerks,doorUnlocked,completeDoorLevel,DOOR_RUNES} from './door-campaign.js';

export const ROOMS=[
 {type:'combat',title:'Le Gardien',hint:'Le bronze résonne. Une sentinelle t’attend.',detail:'Observe son intention, protège-toi et brise sa garde. Un duel au tour par tour.',reward:150,art:0},
 {type:'runes',title:'Les Runes',hint:'Une inscription éclaire la pierre bleue.',detail:'Déduis l’ordre des symboles grâce aux indices. Tu as tout le temps de réfléchir.',reward:120,art:1},
 {type:'mechanism',title:'Le Mécanisme',hint:'Des anneaux tournent derrière la serrure.',detail:'Immobilise l’aiguille dans la zone dorée pour aligner les crans du verrou.',reward:130,art:2},
];
export const INTENTS={strike:{name:'Frappe',hint:'Se protéger réduit les dégâts et prépare une riposte.'},guard:{name:'Garde levée',hint:'Briser traverse sa défense. Frapper sera peu efficace.'},heavy:{name:'Assaut chargé',hint:'Briser interrompt cet assaut. Se protéger en absorbe une partie.'}};

export class Tower extends BaseGame {
 constructor(seed,saved=null,level=saved?.selected||1,{restart=false}={}){
  const campaign=readDoorCampaign(saved),d=doorDifficulty(Math.min(doorUnlocked(campaign),level));super(seed??d.seed);
  this.campaign=campaign;this.campaign.selected=d.level;this.difficulty=d;this.floor=this.stageNumber=d.level;this.perks=doorPerks(campaign);
  Object.assign(this,{focus:this.perks.focus,elixirs:this.perks.elixirs,passed:0,mistakes:0,bonusAttack:0,usedElixirs:0,room:'doors',rewardChosen:false,selectedDoor:-1,busy:0,heroHit:0,enemyHit:0,actionAnim:0,lastAction:'',enemy:null,pending:null,counter:false});
  this.player.hp=this.player.maxHp=this.perks.hp;
  if(!restart&&campaign.run?.level===d.level){const r=campaign.run;for(const k of ['room','passed','focus','elixirs','bonusAttack','score','mistakes','usedElixirs','time','rewardChosen'])this[k]=r[k];this.player.hp=r.hp;}
  this.buildDoors();this.message='Réunis les sceaux des salles pour ouvrir la Porte interdite.';this.checkpoint();
 }
 get canAct(){return this.status==='playing'&&this.busy<=0;}
 buildDoors(){this.random=rng(this.difficulty.seed+this.passed*887);this.doors=shuffle(ROOMS,this.random);this.selectedDoor=-1;}
 checkpoint(){this.savedThreshold={level:this.stageNumber,room:this.room,passed:this.passed,hp:this.player.hp,focus:this.focus,elixirs:this.elixirs,bonusAttack:this.bonusAttack,score:this.score,mistakes:this.mistakes,usedElixirs:this.usedElixirs,time:this.time,rewardChosen:this.rewardChosen};}
 snapshot(){return{...this.campaign,run:this.status==='ended'?null:{...this.savedThreshold,time:this.time}};}
 selectDoor(i){if(!this.canAct||this.room!=='doors'||!Number.isInteger(i)||!this.doors[i])return;this.selectedDoor=i;this.message=this.doors[i].detail;}
 door(i=this.selectedDoor){
  if(!this.canAct||this.room!=='doors'||!Number.isInteger(i)||!this.doors[i])return;
  this.currentDoor=this.doors[i];this.room=this.currentDoor.type;this.cue('door');
  if(this.room==='combat')this.beginCombat(false);
  if(this.room==='runes'){const order=shuffle(DOOR_RUNES,this.random).slice(0,this.difficulty.runes);this.puzzle={order:order.map(r=>r.id),options:shuffle(order,this.random),chosen:[],clues:shuffle(order.slice(0,-1).map((r,i)=>`${r.name} précède immédiatement ${order[i+1].name}.`),this.random)};this.message='Lis les indices puis place les runes de gauche à droite.';}
  if(this.room==='mechanism'){this.lock={elapsed:0,target:.3+this.random()*.4,round:0,hold:0,position:0};this.message='Verrouille quand l’aiguille entre dans la zone dorée.';}
 }
 beginCombat(boss){
  const d=this.difficulty,hp=d.enemyHp+(boss?30+d.chapter*2:0),patterns=[['strike','guard','heavy'],['guard','strike','heavy','strike'],['heavy','guard','strike','heavy','guard']];
  const pattern=boss?['heavy','guard','strike','heavy','strike']:patterns[Math.min(2,Math.floor(d.chapter/3))];
  this.enemy={hp,maxHp:hp,boss,turn:0,intent:pattern[0],pattern};this.room='combat';this.counter=false;this.pending=null;this.busy=0;this.message='Le gardien agit après toi. Observe son intention avant de choisir.';
 }
 combatAction(action){
  if(!this.canAct||this.room!=='combat'||!['attack','guard','break'].includes(action))return;
  const cost={attack:1,guard:0,break:2}[action];if(this.focus<cost){this.message='Concentration insuffisante. Se protéger restaure 2 points.';return;}
  this.focus-=cost;const intent=this.enemy.intent;let damage=0,interrupted=false;
  if(action==='attack'){damage=16+this.perks.attack+this.bonusAttack+(this.counter?8:0);this.counter=false;if(intent==='guard'){damage=Math.ceil(damage/4);this.mistakes++;}}
  if(action==='break'){damage=10+this.bonusAttack+(intent==='guard'?16:intent==='heavy'?6:0);interrupted=intent==='heavy';this.counter=false;}
  if(action==='guard')this.focus=Math.min(this.perks.focus,this.focus+2);
  this.enemy.hp=Math.max(0,this.enemy.hp-damage);this.busy=.55;this.actionAnim=.5;this.lastAction=action;this.enemyHit=damage?.4:0;this.pending={action,intent,interrupted};
  this.message=action==='guard'?'Garde levée · +2 concentration.':interrupted?`Assaut interrompu · −${damage} vie au gardien.`:`${action==='break'?'Défense brisée':'Frappe'} · −${damage} vie au gardien.`;this.cue(action==='guard'?'guard':'hit');
 }
 resolveCombat(){
  const p=this.pending;this.pending=null;if(!p||this.room!=='combat')return;
  if(this.enemy.hp<=0){if(this.enemy.boss){this.score+=350;this.win();}else this.clearRoom();return;}
  let damage=p.intent==='guard'||p.interrupted?0:this.difficulty.damage+(p.intent==='heavy'?10+Math.floor(this.stageNumber/20):0);
  if(p.action==='guard'&&damage){damage=Math.ceil(damage*(p.intent==='heavy'?.4:.15));this.counter=true;}
  if(p.action==='attack'&&p.intent==='heavy')this.mistakes++;
  if(damage)this.hurt(damage,false);
  if(this.status==='ended')return;
  this.enemy.turn++;this.enemy.intent=this.enemy.pattern[this.enemy.turn%this.enemy.pattern.length];
  this.message=p.action==='guard'&&damage?`Parade · −${damage} vitalité. Ta prochaine frappe gagne 8 dégâts.`:p.interrupted?'Assaut interrompu. Le gardien change de posture.':damage?`Le gardien riposte · −${damage} vitalité.`:'Le gardien change de posture. À toi de jouer.';
 }
 attack(){this.combatAction('attack');} guard(){this.combatAction('guard');} breakGuard(){this.combatAction('break');}
 hurt(amount,mistake=true){this.player.hp=Math.max(0,this.player.hp-amount);this.heroHit=.45;if(mistake)this.mistakes++;this.cue('damage');if(this.player.hp<=0)this.finish(false,'Le seuil reste fermé. Reprends ce niveau avec une nouvelle stratégie.');}
 chooseRune(id){if(this.canAct&&this.room==='runes'&&this.puzzle.options.some(r=>r.id===id)&&!this.puzzle.chosen.includes(id))this.puzzle.chosen.push(id);}
 undoRune(){if(this.canAct&&this.room==='runes')this.puzzle.chosen.pop();}
 checkRunes(){if(!this.canAct||this.room!=='runes'||this.puzzle.chosen.length!==this.puzzle.order.length)return;if(this.puzzle.order.every((id,i)=>id===this.puzzle.chosen[i]))this.clearRoom();else{this.hurt(this.difficulty.errorDamage);this.puzzle.chosen=[];if(this.status==='playing')this.message=`L’ordre est incorrect · −${this.difficulty.errorDamage} vitalité. Relis les liens entre les runes.`;}}
 stopMechanism(){
  if(!this.canAct||this.room!=='mechanism'||this.lock.hold>0)return;
  if(Math.abs(this.lock.position-this.lock.target)<=this.difficulty.lockWidth/2){this.lock.round++;this.cue('perfect');if(this.lock.round>=this.difficulty.lockRounds)this.clearRoom();else{this.lock.hold=.65;this.message='Cran aligné. Prépare le suivant.';}}
  else{this.hurt(this.difficulty.errorDamage);this.lock.hold=.45;if(this.status==='playing')this.message=`Hors de la zone · −${this.difficulty.errorDamage} vitalité. Attends le prochain passage.`;}
 }
 clearRoom(){if(this.status!=='playing'||!['combat','runes','mechanism'].includes(this.room))return;this.score+=this.currentDoor.reward;this.passed++;this.room='resolved';this.rewardChosen=false;this.busy=0;this.pending=null;this.cue('collect');this.message='Un sceau retrouvé. Choisis une bénédiction pour la suite du niveau.';this.checkpoint();}
 chooseReward(kind){
  if(!this.canAct||this.room!=='resolved'||this.rewardChosen||!['vitality','focus','power'].includes(kind))return;
  if(kind==='vitality')this.player.hp=Math.min(this.player.maxHp,this.player.hp+22);
  if(kind==='focus')this.focus=this.perks.focus;if(kind==='power')this.bonusAttack+=2;
  this.rewardChosen=true;this.message='Bénédiction reçue. Ton avancée est sauvegardée.';this.cue('collect');this.checkpoint();
 }
 next(){if(!this.canAct||this.room!=='resolved'||!this.rewardChosen)return;this.room=this.passed===this.difficulty.rooms?'gate':'doors';this.buildDoors();this.message=this.room==='gate'?'Tous les sceaux sont réunis. La Porte t’attend.':'Un nouveau seuil. Quelle épreuve choisiras-tu ?';this.checkpoint();}
 openGate(){if(!this.canAct||this.room!=='gate'||this.passed!==this.difficulty.rooms)return;if(this.difficulty.boss)this.beginCombat(true);else{this.room='opening';this.busy=1;this.cue('door');}}
 heal(){if(!this.canAct||this.elixirs<=0||this.player.hp>=this.player.maxHp||!['doors','combat','runes','mechanism','resolved','gate'].includes(this.room))return;this.elixirs--;this.usedElixirs++;this.player.hp=Math.min(this.player.maxHp,this.player.hp+35);this.message='Élixir utilisé · +35 vitalité au maximum.';this.cue('collect');if(['doors','resolved','gate'].includes(this.room))this.checkpoint();}
 win(){if(this.status!=='playing'||this.passed!==this.difficulty.rooms||!(this.room==='opening'||(this.room==='combat'&&this.enemy.boss&&this.enemy.hp<=0)))return;this.score+=200+this.player.hp*2+this.stageNumber*10;const result=completeDoorLevel(this.campaign,this.stageNumber,{score:this.score,time:this.time,mistakes:this.mistakes,usedElixirs:this.usedElixirs});this.campaign=result.campaign;this.stars=result.stars;this.firstClear=result.first;this.finish(true,this.stageNumber===100?'La dernière Porte est ouverte. Tu as achevé les 100 niveaux.':'La Porte s’ouvre. Ton prochain voyage commence.');this.cue('victory');}
 action(){if(this.room==='combat')this.attack();else if(this.room==='mechanism')this.stopMechanism();else if(this.room==='runes')this.checkRunes();}
 confirm(){if(this.room==='doors')this.door();else if(this.room==='resolved')this.next();else if(this.room==='gate')this.openGate();else this.action();}
 update(dt){
  if(this.status!=='playing')return;this.tick(dt);for(const k of ['heroHit','enemyHit','actionAnim'])this[k]=Math.max(0,this[k]-dt);
  if(this.busy>0){this.busy=Math.max(0,this.busy-dt);if(this.busy===0){if(this.room==='combat')this.resolveCombat();else if(this.room==='opening')this.win();}}
  if(this.room==='mechanism'){const l=this.lock;if(l.hold>0){l.hold=Math.max(0,l.hold-dt);if(l.hold===0){l.elapsed=0;l.position=0;l.target=.3+this.random()*.4;}}else{l.elapsed+=dt;l.position=(1-Math.cos(l.elapsed*this.difficulty.lockSpeed*Math.PI*2))/2;}}
 }
 hud(){return[['Vitalité',`${this.player.hp}/${this.player.maxHp}`],['Concentration',`${this.focus}/${this.perks.focus}`],['Sceaux',`${this.passed}/${this.difficulty.rooms}`],['Fragments',this.score]];}
}
