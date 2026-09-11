import {CARDS,COUNTRIES,cardById,countryById} from './catalog.js';
import {normalizeAvatar} from './avatar-rules.js';
import {normalizeSave,gain,discover,beacon,recruit,seal,craft,equip,awardMissions,makeEncounter,worldItems,guardianReady,clamp} from './rules.js';
import {CHAPTERS,chapterState,chapterCards,puzzleStart,puzzleStep,puzzleSolved,nexusLevel,COSMETICS,cosmeticUnlocked} from './chapters.js';

const fail=text=>{throw Error(text);};
const requireThat=(condition,text)=>{if(!condition)fail(text);};
const adventure=(s,delta)=>gain(s,{adventure:{...s.adventure,...delta}});
const chapter=(s,id,delta)=>adventure(s,{chapters:{...s.adventure.chapters,[id]:{...chapterState(s,id),...delta}}});
const reward=(s,xp,shards)=>gain(s,{xp:s.xp+xp,shards:s.shards+shards});
const pactPattern=e=>[(e.pactSeed+1)%3,(e.pactSeed+2)%3,e.pactSeed%3];
export const pactCues=['Une lumière vacille : abriter','Un écho hésite : écouter','Une trace s’efface : éclairer'];
export const pactChoices=['Abriter','Écouter','Éclairer'];
export const pactCue=e=>pactCues[pactPattern(e)[e.pactStep||0]];
export const INTENTS={frappe:'Frappe · garde pour réduire les dégâts',rituel:'Rituel · dégâts de ton pouvoir amplifiés',percée:'Percée · ta garde reste partiellement traversée',rempart:'Rempart · tes frappes sont réduites',soin:'Régénération · le gardien va se soigner',gel:'Gel · garde pour préserver ta concentration',éclipse:'Éclipse · prépare ta défense',double:'Double frappe · garde ou piège conseillé',sable:'Souffle de sable · impact renforcé',vague:'Vague · la garde dissipe son impact'};
export function advanceBattle(enc,action){
 requireThat(enc&&!enc.result,'Cette rencontre est terminée.');
 requireThat(['strike','guard','power','trap','support'].includes(action),'Action inconnue.');
 requireThat(action!=='power'||enc.focus>=2,'Il faut deux concentrations.');
 requireThat(action!=='trap'||enc.traps>0,'Aucun piège disponible.');
 requireThat(action!=='support'||enc.support,'Soutien déjà utilisé.');
 const e={...enc,turn:enc.turn+1},s=e.stats,phase=e.enemy/e.enemyMax<.35?3:e.enemy/e.enemyMax<.7?2:1;
 let damage=action==='strike'?s.attack+s.affinity:action==='power'?(s.attack+s.affinity)*2+6:0;
 if(e.intent==='rituel')damage=Math.round(damage*1.5);
 if(e.intent==='rempart')damage=Math.round(damage*(action==='power'?.7:.35));
 e.enemy=Math.max(0,e.enemy-damage);e.focus=action==='power'?0:Math.min(3,e.focus+1);
 if(action==='trap')e.traps--;if(action==='support'){e.support=false;e.hp=Math.min(e.maxHP,e.hp+32);}
 if(!e.enemy){e.result=e.boss?'victory':'calm';e.log=e.boss?'Le gardien reconnaît tes liens.':'L’écho s’apaise. Tu peux maintenant tisser un lien.';return e;}
 const base={frappe:18,rituel:6,percée:27,rempart:12,soin:8,gel:16,éclipse:23,double:30,sable:24,vague:29}[e.intent]||18;
 const enrage=e.expert?Math.max(0,e.turn-24)*2:0;
 const incoming=Math.round(base*(e.expert?1.35:1)*(e.final?1.1:1)+(e.boss?phase-1:0)+enrage);
 const hit=action==='trap'?0:action==='guard'?Math.round(incoming*(e.intent==='percée'?.55:.15)):incoming;
 if(e.intent==='gel'&&action!=='guard'&&action!=='trap')e.focus=Math.max(0,e.focus-1);
 if(e.intent==='soin')e.enemy=Math.min(e.enemyMax,e.enemy+(e.expert?22:12));
 e.hp=clamp(e.hp-hit+(action==='guard'?s.heal+9:0),0,e.maxHP);
 const pattern=CHAPTERS[e.region].pattern;e.phase=phase;
 e.intent=e.final?['frappe','double','rituel','percée','soin','rituel'][e.turn%6]:e.boss?pattern[(e.turn+(phase===3?1:0))%pattern.length]:['frappe','rituel','percée','frappe'][e.turn%4];
 e.log=`${damage} dégâts infligés · ${hit} reçus${action==='guard'?` · +${s.heal+9} vitalité`:''}.${e.boss?' Phase '+phase+' / 3.':''}${enrage?' Le gardien s’enrage : termine le combat !':''}`;
 if(!e.hp){e.result='defeat';e.log='Replie-toi et adapte tes cartes. Tu ne perds aucune carte.';}return e;
}

// Only commands are accepted by the server. XP, ownership and results never come from request totals.
export function applyWorldAction(input,action){
 let s=normalizeSave(input);requireThat(action&&typeof action.type==='string','Action manquante.');
 const region=s.region,c=CHAPTERS[region],cs=chapterState(s,region),e=s.adventure.encounter;
 const inCountry=()=>requireThat(!!c&&s.visited.includes(region),'Traverse d’abord une porte.');
 const peaceful=()=>requireThat(!e||!!e.result,'Termine ou quitte ta rencontre.');
 switch(action.type){
  case 'survey':{peaceful();inCountry();requireThat(['city','rural'].includes(action.id),'Lieu inconnu.');const id=region+':'+action.id;if(s.adventure.discoveries.includes(id))return s;return reward(adventure(s,{discoveries:[...s.adventure.discoveries,id]}),25,6);}
  case 'avatar':{peaceful();const avatar=normalizeAvatar({...action.avatar,created:true});requireThat(avatar.created,'Choisis un nom pour ton personnage.');return adventure(s,{avatar});}
  case 'visit':{
   peaceful();requireThat(action.region==='hub'||countryById[action.region],'Pays inconnu.');
   requireThat(region==='hub'||action.region==='hub'||action.region===region,'Reviens au Nexus pour changer de pays.');
   s=action.region==='hub'?gain(s,{region:'hub'}):discover(s,action.region);return adventure(s,{encounter:null});
  }
  case 'help':{
   peaceful();inCountry();if(cs.helped)return s;
   const cards=chapterCards(region),collection={...s.collection};for(const id of Object.values(cards))if(id)collection[id]=collection[id]||1;
   s=gain(s,{collection,team:s.team.length<3&&!s.team.includes(cards.ally)&&cards.ally!==s.leader?[...s.team,cards.ally]:s.team});
   return awardMissions(reward(chapter(s,region,{helped:true,board:puzzleStart(region)}),80,20));
  }
  case 'power':{
   peaceful();inCountry();requireThat(cs.helped,'Aide d’abord cet habitant.');
   const order=['ally','ambiance','terrain'],next=order[cs.powers.length];requireThat(action.power===next,'Utilise les pouvoirs dans cet ordre : Allié, Ambiance, Terrain.');
   const id=chapterCards(region)[next];requireThat(s.collection[id],'La carte nécessaire manque.');
   return reward(chapter(s,region,{powers:[...cs.powers,next]}),20,0);
  }
  case 'puzzleStep':case 'puzzleReset':case 'solve':{
   peaceful();inCountry();requireThat(cs.powers.length===3,'Fais résonner les trois cartes au monument.');if(cs.solved)return s;
   if(action.type==='puzzleReset')return chapter(s,region,{board:puzzleStart(region)});
   if(action.type==='puzzleStep')return chapter(s,region,{board:puzzleStep(region,cs.board,action.index)});
   requireThat(puzzleSolved(region,cs.board),'L’énigme n’est pas encore résolue. Observe l’indice.');
   return reward(chapter(s,region,{solved:true,restored:1}),120,35);
  }
  case 'beacon':{
   peaceful();inCountry();requireThat(cs.solved,'Résous le monument pour retrouver les souvenirs.');requireThat([0,1,2].some(i=>action.id===region+':'+i),'Souvenir inconnu.');return awardMissions(beacon(s,action.id));
  }
  case 'restore':{
   peaceful();inCountry();requireThat(cs.solved,'Résous le monument.');
   if(cs.restored===1){requireThat([0,1,2].every(i=>s.beacons.includes(region+':'+i)),'Retrouve les trois souvenirs.');requireThat(['garden','workshop'].includes(action.choice),'Choisis un jardin ou un atelier.');return reward(chapter(s,region,{restored:2,choice:action.choice}),140,40);}
   if(cs.restored===2){requireThat(s.seals.includes(region),'Libère le gardien du pays.');return reward(chapter(s,region,{restored:3}),200,70);}return s;
  }
  case 'encounter':{
   peaceful();inCountry();let item=worldItems(region,s).find(i=>i.id===action.id&&['echo','guardian'].includes(i.type));
   requireThat(item,'Cette rencontre n’existe pas.');
   const boss=item.type==='guardian';if(boss)requireThat(cs.restored>=2&&guardianReady(s,region),'Reconstruis le quartier, retrouve trois souvenirs et équipe un Allié.');
   if(action.outdoor){requireThat(!boss&&s.adventure.outdoorCredits>0,'Marche pour révéler un écho du dehors.');s=adventure(s,{outdoorCredits:s.adventure.outdoorCredits-1});}
   const enc=makeEncounter(cardById[item.card],s,boss),expert=s.adventure.difficulty==='expert';
   if(expert){enc.enemy=Math.round(enc.enemy*1.4);enc.enemyMax=enc.enemy;}
   return adventure(s,{encounter:{...enc,region,expert,phase:1,pactSeed:cardById[item.card].number+s.wins,intent:boss?c.pattern[0]:'frappe'}});
  }
  case 'battle':{
   let next=advanceBattle(e,action.action);
   if(next.result==='victory'&&!e.rewarded){
    if(e.final){if(!s.adventure.finished)s=reward(adventure(s,{finished:true,cosmetic:'union'}),1000,300);}
    else {s=seal(s,e.region);if(e.expert&&!chapterState(s,e.region).challenge)s=reward(chapter(s,e.region,{challenge:true}),180,60);}
    next.rewarded=true;
   }
   return adventure(s,{encounter:next});
  }
  case 'approach':{
   requireThat(e&&!e.boss&&!e.result&&!e.pact,'Cette approche n’est plus disponible.');
   requireThat(['offer','help'].includes(action.kind),'Approche inconnue.');
   if(action.kind==='offer'){requireThat(s.shards>=12,'Il faut 12 éclats pour cette offrande.');s=gain(s,{shards:s.shards-12});}
   else requireThat(chapterState(s,e.region).helped,'Aide l’habitant du pays pour apprendre à rassurer ses échos.');
   return adventure(s,{encounter:{...e,result:'calm',approach:action.kind,log:action.kind==='offer'?'Ton offrande attire son attention. Réponds maintenant à ses besoins.':'Tu lui montres un refuge. Observe ses trois réactions pour gagner sa confiance.'}});
  }
  case 'pactStart':{
   requireThat(e&&!e.boss&&e.result==='calm'&&!e.pact,'Apaise l’écho avant de tisser un lien.');return adventure(s,{encounter:{...e,pact:true,pactStep:0,mistakes:0}});
  }
  case 'pactChoice':{
   requireThat(e?.pact&&e.result==='calm','Le pacte n’a pas commencé.');requireThat(Number.isInteger(action.index)&&action.index>=0&&action.index<3,'Réponse inconnue.');
   const good=action.index===pactPattern(e)[e.pactStep],next={...e,pactStep:e.pactStep+(good?1:0),mistakes:e.mistakes+(good?0:1),log:good?'Il se rapproche. Le lien devient plus fort.':'Ce n’était pas son besoin. Observe sa réaction.'};
   if(next.pactStep===3){next.result='recruited';next.rewarded=true;s=recruit(s,e.card);}
   else if(next.mistakes===3){next.result='missed';next.log='L’écho préfère s’éloigner. Tu pourras le retrouver.';}
   return adventure(s,{encounter:next});
  }
  case 'leave':return adventure(s,{encounter:null});
  case 'craft':peaceful();return craft(s,action.id);
  case 'equip':peaceful();return equip(s,action.id,!!action.leader);
  case 'difficulty':peaceful();return adventure(s,{difficulty:action.value==='expert'?'expert':'adventure'});
  case 'cosmetic':{const item=COSMETICS.find(c=>c.id===action.id);requireThat(item&&cosmeticUnlocked(s,item),'Reconstruis le pays pour débloquer cette tenue.');return adventure(s,{cosmetic:action.id});}
  case 'nexusStyle':return adventure(s,{nexusStyle:action.value==='workshop'?'workshop':'garden'});
  case 'walk':{requireThat(Number.isFinite(action.metres)&&action.metres>0&&action.metres<=200,'Distance invalide.');const walked=s.walked+Math.floor(action.metres),credits=Math.floor(walked/100)-Math.floor(s.walked/100);s=gain(s,{walked});return adventure(s,{outdoorCredits:Math.min(50,s.adventure.outdoorCredits+credits)});}
  case 'final':{
   peaceful();requireThat(region==='hub'&&nexusLevel(s)===8&&s.seals.length===8,'Reconstruis les huit pays et réunis les huit sceaux.');requireThat(!s.adventure.finished,'L’Union est déjà retrouvée.');
   const card=CARDS.find(c=>c.id==='C164'),enc=makeEncounter(card,s,true);enc.hp=enc.maxHP+=40;enc.enemy=enc.enemyMax=360;
   return adventure(s,{encounter:{...enc,final:true,region:'france',expert:false,phase:1,pactSeed:0,intent:'frappe',log:'L’Oubli rassemble les attaques des huit gardiens. Protège ton équipe et attends ses ouvertures.'}});
  }
  default:fail('Action de jeu non autorisée.');
 }
}
