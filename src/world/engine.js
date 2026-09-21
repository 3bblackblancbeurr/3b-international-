import {DISTRICT_JOBS,applyDistrictJobAction,jobReadyToTurnIn} from './district-jobs.js';
import {CARDS,COUNTRIES,cardById,countryById} from './catalog.js';
import {normalizeAvatar} from './avatar-rules.js';
import {stepField} from './field-combat.js';
import {beginField,fieldMover} from './field-world.js';
import {frontierState,RESOURCE_SITES,BUILDINGS,buildCost,patrolOpponent} from './frontier.js';
import {normalizeSave,gain,discover,beacon,recruit,seal,craft,equip,awardMissions,makeEncounter,worldItems,guardianReady,clamp} from './rules.js';
import {CHAPTERS,chapterState,chapterCards,puzzleStart,puzzleStep,puzzleSolved,nexusLevel,COSMETICS,cosmeticUnlocked} from './chapters.js';
import {HUB_MISSION_BY_ID,hubMissionReward} from './hub/mission-catalog.js';
import {startHubMission,advanceHubMission,claimHubMission} from './hub/mission-runtime.js';
import {applyHubMissionSignal,isAutoHubMission} from './hub/mission-signals.js';
import {HUB_EVENT_SET,HUB_SECRET_SET,HUB_DISTRICT_SET,HUB_NPC_SET,HUB_BUILDING_SET,HUB_TRANSPORT_SET,HUB_SECRET_STEP_COUNTS,validHubTransportRide} from './hub/activity-catalog.js';
import {hubSecretReady,hubSecretStepAllowed} from './hub/secret-runtime.js';
import {hubMissionPrerequisitesMet} from './hub/mission-graph.js';
import {HUB_DIALOGUE_CHOICE_SET} from './hub/dialogue-v3.js';
import {HUB_DIALOGUE_INTENT_SET} from './hub/dialogue-intents.js';
import {applyHubMissionAction} from './hub/mission-actions.js';
import {GUARDIAN_VALUES,guardianValueStep,normalizeGuardianValueState,guardianValueDecision} from './guardian-values.js';
import {isWorldCinematicKey} from './cinematic-events.js';

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
 requireThat(['strike','guard','dodge','power','trap','support','wait'].includes(action),'Action inconnue.');
 requireThat(action!=='power'||enc.focus>=2,'Il faut deux concentrations.');
 requireThat(action!=='trap'||enc.traps>0,'Aucun piège disponible.');
 requireThat(action!=='support'||enc.support,'Soutien déjà utilisé.');
 requireThat(action!=='dodge'||enc.focus>=1,'Une concentration permet l’esquive.');
 const e={...enc,turn:enc.turn+1},s=e.stats,phase=e.enemy/e.enemyMax<.35?3:e.enemy/e.enemyMax<.7?2:1;
 let damage=action==='strike'?s.attack+s.affinity:action==='power'?(s.attack+s.affinity)*2+6:0;
 if(e.intent==='rituel')damage=Math.round(damage*1.5);
 if(e.intent==='rempart')damage=Math.round(damage*(action==='power'?.7:.35));
 if(e.opening&&action==='strike')damage=Math.round(damage*1.45);
 e.opening=action==='dodge';
 e.enemy=Math.max(0,e.enemy-damage);e.focus=action==='wait'?e.focus:action==='power'?0:action==='dodge'?e.focus-1:Math.min(3,e.focus+1);
 if(action==='trap')e.traps--;if(action==='support'){e.support=false;e.hp=Math.min(e.maxHP,e.hp+32);}
 if(!e.enemy){e.result=e.boss?'victory':'calm';e.log=e.boss?'Le gardien reconnaît tes liens.':'L’écho s’apaise. Tu peux maintenant tisser un lien.';return e;}
 const base={frappe:18,rituel:6,percée:27,rempart:12,soin:8,gel:16,éclipse:23,double:30,sable:24,vague:29}[e.intent]||18;
 // A finite recovery reserve makes guard a tactical defence, not infinite healing.
 e.recoveries=Number.isFinite(enc.recoveries)?enc.recoveries:2;
 const recovery=action==='guard'&&e.recoveries>0&&e.hp<e.maxHP?s.heal+9:0;
 if(recovery)e.recoveries--;
 const enrage=Math.max(0,e.turn-24)*(e.expert?2:1);
 const incoming=Math.round(base*(e.expert?1.35:1)*(e.final?1.1:1)+(e.boss?phase-1:0)+enrage);
 const hit=action==='trap'||action==='dodge'?0:action==='guard'?Math.round(incoming*(e.intent==='percée'?.55:.15)):incoming;
 if(e.intent==='gel'&&action!=='guard'&&action!=='dodge'&&action!=='trap')e.focus=Math.max(0,e.focus-1);
 if(e.intent==='soin')e.enemy=Math.min(e.enemyMax,e.enemy+(e.expert?22:12));
 e.hp=clamp(e.hp-hit+recovery,0,e.maxHP);
 const pattern=CHAPTERS[e.region].pattern;e.phase=phase;
 e.intent=e.final?['frappe','double','rituel','percée','soin','rituel'][e.turn%6]:e.boss?pattern[(e.turn+(phase===3?1:0))%pattern.length]:['frappe','rituel','percée','frappe'][e.turn%4];
 e.log=`${damage} dégâts infligés · ${hit} reçus${recovery?` · +${recovery} vitalité`:''}.${e.boss?' Phase '+phase+' / 3.':''}${enrage?' L’adversaire intensifie ses attaques.':''}`;
 if(!e.hp){e.result='defeat';e.log='Replie-toi et prépare ton groupe. Tes compagnons restent à tes côtés.';}return e;
}

// Only commands are accepted by the server. XP, ownership and results never come from request totals.
export function applyWorldAction(input,action){
 let s=normalizeSave(input);requireThat(action&&typeof action.type==='string','Action manquante.');
 const region=s.region,c=CHAPTERS[region],cs=chapterState(s,region),e=s.adventure.encounter;
 const inCountry=()=>requireThat(!!c&&s.visited.includes(region),'Traverse d’abord une porte.');
 const peaceful=()=>requireThat(!e||!!e.result,'Termine ou quitte ta rencontre.');
 const home=frontierState(s,region),setHome=delta=>adventure(s,{frontier:{...s.adventure.frontier,[region]:{...frontierState(s,region),...delta}}});
 const activeResonance=()=>s.adventure.resonance&&s.seals.includes(s.adventure.resonance)?s.adventure.resonance:null;
 const hubSignal=(state,signal)=>{const result=applyHubMissionSignal(state.hub.missions,signal);return result.missions===state.hub.missions?state:gain(state,{hub:{...state.hub,missions:result.missions}});};
 switch(action.type){
  case 'cinematicSeen':{
   requireThat(isWorldCinematicKey(action.key),'Cinématique inconnue.');
   if(s.adventure.cinematicSeen?.includes(action.key))return s;
   return adventure(s,{cinematicSeen:[...(s.adventure.cinematicSeen||[]),action.key]});
  }
  case 'hubCitySync':{
   peaceful();requireThat(region==='hub','Retourne à la Cité des Huit Héritages.');
   return s;
  }
  case 'hubCityProof':{
   peaceful();requireThat(region==='hub','Retourne à la Cité des Huit Héritages.');
   const proof=action.proof&&typeof action.proof==='object'?action.proof:{};
   let next=s;
   if(proof.founded===true)next=hubSignal(next,{type:'city',id:'founded'});
   if(proof.synced===true)next=hubSignal(next,{type:'city',id:'synced'});
   if(proof.built===true)next=hubSignal(next,{type:'city',id:'built'});
   return next;
  }
  case 'hubMissionStart':{
   peaceful();requireThat(region==='hub','Retourne à la Cité des Huit Héritages.');const mission=HUB_MISSION_BY_ID[action.id];requireThat(mission,'Mission Hub inconnue.');
   const current=s.hub.missions[action.id];requireThat(current&&!current.claimed&&current.status!=='completed','Cette mission est déjà terminée.');requireThat(hubMissionPrerequisitesMet(action.id,s.hub.missions),'Termine d’abord les missions liées.');
   return gain(s,{hub:{...s.hub,missions:startHubMission(s.hub.missions,action.id)}});
  }
  case 'hubMissionStep':{
   peaceful();requireThat(region==='hub','Retourne à la Cité des Huit Héritages.');const mission=HUB_MISSION_BY_ID[action.id];requireThat(mission,'Mission Hub inconnue.');
   const current=s.hub.missions[action.id];requireThat(current?.status==='active','Commence d’abord cette mission.');
   requireThat(!isAutoHubMission(action.id),'Cette mission avance uniquement par tes actions dans la Cité.');
   requireThat(Number.isInteger(action.objective)&&action.objective===current.completedObjectives,'Objectif invalide ou déjà validé.');
   return gain(s,{hub:{...s.hub,missions:advanceHubMission(s.hub.missions,action.id,1)}});
  }
  case 'hubMissionClaim':{
   peaceful();requireThat(region==='hub','Retourne à la Cité des Huit Héritages.');const mission=HUB_MISSION_BY_ID[action.id];requireThat(mission,'Mission Hub inconnue.');
   const current=s.hub.missions[action.id];requireThat(current?.status==='completed'&&!current.claimed,'Récompense indisponible.');
   const missions=claimHubMission(s.hub.missions,action.id),rewardValue=hubMissionReward(mission);
   s=gain(s,{hub:{...s.hub,missions}});return reward(s,rewardValue.xp,rewardValue.shards);
  }
  case 'hubMissionAction':{
   peaceful();requireThat(region==='hub','Retourne à la Cité des Huit Héritages.');
   requireThat(HUB_MISSION_BY_ID[action.missionId],'Mission Hub inconnue.');
   const result=applyHubMissionAction(s.hub.missions,s.hub.stats.missionActions||{},action.missionId,action.actionId);
   requireThat(result.ok,'Action de mission invalide pour cet objectif.');
   if(result.duplicate)return s;
   return gain(s,{hub:{...s.hub,missions:result.missions,stats:{...s.hub.stats,missionActions:result.progress}}});
  }
  case 'hubEventDiscover':{
   peaceful();requireThat(region==='hub','Retourne à la Cité des Huit Héritages.');requireThat(HUB_EVENT_SET.has(action.id),'Événement Hub inconnu.');
   const next=s.hub.events.includes(action.id)?s:reward(gain(s,{hub:{...s.hub,events:[...s.hub.events,action.id]}}),25,6);
   return hubSignal(next,{type:'event',id:action.id});
  }
  case 'hubSecretStep':{
   peaceful();requireThat(region==='hub','Retourne à la Cité des Huit Héritages.');
   const count=HUB_SECRET_STEP_COUNTS[action.id];requireThat(count,'Secret progressif inconnu.');
   requireThat(hubSecretStepAllowed(action.id,s.hub,action.step,count),'Étape secrète invalide ou déjà enregistrée.');
   const secretProgress={...s.hub.stats.secretProgress,[action.id]:[...(s.hub.stats.secretProgress[action.id]||[]),action.step]};
   return hubSignal(gain(s,{hub:{...s.hub,stats:{...s.hub.stats,secretProgress}}}),{type:'secretStep',id:action.id,step:action.step});
  }
  case 'hubSecretUnlock':{
   peaceful();requireThat(region==='hub','Retourne à la Cité des Huit Héritages.');requireThat(HUB_SECRET_SET.has(action.id),'Secret Hub inconnu.');
   if(s.hub.secrets.includes(action.id))return s;
   requireThat(hubSecretReady(action.id,s.hub,action.evidence||{}),'La condition de ce secret n’est pas encore remplie.');
   return hubSignal(reward(gain(s,{hub:{...s.hub,secrets:[...s.hub.secrets,action.id]}}),80,20),{type:'secret',id:action.id});
  }
  case 'hubNpcTalk':{
   peaceful();requireThat(region==='hub','Retourne à la Cité des Huit Héritages.');requireThat(HUB_NPC_SET.has(action.id),'Personnage Hub inconnu.');
   const talks={...s.hub.stats.npcTalks,[action.id]:Math.min(99,(s.hub.stats.npcTalks[action.id]||0)+1)};
   return hubSignal(gain(s,{hub:{...s.hub,stats:{...s.hub.stats,npcTalks:talks}}}),{type:'npc',id:action.id});
  }
  case 'hubDialogueChoice':{
   peaceful();requireThat(region==='hub','Retourne à la Cité des Huit Héritages.');requireThat(HUB_NPC_SET.has(action.npcId),'Personnage Hub inconnu.');
   requireThat(HUB_DIALOGUE_CHOICE_SET.has(action.choiceId),'Choix de dialogue inconnu.');
   const history=[...(s.hub.stats.dialogueHistory||[]),{npcId:action.npcId,sceneId:String(action.sceneId||'scene').slice(0,48),choiceId:action.choiceId}].slice(-120);
   return gain(s,{hub:{...s.hub,stats:{...s.hub.stats,dialogueHistory:history}}});
  }
  case 'hubDialogueIntent':{
   peaceful();requireThat(region==='hub','Retourne à la Cité des Huit Héritages.');requireThat(HUB_NPC_SET.has(action.npcId),'Personnage Hub inconnu.');
   requireThat(HUB_DIALOGUE_INTENT_SET.has(action.intentId),'Sujet de conversation inconnu.');
   const row={npcId:action.npcId,sceneId:'intent',choiceId:action.intentId},existing=s.hub.stats.dialogueHistory||[],last=existing.at(-1);
   const history=last?.npcId===row.npcId&&last?.sceneId===row.sceneId&&last?.choiceId===row.choiceId?existing:[...existing,row].slice(-120);
   return gain(s,{hub:{...s.hub,stats:{...s.hub.stats,dialogueHistory:history}}});
  }
  case 'hubDistrictVisit':{
   peaceful();requireThat(region==='hub','Retourne à la Cité des Huit Héritages.');requireThat(HUB_DISTRICT_SET.has(action.id),'Quartier Hub inconnu.');
   const next=s.hub.stats.districtVisits.includes(action.id)?s:gain(s,{hub:{...s.hub,stats:{...s.hub.stats,districtVisits:[...s.hub.stats.districtVisits,action.id]}}});
   return hubSignal(next,{type:'district',id:action.id});
  }
  case 'hubBuildingVisit':{
   peaceful();requireThat(region==='hub','Retourne à la Cité des Huit Héritages.');requireThat(HUB_BUILDING_SET.has(action.id),'Bâtiment Hub inconnu.');
   const next=s.hub.stats.buildingVisits.includes(action.id)?s:gain(s,{hub:{...s.hub,stats:{...s.hub.stats,buildingVisits:[...s.hub.stats.buildingVisits,action.id]}}});
   return hubSignal(next,{type:'building',id:action.id});
  }
  case 'hubTransportRide':{
   peaceful();requireThat(region==='hub','Retourne à la Cité des Huit Héritages.');
   requireThat(HUB_TRANSPORT_SET.has(action.transport),'Transport Hub inconnu.');
   requireThat(HUB_DISTRICT_SET.has(action.from)&&HUB_DISTRICT_SET.has(action.to),'Arrêt Hub inconnu.');
   requireThat(validHubTransportRide(action.transport,action.from,action.to),'Trajet Hub invalide.');
   const rides={...s.hub.stats.transportRides,[action.transport]:Math.min(999,(s.hub.stats.transportRides[action.transport]||0)+1)};
   const stop=action.transport+':'+action.to,transportStops=s.hub.stats.transportStops.includes(stop)?s.hub.stats.transportStops:[...s.hub.stats.transportStops,stop];
   let nightTrainDates=s.hub.stats.nightTrainDates;
   if(action.transport==='train'&&action.night===true&&/^\d{4}-\d{2}-\d{2}$/.test(action.dateKey||'')&&!nightTrainDates.includes(action.dateKey))nightTrainDates=[...nightTrainDates,action.dateKey].slice(-16);
   return hubSignal(gain(s,{hub:{...s.hub,stats:{...s.hub.stats,transportRides:rides,transportStops,nightTrainDates}}}),{type:'transport',id:action.transport,from:action.from,to:action.to});
  }
  case 'guardianValueChoice':{
   peaceful();inCountry();requireThat(cs.restored>=2,'Reconstruis d’abord le quartier avant l’épreuve du Gardien.');
   const rule=GUARDIAN_VALUES[region],current=normalizeGuardianValueState(region,s.adventure.values?.[region]),step=guardianValueStep(region,current);
   requireThat(rule&&step&&!current.completed,'Cette épreuve de valeur est déjà terminée.');
   const decision=guardianValueDecision(region,current,action.choiceId);requireThat(decision.ok,'Cette réponse ne correspond pas à la situation actuelle.');
   const nextValue=decision.state,values={...s.adventure.values,[region]:nextValue};s=adventure(s,{values});
   return nextValue.completed&&!current.completed?reward(s,60,15):s;
  }
  case 'jobAccept':{peaceful();inCountry();const job=DISTRICT_JOBS[action.id];requireThat(job,'Mission inconnue.');requireThat(!home.activeJob,'Termine d’abord ton contrat actuel.');requireThat(!home.jobs?.includes(action.id),'Ce contrat reviendra après une nouvelle expédition.');requireThat(home.food>=job.cost,'Il faut davantage de provisions pour accepter ce contrat.');return setHome({food:home.food-job.cost,activeJob:action.id,jobStage:0,jobProgress:[]});}
  case 'jobAction':{peaceful();inCountry();requireThat(home.activeJob===action.job,'Cette action n’appartient pas à ton contrat actif.');const result=applyDistrictJobAction(home,action.actionId);requireThat(result.ok,'Action de contrat invalide pour cette étape.');if(result.duplicate)return s;return setHome({jobStage:result.home.jobStage,jobProgress:result.home.jobProgress});}
  case 'jobDone':{peaceful();inCountry();const job=DISTRICT_JOBS[action.id];requireThat(job&&home.activeJob===action.id&&!home.jobs?.includes(action.id),'Aucun contrat à remettre ici.');requireThat(jobReadyToTurnIn(home),'Termine toutes les étapes du contrat avant de revenir.');const delta={activeJob:null,jobStage:0,jobProgress:[],jobs:[...(home.jobs||[]),action.id]};for(const [key,value] of Object.entries(job.reward))delta[key]=Math.min(key==='food'?99:9999,home[key]+value);s=setHome(delta);return reward(s,job.xp||20,job.shards||0);}
  case 'gather':{peaceful();inCountry();const site=RESOURCE_SITES.find(p=>p.id===action.resource);requireThat(site,'Ressource inconnue.');requireThat(!home.harvest.includes(site.id),'Ce gisement reviendra après une expédition réussie.');return setHome({[site.id]:Math.min(site.id==='food'?99:9999,home[site.id]+site.amount+(site.id==='food'?home.garden:0)),harvest:[...home.harvest,site.id]});}
  case 'build':{peaceful();inCountry();const cost=buildCost(home,action.building);requireThat(cost&&BUILDINGS[action.building],'Construction inconnue.');requireThat(home[action.building]<8,'Ce bâtiment est au rang maximal.');requireThat(home.wood>=cost.wood&&home.stone>=cost.stone,'Récolte le bois et la pierre nécessaires.');s=setHome({wood:home.wood-cost.wood,stone:home.stone-cost.stone,[action.building]:home[action.building]+1});return reward(s,40,0);}
  case 'recover':{peaceful();inCountry();requireThat(home.food===0,'Tu as déjà des provisions.');return setHome({food:1});}
  case 'provisions':{peaceful();inCountry();requireThat(region==='france','Le café se trouve dans le quartier de Paris.');requireThat(s.shards>=6,'Il faut 6 éclats pour ce panier.');requireThat(home.food<=96,'Tes réserves sont pleines.');s=gain(s,{shards:s.shards-6});return setHome({food:home.food+3});}
  case 'patrol':{
   peaceful();inCountry();requireThat(home.food>0,'Retourne au refuge pour préparer une provision.');
   const person=patrolOpponent(region,home.expedition);
   const enc={...makeEncounter(person,s,true),recoveries:2},expert=s.adventure.difficulty==='expert';
   enc.enemy=enc.enemyMax=100+Math.min(180,home.expedition*8)+(expert?55:0);s=setHome({food:home.food-1});
   return adventure(s,{encounter:{...enc,patrol:true,region,expert,resonance:activeResonance(),resonanceCharges:activeResonance()?1:0,phase:1,pactSeed:home.expedition,intent:c.pattern[home.expedition%c.pattern.length],log:'Protège les environs. Une victoire renouvelle les ressources et entraîne ton groupe.'}});
  }
  case 'companion':{peaceful();if(action.id===null)return adventure(s,{companionHidden:true});requireThat(cardById[action.id]?.character&&s.collection[action.id],'Gagne d’abord la confiance de ce personnage.');return adventure(s,{companion:action.id,companionHidden:false});}
  case 'companionOrder':{peaceful();requireThat(['follow','scout','support','guard'].includes(action.value),'Ordre compagnon invalide.');return adventure(s,{companionOrder:action.value});}
  case 'resonanceSelect':{peaceful();if(action.region===null)return adventure(s,{resonance:null});requireThat(!!GUARDIAN_VALUES[action.region]&&s.seals.includes(action.region),'Libère d’abord ce Gardien pour utiliser sa Résonance.');return adventure(s,{resonance:action.region});}
  case 'prepare':{peaceful();inCountry();requireThat(cs.restored>=2,'Reconstruis ce quartier pour préparer ton groupe.');return adventure(s,{preparation:region});}
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
   const order=['ally','ambiance','terrain'],next=order[cs.powers.length];requireThat(action.power===next,'Suis ton compagnon, lis les souvenirs, puis ravive le lieu.');
   const id=chapterCards(region)[next];requireThat(s.collection[id],'Ce pouvoir n’a pas encore été appris.');
   return reward(chapter(s,region,{powers:[...cs.powers,next]}),20,0);
  }
  case 'puzzleStep':case 'puzzleReset':case 'solve':{
   peaceful();inCountry();requireThat(cs.powers.length===3,'Éveille les trois pouvoirs au monument.');if(cs.solved)return s;
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
   peaceful();inCountry();if(action.id===region+':guardian'&&!s.seals.includes(region))requireThat(s.adventure.values?.[region]?.completed,`Maîtrise d’abord la valeur ${GUARDIAN_VALUES[region]?.value||'du Gardien'}.`);let item=worldItems(region,s).find(i=>i.id===action.id&&['echo','guardian'].includes(i.type));
   requireThat(item,'Cette rencontre n’existe pas.');
   const boss=item.type==='guardian';if(boss){requireThat(cs.restored>=2&&guardianReady(s,region),'Reconstruis le quartier, retrouve trois souvenirs et équipe un Allié.');if(!s.seals.includes(region))requireThat(s.adventure.values?.[region]?.completed,`Maîtrise d’abord la valeur ${GUARDIAN_VALUES[region]?.value||'du Gardien'}.`);}
   if(action.outdoor){requireThat(!boss&&s.adventure.outdoorCredits>0,'Marche pour révéler un écho du dehors.');s=adventure(s,{outdoorCredits:s.adventure.outdoorCredits-1});}
   const enc={...makeEncounter(cardById[item.card],s,boss),recoveries:2},expert=s.adventure.difficulty==='expert';
   if(boss&&s.adventure.values?.[region]?.completed){enc.focus=Math.min(3,enc.focus+1);enc.hp+=12;enc.maxHP+=12;enc.stats.health+=12;}
   if(s.adventure.preparation){const prepared=chapterState(s,s.adventure.preparation);if(prepared.restored>=2){if(prepared.choice==='workshop')enc.stats.attack+=4;else{enc.hp+=16;enc.maxHP+=16;enc.stats.health+=16;}}s=adventure(s,{preparation:null});}
   if(expert){enc.enemy=Math.round(enc.enemy*1.4);enc.enemyMax=enc.enemy;}
   return adventure(s,{encounter:{...enc,region,expert,resonance:activeResonance(),resonanceCharges:activeResonance()?1:0,phase:1,pactSeed:cardById[item.card].number+s.wins,intent:boss?c.pattern[0]:'frappe'}});
  }
  case 'fieldStart':{requireThat(e&&!e.result,'Aucune rencontre en cours.');return adventure(s,{encounter:{...e,field:e.field||beginField(s,e)}});}
  case 'field':case 'battle':{
   requireThat(action.type==='field'||!e?.field,'Ce combat se joue en temps réel.');
   let next=action.type==='field'?stepField(e,action,fieldMover(s)):advanceBattle(e,action.action);
   if(next.result==='victory'&&!e.rewarded){
    if(e.patrol){const h=frontierState(s,e.region),mastery={...s.adventure.mastery};for(const id of new Set([s.leader,...s.team]))mastery[id]=Math.min(999999,(mastery[id]||0)+30);s=reward(adventure(s,{frontier:{...s.adventure.frontier,[e.region]:{...h,expedition:h.expedition+1,harvest:[],jobs:[]}},mastery}),35,8);}
    else if(e.final){if(!s.adventure.finished)s=reward(adventure(s,{finished:true,cosmetic:'union'}),1000,300);}
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
   peaceful();requireThat(region==='hub'&&nexusLevel(s)===COUNTRIES.length&&s.seals.length===COUNTRIES.length,'Reconstruis les huit pays et réunis les huit sceaux.');requireThat(!s.adventure.finished,'L’Union est déjà retrouvée.');
   const card=CARDS.find(c=>c.id==='C164'),enc=makeEncounter(card,s,true);enc.hp=enc.maxHP+=40;enc.enemy=enc.enemyMax=360;
   return adventure(s,{encounter:{...enc,recoveries:2,final:true,region:'france',expert:false,resonance:activeResonance(),resonanceCharges:activeResonance()?1:0,phase:1,pactSeed:0,intent:'frappe',log:'L’Oubli rassemble les attaques des huit gardiens. Protège ton équipe et attends ses ouvertures.'}});
  }
  default:fail('Action de jeu non autorisée.');
 }
}
