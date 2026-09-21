import hubMissions from './hub/data/missions-v1.json' with {type:'json'};
import {CHAPTERS} from './chapters.js';
import {CANON_WORLDS,GUARDIAN_STORIES} from './story-canon.js';

export const MISSION_CATEGORIES=Object.freeze([
 'main','guardian','independent','secret','dynamic','city','coop','challenge','endgame',
]);

const phase=(id,title,gameplay,implementation='runtime')=>({id,title,gameplay,implementation});

export const GUARDIAN_CAMPAIGNS=Object.freeze({
 france:Object.freeze({
  guardian:'Céliane',value:'Justice',signature:'enquête contradictoire et preuve vérifiable',
  dominant:['investigation','dialogue','evidence','precision-combat'],
  combat:'Identifier la vraie menace parmi de faux signaux ; parade et contre précis après vérification.',
  post:'Nouvelles enquêtes des Archives, médiations et dossiers restaurés.',
  finalRole:'Révèle la vraie cible lorsque l’Oubli fabrique plusieurs versions du même événement.',
  phases:Object.freeze([
   phase('rumor','Les noms effacés','recueillir des versions incompatibles'),
   phase('evidence','Les voix effacées','chercher traces, archives et témoignages'),
   phase('coordination','Les deux plateaux','agir avec le compagnon sur deux positions'),
   phase('memory','Ce qui nous relie','reconstituer les deux témoignages'),
   phase('value','Épreuve de Justice','écouter, vérifier, réparer'),
   phase('guardian','Céliane','duel de lecture et contre'),
   phase('homecoming','Le retour de Céliane','restauration et retour à la Cité'),
   phase('post','Les dossiers revenus','enquêtes post-Gardien'),
  ]),
 }),
 algerie:Object.freeze({
  guardian:'Yliane',value:'Loyauté',signature:'groupe séparé, confiance et protection sans contrôle',
  dominant:['escort','team','truth','defense'],
  combat:'L’Oubli isole les alliés ; rester groupé, rétablir les liens et choisir qui protéger sans immobiliser le groupe.',
  post:'Escortes sensibles, habitants divisés, missions de confiance et sauvetage de groupe.',
  finalRole:'Maintient le groupe relié lorsque la manifestation cherche à séparer les huit.',
  phases:Object.freeze([
   phase('rumor','Les liens sous suspicion','entendre plusieurs accusations'),
   phase('escort','Ceux qui restent','escorter sans abandonner les plus lents','framework'),
   phase('truth','La parole difficile','révéler une vérité qui coûte','framework'),
   phase('memory','L’eau se souvient','restaurer canaux et souvenirs'),
   phase('value','Épreuve de Loyauté','rester, dire, protéger'),
   phase('guardian','Yliane','combat de cohésion'),
   phase('homecoming','Le retour de Yliane','réunir le quartier'),
   phase('post','Les routes de confiance','missions de groupe évolutives','framework'),
  ]),
 }),
 maroc:Object.freeze({
  guardian:'Naël',value:'Noblesse',signature:'dignité, artisanat et sacrifice volontaire d’un avantage',
  dominant:['craft','aid','protection','restraint'],
  combat:'Certaines ouvertures faciles blessent un tiers ou détruisent un héritage ; gagner exige parfois renoncer au meilleur coup.',
  post:'Commandes d’artisans, restauration d’objets, médiations sur le don et la dignité.',
  finalRole:'Protège l’élément vulnérable du Cercle pendant que les autres agissent.',
  phases:Object.freeze([
   phase('rumor','Le prix du geste','observer comment l’aide peut devenir humiliation','framework'),
   phase('craft','Le souffle des cimes','réparer cloches et messages'),
   phase('aid','Donner sans écraser','aider sans créer de dette','framework'),
   phase('memory','Les ateliers de mémoire','restaurer un objet transmis','framework'),
   phase('value','Épreuve de Noblesse','respecter, donner, tenir'),
   phase('guardian','Naël','combat de protection et retenue'),
   phase('homecoming','Le retour de Naël','ouvrir les ateliers du Nexus'),
   phase('post','L’ouvrage transmis','artisanat et restauration avancés','framework'),
  ]),
 }),
 tunisie:Object.freeze({
  guardian:'Soraya',value:'Courage',signature:'urgence, sauvetage et progression dans un danger lisible',
  dominant:['rescue','storm','timed-choice','hazard'],
  combat:'Le terrain se ferme ; le joueur doit avancer vers le danger au bon moment plutôt que camper ou spammer.',
  post:'Sauvetages dynamiques, tempêtes, incidents maritimes et interventions civiles.',
  finalRole:'Ouvre le passage dangereux que personne d’autre ne peut tenir assez longtemps.',
  phases:Object.freeze([
   phase('rumor','Quand la peur arrive','préparer une intervention','framework'),
   phase('rescue','Ce que la mer rend','sauvetage de rivage'),
   phase('hazard','La route sous la tempête','traverser des zones à fenêtres sûres','framework'),
   phase('memory','Les marches retrouvées','récupérer les souvenirs du rivage'),
   phase('value','Épreuve de Courage','avancer, protéger, assumer'),
   phase('guardian','Soraya','combat d’avancée sous pression'),
   phase('homecoming','Le retour de Soraya','réouverture du port'),
   phase('post','Les appels du large','sauvetages variables','framework'),
  ]),
 }),
 espagne:Object.freeze({
  guardian:'Diego',value:'Passion',signature:'rythme, mouvement et maîtrise de l’intensité',
  dominant:['arena','movement','combo','performance'],
  combat:'Une jauge d’intensité augmente avec les combos mais surchauffe si le joueur frappe sans respiration ni placement.',
  post:'Défis publics, performances, parcours et duels à contraintes créatives.',
  finalRole:'Transforme l’énergie accumulée par l’équipe en fenêtre offensive contrôlée.',
  phases:Object.freeze([
   phase('rumor','La place s’échauffe','observer une foule qui monte en intensité','framework'),
   phase('movement','La dernière rotation','accorder moulins et rythme'),
   phase('arena','Le geste juste','enchaîner sans perdre le contrôle','framework'),
   phase('memory','Le phare du crépuscule','rétablir le signal'),
   phase('value','Épreuve de Passion','canaliser, créer, maîtriser'),
   phase('guardian','Diego','duel rythmique à surchauffe'),
   phase('homecoming','Le retour de Diego','réouverture de la scène'),
   phase('post','Les nuits de la Plaza','défis de foule et création','framework'),
  ]),
 }),
 italie:Object.freeze({
  guardian:'Alessio',value:'Espoir',signature:'reconstruction après échec et solutions alternatives',
  dominant:['rebuild','retry','route-choice','defense-break'],
  combat:'Le boss reconstruit des défenses détruites ; le joueur doit créer une nouvelle ouverture au lieu de répéter le même plan.',
  post:'Chantiers, jardins évolutifs, reconstruction de lieux et missions après échec.',
  finalRole:'Restaure un mécanisme du Cercle détruit pendant la confrontation finale.',
  phases:Object.freeze([
   phase('rumor','Ce qui ne revient pas','constater une perte irréversible','framework'),
   phase('path','Les jardins suspendus','ouvrir un nouveau chemin'),
   phase('rebuild','Reprendre autrement','reconstruire sans copier l’ancien','framework'),
   phase('memory','La serre des vérités','faire revenir ce qui peut l’être'),
   phase('value','Épreuve d’Espoir','tenir, ouvrir, transmettre'),
   phase('guardian','Alessio','combat contre des défenses qui reviennent'),
   phase('homecoming','Le retour d’Alessio','jardin vivant au Nexus'),
   phase('post','Les chantiers impossibles','reconstruction avancée','framework'),
  ]),
 }),
 turquie:Object.freeze({
  guardian:'Émir',value:'Foi',signature:'agir avec cohérence sous information incomplète',
  dominant:['signals','uncertainty','navigation','commitment'],
  combat:'Certaines informations disparaissent ; il faut mémoriser des signes fiables et agir sans attendre une certitude totale.',
  post:'Routes nocturnes, observatoire, choix sous incertitude et missions de parole donnée.',
  finalRole:'Maintient le lien quand les repères visuels et sonores sont brouillés.',
  phases:Object.freeze([
   phase('rumor','Les cartes incomplètes','accepter une information partielle','framework'),
   phase('signals','Le ciel partagé','aligner les astrolabes'),
   phase('commit','La parole sans témoin','tenir un engagement non surveillé','framework'),
   phase('memory','La galerie des étoiles','relier signes et mémoire'),
   phase('value','Épreuve de Foi','tenir, douter, agir'),
   phase('guardian','Émir','combat de signes et engagement'),
   phase('homecoming','Le retour d’Émir','observatoire du Nexus'),
   phase('post','Les passages sans carte','missions à information limitée','framework'),
  ]),
 }),
 estonie:Object.freeze({
  guardian:'Eira',value:'Sagesse',signature:'observation, leurres et décision au bon moment',
  dominant:['tracking','pattern','decoy','timing'],
  combat:'Des copies imitent les attaques ; observer les micro-signaux révèle la vraie menace avant une courte fenêtre d’action.',
  post:'Pistage, animaux-signal, anomalies, enquêtes de motifs et décisions temporisées.',
  finalRole:'Identifie le pattern final que l’Oubli essaie de cacher dans le bruit.',
  phases:Object.freeze([
   phase('rumor','Trop de signaux','séparer information et bruit','framework'),
   phase('tracking','La piste des aurores','suivre les lumières'),
   phase('decoy','Le faux sentier','distinguer leurres et traces','framework'),
   phase('memory','Le refuge des pins','relier des indices dispersés'),
   phase('value','Épreuve de Sagesse','observer, relier, mesurer'),
   phase('guardian','Eira','combat d’observation et timing'),
   phase('homecoming','Le retour d’Eira','lanternes au Nexus'),
   phase('post','Les anomalies boréales','pistage et décisions avancées','framework'),
  ]),
 }),
});

export const INDEPENDENT_MISSION_ARCHETYPES=Object.freeze([
 {id:'local_investigation',category:'independent',gameplay:['dialogue','evidence','choice'],repeatable:true},
 {id:'rescue_incident',category:'dynamic',gameplay:['rescue','escort','hazard'],repeatable:true},
 {id:'underwater_recovery',category:'secret',gameplay:['swim','dive','search'],repeatable:false},
 {id:'repair_network',category:'independent',gameplay:['diagnose','repair','defend'],repeatable:true},
 {id:'artisan_commission',category:'independent',gameplay:['collect','craft','deliver'],repeatable:true},
 {id:'memory_hunt',category:'secret',gameplay:['vision','tracking','reconstruction'],repeatable:true},
 {id:'lost_animal',category:'independent',gameplay:['tracking','calm','protect'],repeatable:true},
 {id:'parkour_route',category:'challenge',gameplay:['climb','vault','zipline'],repeatable:true},
 {id:'transport_incident',category:'dynamic',gameplay:['vehicle','repair','rescue'],repeatable:true},
 {id:'night_secret',category:'secret',gameplay:['observation','timing','stealth'],repeatable:false},
 {id:'community_conflict',category:'independent',gameplay:['dialogue','mediation','consequence'],repeatable:true},
 {id:'city_construction',category:'city',gameplay:['plan','build','visit'],repeatable:true},
 {id:'coop_relay',category:'coop',gameplay:['coordination','simultaneous-action','revive'],repeatable:true},
 {id:'elite_hunt',category:'challenge',gameplay:['tracking','combat','environment'],repeatable:true},
 {id:'defend_location',category:'dynamic',gameplay:['defense','waves','repair'],repeatable:true},
 {id:'moving_convoy',category:'coop',gameplay:['vehicle','escort','combat'],repeatable:true},
]);

export function centralMissionIndex(){
 const hub=hubMissions.map(mission=>({
  id:'hub:'+mission.id,
  source:'hub',
  category:mission.category==='main'?'main':mission.category==='secret'?'secret':mission.category==='dynamic'?'dynamic':mission.category==='city'?'city':'independent',
  title:mission.title,
  gameplay:[mission.category],
  guardian:null,
  implementation:'runtime',
  objectives:[...mission.objectives],
  rewards:[...mission.rewards],
 }));
 const guardians=Object.entries(GUARDIAN_CAMPAIGNS).map(([region,campaign])=>({
  id:'guardian:'+region,
  source:'guardian',
  category:'guardian',
  title:CHAPTERS[region]?.title||campaign.value,
  region,
  guardian:campaign.guardian,
  value:campaign.value,
  signature:campaign.signature,
  gameplay:[...campaign.dominant],
  implementation:campaign.phases.every(p=>p.implementation==='runtime')?'runtime':'hybrid',
  phases:campaign.phases,
 }));
 return [...hub,...guardians];
}

export function validateMissionArchitecture(){
 const index=centralMissionIndex(),ids=new Set();
 for(const mission of index){
  if(ids.has(mission.id))throw Error('Mission dupliquée : '+mission.id);ids.add(mission.id);
  if(!MISSION_CATEGORIES.includes(mission.category))throw Error('Catégorie inconnue : '+mission.id);
 }
 for(const [region,campaign] of Object.entries(GUARDIAN_CAMPAIGNS)){
  const canon=CANON_WORLDS[region],story=GUARDIAN_STORIES[region];
  if(!canon||campaign.guardian!==canon.guardian||campaign.value!==canon.value||story?.name!==campaign.guardian)throw Error('Campagne Gardien incohérente : '+region);
  if(campaign.phases.length<8)throw Error('Campagne Gardien trop courte : '+region);
  if(!campaign.finalRole||!campaign.combat||campaign.dominant.length<4)throw Error('Identité gameplay insuffisante : '+region);
 }
 if(new Set(Object.values(GUARDIAN_CAMPAIGNS).map(c=>c.signature)).size!==8)throw Error('Deux Gardiens partagent la même signature de campagne');
 if(new Set(Object.values(GUARDIAN_CAMPAIGNS).map(c=>c.combat)).size!==8)throw Error('Deux Gardiens partagent le même combat');
 return true;
}
