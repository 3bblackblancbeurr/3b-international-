// Complément data-driven du canon narratif central.
// Les faits mondiaux, Kaïs, l'Oubli et les arcs des Gardiens restent dans story-canon.js.

export const COUNTRY_CAMPAIGNS=Object.freeze({
 france:Object.freeze({
  question:'Comment juger lorsque la vérité est incomplète ?',
  missionStyle:'enquête · témoignages · preuve · décisions',
  campaign:Object.freeze([
   {id:'fr-01',title:'Deux versions',family:'enquête',combat:false,purpose:'Deux habitants racontent des versions incompatibles du même événement.'},
   {id:'fr-02',title:'Le témoin qui manque',family:'exploration',combat:false,purpose:'Trouver la trace d’une personne dont personne ne semble se souvenir.'},
   {id:'fr-03',title:'La preuve',family:'observation',combat:false,purpose:'Une preuve paraît décisive avant que le joueur découvre qu’elle a été altérée.'},
   {id:'fr-04',title:'Céliane',family:'interaction humaine',combat:false,purpose:'Première vraie rencontre avec Céliane.'},
   {id:'fr-05',title:'La foule',family:'événement urbain',combat:'optionnel',purpose:'Empêcher une accusation collective de devenir une vengeance.'},
   {id:'fr-06',title:'Celui qu’on avait oublié',family:'sauvetage',combat:false,purpose:'Retrouver le témoin progressivement effacé de la mémoire collective.'},
   {id:'fr-07',title:'Les Archives',family:'énigme · exploration',combat:false,purpose:'Découvrir que Kaïs avait déjà identifié l’Oubli en France.'},
   {id:'fr-08',title:'Justice n’est pas vengeance',family:'choix · confrontation',combat:'contextuel',purpose:'Établir une responsabilité nuancée.'},
   {id:'fr-09',title:'Le poids de la vérité',family:'Gardien · valeur',combat:false,purpose:'Restituer le Fragment de Justice après avoir reconstruit les faits.'},
  ]),
 }),
 italie:Object.freeze({
  question:'Comment continuer lorsque tout semble déjà perdu ?',
  missionStyle:'reconstruction · communauté · progression visible',
  campaign:Object.freeze([
   {id:'it-01',title:'Après l’effondrement',family:'exploration',combat:false},
   {id:'it-02',title:'Ce qui peut encore pousser',family:'reconstruction',combat:false},
   {id:'it-03',title:'Le quartier qui renonce',family:'interaction humaine',combat:false},
   {id:'it-04',title:'Rebâtir ensemble',family:'coopération',combat:'optionnel'},
   {id:'it-05',title:'Une lumière qui reste',family:'Gardien · valeur',combat:false},
  ]),
 }),
 estonie:Object.freeze({
  question:'À quoi sert de comprendre si l’on refuse d’agir ?',
  missionStyle:'observation · énigmes · environnement · stratégie',
  campaign:Object.freeze([
   {id:'ee-01',title:'Les traces silencieuses',family:'observation',combat:false},
   {id:'ee-02',title:'Ce que montre l’aurore',family:'énigme',combat:false},
   {id:'ee-03',title:'Trop tard pour savoir',family:'urgence',combat:false},
   {id:'ee-04',title:'Choisir avec peu',family:'stratégie',combat:'optionnel'},
   {id:'ee-05',title:'Savoir puis agir',family:'Gardien · valeur',combat:false},
  ]),
 }),
 turquie:Object.freeze({
  question:'Comment continuer à croire lorsque le doute demeure ?',
  missionStyle:'mystère · choix intérieurs · exploration symbolique',
  campaign:Object.freeze([
   {id:'tr-01',title:'Le ciel sans réponse',family:'mystère',combat:false},
   {id:'tr-02',title:'Les constellations divisées',family:'exploration',combat:false},
   {id:'tr-03',title:'Le doute d’Émir',family:'interaction humaine',combat:false},
   {id:'tr-04',title:'Agir sans certitude',family:'choix',combat:'optionnel'},
   {id:'tr-05',title:'Ce qui demeure',family:'Gardien · valeur',combat:false},
  ]),
 }),
 algerie:Object.freeze({
  question:'À qui rester loyal lorsqu’une personne que l’on aime se trompe ?',
  missionStyle:'confiance · coopération · relations · conséquences',
  campaign:Object.freeze([
   {id:'dz-01',title:'La parole donnée',family:'coopération',combat:false},
   {id:'dz-02',title:'Deux fidélités',family:'interaction humaine',combat:false},
   {id:'dz-03',title:'Ce qu’on refuse de dire',family:'enquête',combat:false},
   {id:'dz-04',title:'Protéger ou couvrir',family:'choix',combat:'contextuel'},
   {id:'dz-05',title:'Rester sans trahir la vérité',family:'Gardien · valeur',combat:false},
  ]),
 }),
 tunisie:Object.freeze({
  question:'Peut-on être courageux tout en ayant peur ?',
  missionStyle:'danger · exploration · décisions sous pression',
  campaign:Object.freeze([
   {id:'tn-01',title:'La mer monte',family:'urgence',combat:false},
   {id:'tn-02',title:'Traverser malgré la peur',family:'exploration',combat:false},
   {id:'tn-03',title:'Soraya ne recule jamais',family:'interaction humaine',combat:false},
   {id:'tn-04',title:'Ne pas rester seule',family:'sauvetage',combat:'optionnel'},
   {id:'tn-05',title:'Avancer en tremblant',family:'Gardien · valeur',combat:false},
  ]),
 }),
 maroc:Object.freeze({
  question:'La noblesse vient-elle du rang ou de la manière d’agir ?',
  missionStyle:'diplomatie · protection · maîtrise de soi',
  campaign:Object.freeze([
   {id:'ma-01',title:'Le nom et le geste',family:'diplomatie',combat:false},
   {id:'ma-02',title:'Donner sans dominer',family:'interaction humaine',combat:false},
   {id:'ma-03',title:'Le prix de l’orgueil',family:'conséquence',combat:false},
   {id:'ma-04',title:'Protéger sans humilier',family:'protection',combat:'optionnel'},
   {id:'ma-05',title:'La dignité des actes',family:'Gardien · valeur',combat:false},
  ]),
 }),
 espagne:Object.freeze({
  question:'Quand la passion cesse-t-elle de construire pour commencer à consumer ?',
  missionStyle:'poursuite · mouvement · création · action',
  campaign:Object.freeze([
   {id:'es-01',title:'Le moteur rouge',family:'poursuite',combat:false},
   {id:'es-02',title:'Trop vite',family:'événement urbain',combat:'optionnel'},
   {id:'es-03',title:'Ce que l’on brûle',family:'conséquence',combat:false},
   {id:'es-04',title:'Créer au lieu de détruire',family:'création',combat:false},
   {id:'es-05',title:'Maîtriser le feu',family:'Gardien · valeur',combat:'contextuel'},
  ]),
 }),
});

export const campaignFor=region=>COUNTRY_CAMPAIGNS[region]?.campaign||[];
export const campaignMetaFor=region=>COUNTRY_CAMPAIGNS[region]||null;
