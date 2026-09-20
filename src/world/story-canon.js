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
