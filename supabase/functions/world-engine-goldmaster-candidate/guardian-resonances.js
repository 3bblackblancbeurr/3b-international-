import {CANON_WORLDS} from './story-canon.js';

export const GUARDIAN_RESONANCES=Object.freeze({
 france:Object.freeze({
  id:'juste-lecture',name:'Lecture juste',guardian:'Céliane',value:'Justice',
  combat:'Révèle brièvement la vraie menace parmi des leurres après observation suffisante.',
  exploration:'Compare deux témoignages, traces ou preuves sans décider automatiquement lequel est vrai.',
  puzzle:'Met en évidence les éléments vérifiables et les contradictions d’un dossier.',
  rescue:'Aide à prioriser les victimes selon le danger réel plutôt que la proximité visuelle.',
  limit:'Ne donne jamais la réponse : elle expose seulement les éléments comparables.',
 }),
 algerie:Object.freeze({
  id:'lien-fidele',name:'Lien fidèle',guardian:'Yliane',value:'Loyauté',
  combat:'Crée un lien temporaire avec un allié : les effets de séparation sont réduits tant que les deux restent actifs.',
  exploration:'Permet de garder la trace d’un compagnon séparé par un obstacle ou une foule.',
  puzzle:'Synchronise deux mécanismes qui doivent rester actifs ensemble.',
  rescue:'Stabilise un déplacement à deux sans empêcher la personne aidée de choisir sa direction.',
  limit:'Le lien casse si Kaïs s’éloigne trop ou cherche à contrôler entièrement l’autre personnage.',
 }),
 maroc:Object.freeze({
  id:'garde-noble',name:'Garde noble',guardian:'Naël',value:'Noblesse',
  combat:'Protège un allié ou un objet vulnérable au prix d’une ouverture offensive.',
  exploration:'Permet de sécuriser un objet fragile pendant son transport ou sa restauration.',
  puzzle:'Maintient une pièce délicate en place pendant qu’un autre mécanisme est manipulé.',
  rescue:'Protège sans immobiliser : la cible peut continuer à se déplacer.',
  limit:'Choisir cette protection signifie renoncer temporairement à l’attaque la plus rentable.',
 }),
 tunisie:Object.freeze({
  id:'pas-courageux',name:'Pas de courage',guardian:'Soraya',value:'Courage',
  combat:'Traverse une courte zone de danger lorsque la fenêtre est correctement lue.',
  exploration:'Permet d’entrer dans un environnement instable pour ouvrir un passage aux autres.',
  puzzle:'Active des mécanismes placés dans des zones qui ne restent sûres que quelques secondes.',
  rescue:'Permet d’atteindre une victime dans une zone dangereuse sans rendre Kaïs invulnérable.',
  limit:'Réduit le risque mais ne supprime jamais les dégâts d’un mauvais timing.',
 }),
 espagne:Object.freeze({
  id:'elan-maitrise',name:'Élan maîtrisé',guardian:'Diego',value:'Passion',
  combat:'Transforme un enchaînement propre en puissance supplémentaire sans récompenser le spam.',
  exploration:'Conserve l’élan sur un parcours de parkour lorsque les gestes sont enchaînés proprement.',
  puzzle:'Alimente progressivement un mécanisme par une suite rythmée d’actions différentes.',
  rescue:'Accélère une séquence d’urgence si le joueur garde un rythme maîtrisé.',
  limit:'La Résonance surchauffe si la même action est répétée sans respiration ni variation.',
 }),
 italie:Object.freeze({
  id:'reprise',name:'Reprise',guardian:'Alessio',value:'Espoir',
  combat:'Restaure temporairement un élément défensif détruit afin de créer une nouvelle stratégie.',
  exploration:'Réactive brièvement un mécanisme ancien pour ouvrir un passage, sans prétendre le réparer définitivement.',
  puzzle:'Montre une version fonctionnelle possible d’un système cassé et laisse le joueur comprendre comment la reconstruire.',
  rescue:'Rétablit quelques secondes un équipement critique le temps d’évacuer.',
  limit:'Ce qui est perdu ne revient pas gratuitement : la restauration temporaire exige ensuite une vraie reconstruction.',
 }),
 turquie:Object.freeze({
  id:'ancrage',name:'Ancrage',guardian:'Émir',value:'Foi',
  combat:'Conserve un repère choisi lorsque les autres indicateurs disparaissent ou deviennent trompeurs.',
  exploration:'Maintient une direction ou un signal fiable dans le brouillard, l’obscurité ou une zone perturbée.',
  puzzle:'Permet de fixer une hypothèse de travail pendant que les autres informations changent.',
  rescue:'Garde un cap vers un refuge lorsque la visibilité devient mauvaise.',
  limit:'L’Ancrage protège un engagement choisi ; il ne garantit pas que ce choix était le bon.',
 }),
 estonie:Object.freeze({
  id:'clarte',name:'Clarté',guardian:'Eira',value:'Sagesse',
  combat:'Révèle les micro-différences entre une vraie attaque et ses copies après une courte observation.',
  exploration:'Met en évidence les motifs récurrents dans des traces, sons ou lumières sans supprimer les faux indices.',
  puzzle:'Regroupe visuellement les éléments liés pour faciliter le raisonnement.',
  rescue:'Aide à distinguer un signal de détresse réel d’un écho parasite.',
  limit:'La Clarté demande du temps d’observation ; l’utiliser trop tôt donne une lecture incomplète.',
 }),
});

export const RING_ABILITIES=Object.freeze({
 memoryVision:Object.freeze({
  id:'memory-vision',name:'Vision de Mémoire',source:'anneau',
  uses:['révéler des traces','rejouer un fragment bref du passé','comparer plusieurs versions après progression'],
  rule:'La Vision montre des traces ; elle ne remplace pas l’enquête ni le jugement du joueur.',
 }),
 linkPulse:Object.freeze({
  id:'link-pulse',name:'Impulsion du Lien',source:'anneau',
  uses:['synchroniser deux Résonances','stabiliser un passage du Cercle','relier les huit Gardiens pendant la finale'],
  rule:'Disponible seulement lorsque les liens nécessaires ont déjà été établis ; ce n’est pas une neuvième valeur.',
 }),
});

export function unlockedResonances(save={}){
 const seals=new Set(save.seals||[]);
 return Object.entries(GUARDIAN_RESONANCES).filter(([region])=>seals.has(region)).map(([region,ability])=>({region,...ability}));
}

export function resonanceFor(region){return GUARDIAN_RESONANCES[region]||null;}

export function validateResonances(){
 for(const [region,ability] of Object.entries(GUARDIAN_RESONANCES)){
  const canon=CANON_WORLDS[region];if(!canon||ability.guardian!==canon.guardian||ability.value!==canon.value)throw Error('Résonance incohérente : '+region);
  for(const key of ['combat','exploration','puzzle','rescue','limit'])if(!ability[key]||ability[key].length<30)throw Error('Résonance incomplète '+region+' '+key);
 }
 if(new Set(Object.values(GUARDIAN_RESONANCES).map(a=>a.id)).size!==8)throw Error('Identifiant de Résonance dupliqué');
 return true;
}
