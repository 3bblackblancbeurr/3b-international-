// Canon narratif central du Monde du 3B.
// Ce fichier décrit l'histoire officielle. Il ne débloque rien et n'accorde aucune récompense.

export const CANON_WORLDS=Object.freeze({
 france:{guardian:'Céliane',value:'Justice'},
 algerie:{guardian:'Yliane',value:'Loyauté'},
 maroc:{guardian:'Naël',value:'Noblesse'},
 tunisie:{guardian:'Soraya',value:'Courage'},
 espagne:{guardian:'Diego',value:'Passion'},
 italie:{guardian:'Alessio',value:'Espoir'},
 turquie:{guardian:'Émir',value:'Foi'},
 estonie:{guardian:'Eira',value:'Sagesse'},
});

export const STORY_CANON=Object.freeze({
 version:1,
 hero:Object.freeze({
  name:'Kaïs',
  role:'Porteur du Lien',
  rule:'Kaïs n’est ni un neuvième Gardien ni le détenteur d’une neuvième valeur.',
  ring:'L’anneau qu’il porte est le connecteur arraché au Cercle lors de la Rupture. Il ne contient aucun fragment : il peut entrer en résonance avec les huit.',
  journey:'Rejeté et isolé au début de son histoire, Kaïs ne devient pas important par son sang ou par un titre. Il le devient parce qu’il choisit de retrouver, protéger et relier des mémoires que l’Oubli sépare.',
 }),
 circle:Object.freeze({
  name:'Le Cercle Brisé',
  purpose:'Le Cercle a été créé pour maintenir huit héritages en relation sans les confondre ni les effacer.',
  eight:'Les huit Portes mènent aux huit derniers ancrages du Monde 3B qui ont conservé une valeur, un Gardien et une mémoire active après la Rupture.',
  rupture:'La Rupture n’a pas été causée par un unique traître. En cherchant à protéger chaque héritage séparément, les anciens liens se sont refermés les uns sur les autres. Le Cercle a cessé de relier et s’est brisé.',
 }),
 oubli:Object.freeze({
  nature:'L’Oubli est une force qui grandit lorsque mémoire, transmission et valeurs sont séparées. Il simplifie, efface et isole jusqu’à faire disparaître le sens des héritages.',
  monster:'Le Monstre de l’Oubli est une manifestation condensée de cette force, formée autour de souvenirs abandonnés lors de la Rupture. Le vaincre ne détruit pas l’Oubli pour toujours.',
  falseAnswer:'L’Oubli n’est pas un peuple, un pays ou une personne secrètement responsable de tout.',
 }),
 finale:Object.freeze({
  requirement:Object.freeze({countries:8,guardians:8,values:8,fragments:8}),
  revelation:'Les huit fragments ne sont pas incomplets. Ce qui manquait au Cercle était le Lien qui permet aux huit de répondre ensemble. L’anneau de Kaïs est ce connecteur.',
  victory:'La victoire finale ne consiste pas à posséder les huit valeurs. Kaïs rend chaque fragment à son héritage, réunit les Gardiens et réactive la transmission entre les huit.',
  aftermath:'Le Cercle restauré garde les traces visibles de ses cassures. Le monde n’est pas rendu parfait : il redevient capable de se souvenir, de transmettre et de continuer.',
  signature:'Ce n’est pas une marque. C’est un héritage.',
 }),
});

export const GUARDIAN_STORIES=Object.freeze({
 france:Object.freeze({
  name:'Céliane',value:'Justice',temperament:'Calme, précise, attentive aux contradictions.',
  flaw:'Elle peut chercher une preuve parfaite si longtemps qu’elle oublie la personne qui souffre devant elle.',
  fear:'Condamner un innocent ou réparer une injustice par une nouvelle injustice.',
  conflict:'Comprendre que la Justice exige trois gestes : écouter, vérifier puis réparer proportionnellement.',
  oubli:'L’Oubli falsifie les témoignages, efface le contexte et transforme les habitants en juges les uns des autres.',
  kais:'Elle se méfie d’abord de l’anneau de Kaïs parce qu’il répond à des mémoires contradictoires ; elle devient la première à comprendre qu’il relie sans décider à la place des autres.',
 }),
 algerie:Object.freeze({
  name:'Yliane',value:'Loyauté',temperament:'Protectrice, directe, très attachée au groupe.',
  flaw:'Elle confond parfois protéger les siens avec les empêcher de partir ou de choisir seuls.',
  fear:'Être abandonnée au moment où le groupe a le plus besoin d’unité.',
  conflict:'Apprendre que la Loyauté n’est ni l’obéissance aveugle ni le silence : elle peut exiger de dire une vérité difficile.',
  oubli:'L’Oubli fabrique de faux signes de trahison et pousse chacun à soupçonner les autres.',
  kais:'Kaïs lui montre qu’un lien reste loyal même lorsqu’il laisse à l’autre une porte de sortie.',
 }),
 maroc:Object.freeze({
  name:'Naël',value:'Noblesse',temperament:'Digne, mesuré, attaché au geste juste et au savoir-faire.',
  flaw:'Sa fierté peut l’empêcher de demander de l’aide ou de montrer qu’il doute.',
  fear:'Être humilié, ou humilier quelqu’un en croyant l’aider.',
  conflict:'Découvrir que la Noblesse se mesure davantage à la manière de traiter quelqu’un sans pouvoir qu’à la manière de se présenter devant ses égaux.',
  oubli:'L’Oubli transforme la dignité en hiérarchie et le don en dette.',
  kais:'Il apprend à Kaïs à transmettre sans écraser ; Kaïs lui apprend qu’accepter de recevoir peut aussi préserver la dignité.',
 }),
 tunisie:Object.freeze({
  name:'Soraya',value:'Courage',temperament:'Rapide, volontaire, première à avancer lorsqu’un danger apparaît.',
  flaw:'Elle peut agir trop vite pour ne pas laisser voir qu’elle a peur.',
  fear:'Rester immobile pendant que quelqu’un d’autre paie le prix.',
  conflict:'Distinguer le Courage de la témérité : préparer, intervenir, puis assumer les conséquences.',
  oubli:'L’Oubli amplifie soit la panique, soit l’envie de foncer sans réfléchir.',
  kais:'Kaïs comprend avec elle que reconnaître sa peur ne retire rien au courage ; cela permet de choisir malgré elle.',
 }),
 espagne:Object.freeze({
  name:'Diego',value:'Passion',temperament:'Intense, créatif, expressif, capable d’entraîner une foule.',
  flaw:'Il peut confondre intensité et justesse et pousser un geste trop loin.',
  fear:'Que tout devienne froid, indifférent et sans désir de créer.',
  conflict:'Transformer l’émotion en création et en maîtrise plutôt qu’en destruction ou en épuisement.',
  oubli:'L’Oubli pousse les émotions jusqu’à la frénésie, puis laisse derrière lui fatigue et vide.',
  kais:'Diego oblige Kaïs à cesser de seulement contenir ce qu’il ressent ; Kaïs lui rappelle qu’une passion qui dure doit savoir se maîtriser.',
 }),
 italie:Object.freeze({
  name:'Alessio',value:'Espoir',temperament:'Patient, bâtisseur, capable de recommencer après un échec.',
  flaw:'Il peut masquer une perte réelle derrière un optimisme trop rapide.',
  fear:'Admettre qu’une chose aimée ne reviendra jamais exactement comme avant.',
  conflict:'Comprendre que l’Espoir n’efface pas la perte : il ouvre une possibilité nouvelle à partir de ce qui reste.',
  oubli:'L’Oubli répète que tout ce qui est cassé est définitivement perdu ou doit être reconstruit à l’identique.',
  kais:'Alessio apprend à Kaïs qu’un héritage vivant peut changer de forme sans être trahi.',
 }),
 turquie:Object.freeze({
  name:'Émir',value:'Foi',temperament:'Posé, constant, fidèle à sa parole.',
  flaw:'Il peut chercher trop de certitude et prendre le doute pour une faiblesse.',
  fear:'Agir sans garantie et découvrir qu’il s’est trompé.',
  conflict:'Accepter que la Foi puisse traverser la question et le doute tout en restant cohérente dans l’action.',
  oubli:'L’Oubli transforme l’incertitude soit en rigidité, soit en paralysie.',
  kais:'Kaïs lui montre qu’un lien peut être réel avant d’être entièrement compris ; Émir apprend à Kaïs à avancer sans inventer de fausses certitudes.',
 }),
 estonie:Object.freeze({
  name:'Eira',value:'Sagesse',temperament:'Observatrice, silencieuse, excellente pour relier des indices dispersés.',
  flaw:'Elle peut analyser si longtemps qu’elle devient extérieure à ce qui arrive.',
  fear:'Prendre une décision irréversible sur une compréhension incomplète.',
  conflict:'Comprendre que la Sagesse n’est pas seulement savoir attendre : elle doit aussi reconnaître le moment où il faut agir.',
  oubli:'L’Oubli produit du bruit, de faux motifs et trop d’informations pour empêcher toute décision.',
  kais:'Eira aide Kaïs à distinguer mémoire, interprétation et preuve ; Kaïs lui rappelle qu’un lien n’existe que s’il est vécu.',
 }),
});

export const FRANCE_CANON_ARC=Object.freeze({
 title:'Les noms effacés',
 acts:Object.freeze([
  {id:'justice-01',title:'Les voix effacées',purpose:'Rencontrer les habitants, retrouver la première trace et comprendre qu’un jugement sans écoute nourrit l’Oubli.'},
  {id:'justice-02',title:'Les deux plateaux',purpose:'Apprendre que la Justice ne se porte pas seul et ouvrir les Archives par une action coordonnée.'},
  {id:'justice-03',title:'Ce qui nous relie',purpose:'Réunir les deux témoignages, dissiper la manifestation de l’Oubli et restituer le fragment de Justice.'},
 ]),
});

export const STORY_ACTS=Object.freeze([
 {id:'prologue',title:'Kaïs',purpose:'Naissance, rejet, fuite, première rencontre avec le Monstre de l’Oubli et découverte de l’anneau.'},
 {id:'circle',title:'Le Cercle Brisé',purpose:'Éveil du Nexus, découverte des huit Portes et première compréhension des Souvenirs.'},
 {id:'france',title:'France · Justice',purpose:'Première restauration complète et première preuve que le monde peut réellement changer.'},
 {id:'heritages',title:'Les sept autres héritages',purpose:'Restaurer les sept autres pays, comprendre leurs valeurs et ramener leurs Gardiens.'},
 {id:'guardians',title:'Les huit Gardiens réunis',purpose:'La Cité devient le lieu où les huit héritages peuvent enfin se répondre.'},
 {id:'oubli-truth',title:'La véritable histoire de l’Oubli',purpose:'Découvrir que l’Oubli est une conséquence de la rupture des liens, pas un ennemi extérieur unique.'},
 {id:'kais-truth',title:'La vérité sur Kaïs',purpose:'Révéler que son anneau est le connecteur du Cercle et qu’il est Porteur du Lien, pas neuvième Gardien.'},
 {id:'finale',title:'Dernière confrontation',purpose:'Affronter la manifestation centrale de l’Oubli pendant que les huit Gardiens réactivent leurs ancrages.'},
 {id:'restored-circle',title:'Le Cercle retrouvé',purpose:'Rendre les fragments à leurs héritages et restaurer la transmission entre les huit.'},
 {id:'epilogue',title:'Un héritage vivant',purpose:'Le monde reste ouvert : reconstruction, Ville 3B, missions, secrets, coopération et transmission continuent.'},
]);

export const STORY_REVELATIONS=Object.freeze([
 {after:1,title:'Premier doute',truth:'L’Oubli imite parfois des voix disparues : il utilise ce qui n’a pas été transmis.'},
 {after:2,title:'Le Cercle est plus ancien',truth:'Les Portes n’ont pas été créées pour enfermer les pays, mais pour maintenir leurs mémoires en relation.'},
 {after:4,title:'Aucun Gardien ne possède sa valeur',truth:'Les Gardiens sont des dépositaires. Justice, Loyauté, Noblesse, Courage, Passion, Espoir, Foi et Sagesse n’appartiennent à personne.'},
 {after:6,title:'L’anneau répond aux huit',truth:'L’anneau de Kaïs n’est lié à aucun pays en particulier et résonne avec chaque fragment.'},
 {after:7,title:'Il n’y a pas eu de traître unique',truth:'La Rupture est née de l’isolement progressif des héritages et de la peur de perdre ce qui devait être transmis.'},
 {after:8,title:'Le Lien manquant',truth:'Les huit fragments sont complets. Le connecteur du Cercle était séparé depuis la Rupture : Kaïs le porte depuis le début.'},
]);

export function canonWorld(id){return CANON_WORLDS[id]||null;}
export function revelationForRestoredCount(count){return [...STORY_REVELATIONS].reverse().find(item=>count>=item.after)||null;}
