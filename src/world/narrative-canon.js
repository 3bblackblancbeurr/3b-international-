export const WORLD_NARRATIVE={
 pillars:['Mémoire','Héritage','Valeurs','Reconstruction'],
 player:{
  hook:'Le Passeport du joueur reçoit un Souvenir impossible, antérieur à son arrivée et signé Kaïs.',
  motivation:'Comprendre pourquoi ce souvenir existe, puis découvrir ce qui arrive à la mémoire du monde.',
  role:'Le joueur n’est pas un élu : il peut préserver certains Souvenirs que l’Oubli devrait effacer.',
 },
 kais:{
  role:'Premier explorateur à avoir compris que le Cercle et les huit Portes formaient une seule histoire.',
  status:'Disparu avant d’achever sa route. Ses traces, messages et Souvenirs servent de fil rouge.',
  distinction:'Kaïs ouvre l’histoire ; le joueur reconstitue ce qui s’est passé et choisit comment la poursuivre.',
 },
 circle:{
  origin:'Le Cercle reliait les huit héritages sans les confondre.',
  fracture:'Il a été brisé pour empêcher qu’une seule force puisse contrôler les huit fragments.',
  danger:'Le reconstruire restaure le monde, mais peut aussi réveiller ce que la fracture maintenait séparé.',
 },
 oblivion:{
  origin:'Mécanisme de protection créé pour effacer les chemins menant aux fragments.',
  corruption:'Il ne distingue plus ce qui doit être caché de ce qui doit être préservé.',
  manifestations:['souvenirs incomplets','personnes oubliées','lieux dont le nom disparaît','relations effacées','signaux Matrix corrompus'],
  reveal:'Le Monstre de l’Oubli est la manifestation physique d’un système devenu incontrôlable, pas un mal gratuit.',
 },
 reveals:[
  'Pourquoi mon Passeport contient-il un Souvenir de Kaïs ?',
  'Où est Kaïs ?',
  'Pourquoi le Cercle a-t-il été brisé ?',
  'Pourquoi l’Oubli existe-t-il ?',
  'Faut-il réellement reconstituer le Cercle jusqu’au bout ?',
 ],
};

export const COUNTRY_NARRATIVE={
 france:{
  value:'Justice',
  question:'Comment juger lorsque la vérité est incomplète ?',
  missionStyle:'enquête · témoignages · preuve · décisions',
  guardian:{name:'Céliane',flaw:'Sa rigueur peut devenir froide lorsqu’elle réduit une situation humaine aux seuls faits vérifiables.',evolution:'Elle apprend que justice et humanité doivent rester liées.'},
  campaign:[
   {id:'fr-01',title:'Deux versions',family:'enquête',combat:false,purpose:'Deux habitants racontent des versions incompatibles du même événement.'},
   {id:'fr-02',title:'Le témoin qui manque',family:'exploration',combat:false,purpose:'Trouver la trace d’une personne dont personne ne semble se souvenir.'},
   {id:'fr-03',title:'La preuve',family:'observation',combat:false,purpose:'Une preuve paraît décisive avant que le joueur découvre qu’elle a été altérée.'},
   {id:'fr-04',title:'Céliane',family:'interaction humaine',combat:false,purpose:'Première vraie rencontre avec Céliane, qui refuse de condamner sans preuve suffisante.'},
   {id:'fr-05',title:'La foule',family:'événement urbain',combat:'optionnel',purpose:'Empêcher une accusation collective de devenir une vengeance.'},
   {id:'fr-06',title:'Celui qu’on avait oublié',family:'sauvetage',combat:false,purpose:'Retrouver vivant le témoin progressivement effacé de la mémoire collective.'},
   {id:'fr-07',title:'Les Archives',family:'énigme · exploration',combat:false,purpose:'Découvrir que Kaïs avait déjà identifié l’Oubli en France.'},
   {id:'fr-08',title:'Justice n’est pas vengeance',family:'choix · confrontation',combat:'contextuel',purpose:'Établir une responsabilité nuancée : ni innocence parfaite, ni coupable absolu.'},
   {id:'fr-09',title:'Le poids de la vérité',family:'Gardien · valeur',combat:false,purpose:'Obtenir le Fragment de Justice en reconstruisant la vérité malgré une mémoire incomplète.'},
  ],
 },
 italie:{
  value:'Espoir',
  question:'Comment continuer lorsque tout semble déjà perdu ?',
  missionStyle:'reconstruction · communauté · progression visible',
  guardian:{name:'Alessio',flaw:'Il confond parfois l’espoir avec le refus d’accepter une mauvaise réalité.',evolution:'Il apprend qu’espérer signifie agir lucidement, pas nier les pertes.'},
  campaign:[
   {id:'it-01',title:'Après l’effondrement',family:'exploration',combat:false},
   {id:'it-02',title:'Ce qui peut encore pousser',family:'reconstruction',combat:false},
   {id:'it-03',title:'Le quartier qui renonce',family:'interaction humaine',combat:false},
   {id:'it-04',title:'Rebâtir ensemble',family:'coopération',combat:'optionnel'},
   {id:'it-05',title:'Une lumière qui reste',family:'Gardien · valeur',combat:false},
  ],
 },
 estonie:{
  value:'Sagesse',
  question:'À quoi sert de comprendre si l’on refuse d’agir ?',
  missionStyle:'observation · énigmes · environnement · stratégie',
  guardian:{name:'Eira',flaw:'Elle analyse si longtemps qu’elle peut laisser passer le moment d’agir.',evolution:'Elle comprend que la sagesse exige parfois une décision imparfaite mais nécessaire.'},
  campaign:[
   {id:'ee-01',title:'Les traces silencieuses',family:'observation',combat:false},
   {id:'ee-02',title:'Ce que montre l’aurore',family:'énigme',combat:false},
   {id:'ee-03',title:'Trop tard pour savoir',family:'urgence',combat:false},
   {id:'ee-04',title:'Choisir avec peu',family:'stratégie',combat:'optionnel'},
   {id:'ee-05',title:'Savoir puis agir',family:'Gardien · valeur',combat:false},
  ],
 },
 turquie:{
  value:'Foi',
  question:'Comment continuer à croire lorsque le doute demeure ?',
  missionStyle:'mystère · choix intérieurs · exploration symbolique',
  guardian:{name:'Émir',flaw:'Il croit devoir cacher ses propres doutes pour rester digne de sa valeur.',evolution:'Il accepte que foi et doute puissent coexister sans annuler l’engagement.'},
  campaign:[
   {id:'tr-01',title:'Le ciel sans réponse',family:'mystère',combat:false},
   {id:'tr-02',title:'Les constellations divisées',family:'exploration',combat:false},
   {id:'tr-03',title:'Le doute d’Émir',family:'interaction humaine',combat:false},
   {id:'tr-04',title:'Agir sans certitude',family:'choix',combat:'optionnel'},
   {id:'tr-05',title:'Ce qui demeure',family:'Gardien · valeur',combat:false},
  ],
 },
 algerie:{
  value:'Loyauté',
  question:'À qui rester loyal lorsqu’une personne que l’on aime se trompe ?',
  missionStyle:'confiance · coopération · relations · conséquences',
  guardian:{name:'Yliane',flaw:'Sa loyauté peut la pousser à protéger trop longtemps quelqu’un qui agit mal.',evolution:'Elle apprend que dire la vérité peut être une forme supérieure de loyauté.'},
  campaign:[
   {id:'dz-01',title:'La parole donnée',family:'coopération',combat:false},
   {id:'dz-02',title:'Deux fidélités',family:'interaction humaine',combat:false},
   {id:'dz-03',title:'Ce qu’on refuse de dire',family:'enquête',combat:false},
   {id:'dz-04',title:'Protéger ou couvrir',family:'choix',combat:'contextuel'},
   {id:'dz-05',title:'Rester sans trahir la vérité',family:'Gardien · valeur',combat:false},
  ],
 },
 tunisie:{
  value:'Courage',
  question:'Peut-on être courageux tout en ayant peur ?',
  missionStyle:'danger · exploration · décisions sous pression',
  guardian:{name:'Soraya',flaw:'Elle cache sa peur et prend trop souvent les risques seule.',evolution:'Elle comprend que reconnaître sa peur et demander de l’aide peut être courageux.'},
  campaign:[
   {id:'tn-01',title:'La mer monte',family:'urgence',combat:false},
   {id:'tn-02',title:'Traverser malgré la peur',family:'exploration',combat:false},
   {id:'tn-03',title:'Soraya ne recule jamais',family:'interaction humaine',combat:false},
   {id:'tn-04',title:'Ne pas rester seule',family:'sauvetage',combat:'optionnel'},
   {id:'tn-05',title:'Avancer en tremblant',family:'Gardien · valeur',combat:false},
  ],
 },
 maroc:{
  value:'Noblesse',
  question:'La noblesse vient-elle du rang ou de la manière d’agir ?',
  missionStyle:'diplomatie · protection · maîtrise de soi',
  guardian:{name:'Naël',flaw:'Sa dignité se transforme parfois en orgueil et l’éloigne des autres.',evolution:'Il apprend que la véritable noblesse peut être humble et se mesurer aux actes.'},
  campaign:[
   {id:'ma-01',title:'Le nom et le geste',family:'diplomatie',combat:false},
   {id:'ma-02',title:'Donner sans dominer',family:'interaction humaine',combat:false},
   {id:'ma-03',title:'Le prix de l’orgueil',family:'conséquence',combat:false},
   {id:'ma-04',title:'Protéger sans humilier',family:'protection',combat:'optionnel'},
   {id:'ma-05',title:'La dignité des actes',family:'Gardien · valeur',combat:false},
  ],
 },
 espagne:{
  value:'Passion',
  question:'Quand la passion cesse-t-elle de construire pour commencer à consumer ?',
  missionStyle:'poursuite · mouvement · création · action',
  guardian:{name:'Diego',flaw:'Il agit parfois avant de comprendre ce que son intensité provoque chez les autres.',evolution:'Il apprend à transformer l’impulsion en création maîtrisée.'},
  campaign:[
   {id:'es-01',title:'Le moteur rouge',family:'poursuite',combat:false},
   {id:'es-02',title:'Trop vite',family:'événement urbain',combat:'optionnel'},
   {id:'es-03',title:'Ce que l’on brûle',family:'conséquence',combat:false},
   {id:'es-04',title:'Créer au lieu de détruire',family:'création',combat:false},
   {id:'es-05',title:'Maîtriser le feu',family:'Gardien · valeur',combat:'contextuel'},
  ],
 },
};

export const narrativeFor=region=>COUNTRY_NARRATIVE[region]||null;
export const campaignFor=region=>COUNTRY_NARRATIVE[region]?.campaign||[];
