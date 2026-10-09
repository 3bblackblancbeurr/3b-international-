import {COUNTRIES} from '../catalog.js';
import {GUARDIAN_VALUES} from '../guardian-values.js';

export const INVISIBLE_REALMS=Object.freeze(COUNTRIES.map(({id,name})=>Object.freeze({id,name,value:GUARDIAN_VALUES[id].value})));

// These positions describe a story diagram, never a GPS destination or a verified walking route.
const franceEpisode={
 id:'leman-001',
 realm:'france',city:'Thonon-les-Bains',icon:'◈',
 title:'Le Fragment englouti',
 guardian:GUARDIAN_VALUES.france.name,
 description:'Épisode 001 · Le secret du Léman. Une fiction originale située à Thonon-les-Bains : Céliane, Gardienne de la Justice, te confie trois traces à relier. Les points de la carte sont des repères narratifs indicatifs ; aucune entrée dans un bâtiment ni approche de l’eau n’est nécessaire.',
 fiction:'Fiction originale inspirée d’un lieu réel. Les indices, le coffre et le portail sont entièrement virtuels ; aucun fait historique n’est affirmé.',
 safety:'Tu peux tout résoudre à distance. Pour une promenade, choisis uniquement un espace public ouvert et accessible, reste loin du bord de l’eau et arrête-toi avant de lire. Range ton téléphone avant de traverser une route. Aucun point de cette carte ne justifie de franchir une clôture ou une interdiction.',
 fragment:{id:'justice-leman',name:'Fragment de la Justice',value:'Justice',realm:'france'},
 rewards:{xp:120,shards:30},
 points:Object.freeze([
  Object.freeze({
   id:'rive',name:'La trace du miroir',position:{x:24,y:65},
   description:'Repère narratif : une promenade publique, si elle est ouverte et accessible. L’observation du paysage est facultative ; tout l’indice est donné ici.',
   riddle:{question:'Sur une eau calme, je copie le ciel sans le voler. Je change quand la lumière change, mais je ne garde aucune image. Qui suis-je ?',clue:'Le miroir de l’eau montre une image : cherche le nom de cette image.',answers:['reflet','le reflet','un reflet'],options:['Reflet','Ombre','Souvenir']},
   story:'Le reflet se sépare du signal. Céliane murmure : « Une image ressemble à la vérité ; elle ne suffit pas à la prouver. Cherche maintenant ce qui permet de peser deux versions. »',
  }),
  Object.freeze({
   id:'balance',name:'Les deux plateaux',position:{x:51,y:36},
   description:'Repère narratif : un point de vue public, sans escalade ni accès à un site fermé. Les deux plateaux existent uniquement dans le récit.',
   riddle:{question:'J’ai deux plateaux et aucune assiette. Quand aucun côté ne l’emporte, je suis en équilibre. Quel objet suis-je ?',clue:'Cet objet pèse et devient aussi un symbole de la justice.',answers:['balance','la balance','une balance'],options:['Balance','Boussole','Sablier']},
   story:'La balance lumineuse se stabilise. « Écouter les deux côtés est un début, dit Céliane. Pour décider, il faut encore un indice que chacun puisse vérifier. »',
  }),
  Object.freeze({
   id:'preuve',name:'Les six mots',position:{x:78,y:62},
   description:'Repère narratif : une place publique. L’archive invisible est une page de fiction, disponible ici sans entrer dans un bâtiment.',
   riddle:{question:'Six mots apparaissent dans cet ordre : Partager, Respecter, Écouter, Unir, Vérifier, Équilibrer. Lis uniquement leur première lettre. Quel mot de six lettres obtiens-tu ?',clue:'Conserve l’ordre des six mots et réunis leurs initiales.',answers:['preuve','la preuve','une preuve'],options:['Preuve','Rumeur','Verdict']},
   story:'P · R · E · U · V · E : le mot éclaire les trois traces. Céliane te remet la clé d’un coffre virtuel. « La Justice écoute, vérifie et répare. Ce fragment portera ce souvenir. »',
  }),
 ]),
};

const fiction='Fiction originale située dans une ville réelle. Les lieux narratifs, les indices, le coffre et le portail sont inventés ; aucun fait historique n’est affirmé. La carte est un schéma sans coordonnées géographiques.';
const safety='Tout se résout à distance avec les indices affichés. Pour une promenade facultative, choisis un espace public ouvert et accessible, arrête-toi pour lire et range ton téléphone avant de traverser. Aucun repère ne demande d’entrer dans un bâtiment, de franchir une clôture ou d’approcher un danger.';
const positions=[{x:24,y:65},{x:51,y:36},{x:78,y:62}];
const point=(id,name,question,clue,answers,options,story)=>({id,name,description:'Repère de fiction disponible ici. Si tu te promènes, reste dans un espace public accessible de ton choix ; aucun lieu précis n’est requis.',riddle:{question,clue,answers,options},story});
const episode=(id,realm,city,title,icon,description,points)=>({
 id,realm,city,title,icon,guardian:GUARDIAN_VALUES[realm].name,
 description,fiction,safety,
 fragment:{id:realm+'-fragment-001',name:(realm==='italie'?'Fragment de l’':realm==='tunisie'?'Fragment du ':'Fragment de la ')+GUARDIAN_VALUES[realm].value,value:GUARDIAN_VALUES[realm].value,realm},
 rewards:{xp:120,shards:30},
 points:points.map((row,index)=>({...row,position:{...positions[index]}})),
});
const deepFreeze=value=>{
 if(value&&typeof value==='object'){
  Object.values(value).forEach(deepFreeze);if(!Object.isFrozen(value))Object.freeze(value);
 }
 return value;
};

// The adventures share the eight existing Guardians. Values describe the fiction,
// never the character of a country or its inhabitants.
export const INVISIBLE_EPISODES=deepFreeze([
 franceEpisode,
 episode('alger-001','algerie','Alger','Le Fil qui tient','⌁',
  'Dans un Alger imaginaire superposé à la ville réelle, Yliane entend un fil de lumière se défaire. Retrouve trois mots pour réparer ce lien sans retenir personne contre sa volonté.',[
   point('corde','Les fibres réunies',
    'Le Gardien montre plusieurs fils torsadés ensemble. Ils forment un objet souple qui sert à attacher, mais ne possède aucun maillon métallique. Comment appelle-t-on cet objet ?',
    'Une chaîne a des maillons ; cet objet est fait de fils ou de fibres.',
    ['corde','une corde','la corde'],['Corde','Chaîne','Ruban'],
    'Les fibres deviennent une corde de lumière. Yliane en laisse une extrémité libre : « Un lien tient parce qu’on en prend soin, pas parce qu’on empêche l’autre de partir. »'),
   point('promesse','Le mot donné',
    'Sur huit cases, place ces lettres dans l’ordre indiqué : P, R, O, M, E, S, S, E. Quel mot de huit lettres nomme un engagement que l’on donne à quelqu’un ?',
    'Il y a bien huit lettres affichées : réunis-les sans changer leur ordre.',
    ['promesse','une promesse','la promesse'],['Promesse','Souvenir','Compromis'],
    'La promesse répare une première rupture. Yliane te demande de garder la parole donnée et de dire la vérité si elle devient impossible à tenir.'),
   point('ancre','Le poids du lien',
    'Dans le récit, un bateau virtuel veut rester au même endroit. Il descend dans l’eau un objet lourd relié à une chaîne. Quel est cet objet ?',
    'Ce n’est ni une voile pour avancer ni un gouvernail pour tourner.',
    ['ancre','une ancre','l ancre',"l’ancre","l'ancre"],['Ancre','Gouvernail','Voile'],
    'L’ancre imaginaire stabilise le signal. Yliane ouvre la voie du coffre : « La Loyauté offre un point d’appui ; elle sait aussi relever l’ancre quand il faut avancer ensemble. »'),
  ]),
 episode('rabat-001','maroc','Rabat','La Main sans couronne','◇',
  'À Rabat, dans une fiction qui ne désigne aucun monument, Naël découvre une couronne vide. Trois inscriptions invitent à retrouver la Noblesse dans les gestes plutôt que dans les titres.',[
   point('respect','La place de chacun',
    'Les lettres R, E, S, P, E, C, T s’allument dans cet ordre. Quel mot forment-elles, pour nommer l’attention due à chacun même sans avantage à gagner ?',
    'Réunis les sept lettres. Le mot commence par RES et finit par PECT.',
    ['respect','le respect'],['Respect','Prestige','Politesse'],
    'Le respect donne une place à chaque silhouette du récit. Naël retire les marches qui distinguaient les titres : « Nul n’a besoin de s’incliner pour être entendu. »'),
   point('don','Ce qui ne réclame rien',
    'Naël propose une devinette de trois lettres : je peux être offert librement, sans prix ni dette exigée en retour. Je commence par D et je termine par N. Quel mot suis-je ?',
    'Un prêt doit être rendu et un achat a un prix ; ici, le geste est gratuit.',
    ['don','un don','le don'],['Don','Prêt','Troc'],
    'Le don éclaire une main ouverte. « Aider ne donne pas le droit d’humilier, rappelle Naël. La personne reste libre de recevoir ou de refuser. »'),
   point('dignite','La valeur sans classement',
    'Deux mots sont proposés : DIGNITÉ et RANG. Choisis celui qui désigne la valeur que chaque personne conserve, même lorsqu’elle n’a ni titre ni richesse.',
    'Un rang classe les personnes. L’autre mot ne dépend d’aucun classement.',
    ['dignite','la dignite'],['Dignité','Rang','Renommée'],
    'La dignité transforme la couronne en cercle ouvert. Naël confie la clé du coffre : « La Noblesse n’élève pas quelqu’un au-dessus des autres ; elle élève la qualité de son geste. »'),
  ]),
 episode('tunis-001','tunisie','Tunis','La Lanterne du passage','✦',
  'Dans un Tunis de fiction, Soraya protège une lanterne que le vent des inquiétudes fait vaciller. Les trois épreuves se jouent ici, sans déplacement risqué : retrouver son calme, avancer avec mesure et créer un refuge.',[
   point('souffle','Le vent intérieur',
    'Je sors doucement quand tu expires et j’entre quand tu inspires. Pour cette énigme, cherche le nom de sept lettres qui commence par SOU et finit par FFLE. Quel est ce mot ?',
    'Le mot parle de l’air de la respiration, pas du vent extérieur.',
    ['souffle','le souffle','un souffle'],['Souffle','Murmure','Frisson'],
    'Le souffle calme la flamme virtuelle. Soraya laisse le temps de regarder : « Avoir peur ne retire rien au Courage. On peut préparer son geste. »'),
   point('pas','La petite avancée',
    'Dans cette simulation, le chemin lumineux mesure quatre unités. Un pas virtuel fait avancer d’une unité. Après trois pas, combien de pas reste-t-il pour atteindre la fin ? Réponds par le nombre.',
    'Soustrais les trois unités déjà parcourues des quatre unités du chemin.',
    ['1','un','un pas','1 pas'],['1','2','4'],
    'Un dernier pas virtuel rejoint la plateforme sûre. Soraya dit : « Avancer avec mesure vaut mieux que confondre le Courage et la précipitation. »'),
   point('abri','Le refuge ouvert',
    'Réunis les deux syllabes affichées sur la lanterne : A et BRI. Quel mot nomme un endroit où l’on peut se mettre à l’écart d’un danger ?',
    'Lis A puis BRI ; le résultat comporte quatre lettres.',
    ['abri','un abri','l abri',"l’abri","l'abri"],['Abri','Arme','Alarme'],
    'L’abri du récit accueille les silhouettes. Soraya te donne la clé : « Le Courage peut aussi demander de l’aide et protéger. Il n’a pas besoin de mettre quelqu’un en danger pour exister. »'),
  ]),
 episode('barcelone-001','espagne','Barcelone','La Partition des braises','♫',
  'Dans une Barcelone imaginaire, Diego trouve une partition dont les notes se sont changées en braises. Aide-le à transformer leur intensité en création sans laisser la lumière tout consumer.',[
   point('rythme','La pulsation réglée',
    'Une pulsation régulière revient toutes les deux secondes dans cette partition fictive. Quel mot de six lettres, commençant par R et finissant par ME, nomme l’organisation des durées en musique ?',
    'Ce mot décrit la cadence des notes ; il ne nomme ni leur volume ni leur hauteur.',
    ['rythme','le rythme','un rythme'],['Rythme','Volume','Mélodie'],
    'Le rythme rassemble les braises au lieu de les disperser. Diego sourit : « L’intensité peut trouver une forme qui laisse aussi de la place aux autres. »'),
   point('creation','Le feu transformé',
    'Diego assemble les trois morceaux CRÉ, A et TION. Quel mot de huit lettres obtient-il pour nommer le fait de donner forme à quelque chose de nouveau ?',
    'Lis les trois morceaux dans l’ordre ; garde toutes les lettres.',
    ['creation','la creation','une creation'],['Création','Imitation','Destruction'],
    'La création devient une œuvre lumineuse. « Une émotion forte peut devenir un dessin, une chanson ou un projet, dit Diego. Elle ne commande pas nos gestes. »'),
   point('pause','Le silence choisi',
    'Une mesure de cette partition a quatre temps. Trois portent une note ; le quatrième porte le mot PAUSE. Combien de temps de pause contient cette mesure ? Réponds par le nombre.',
    'Compte seulement les temps où aucune note n’est jouée.',
    ['1','un','un temps','1 temps'],['1','3','4'],
    'La pause empêche la dernière braise de déborder. Diego remet la clé : « La Passion reste vivante quand on sait aussi choisir un silence et respecter sa limite. »'),
  ]),
 episode('rome-001','italie','Rome','Le Jardin des possibles','❀',
  'À Rome, dans un jardin entièrement inventé, Alessio veille sur une pousse invisible. Trois signes montrent que l’Espoir peut ouvrir une possibilité sans promettre un résultat certain.',[
   point('graine','Le commencement minuscule',
    'Dans le jardin du récit, je suis petite avant de germer. Je peux devenir une plante avec de l’eau et des conditions adaptées. Quel mot de six lettres suis-je ?',
    'Une fleur apparaît plus tard ; ce commencement peut se semer.',
    ['graine','une graine','la graine'],['Graine','Fleur','Racine'],
    'La graine virtuelle reçoit un peu de lumière. Alessio ne garantit pas sa croissance : « L’Espoir commence parfois par donner une chance à ce qui n’a pas encore pris forme. »'),
   point('demain','La page suivante',
    'Le carnet du jardin porte trois pages : HIER, AUJOURD’HUI, puis un mot manquant. Quel mot de six lettres désigne le jour qui suit aujourd’hui ?',
    'Le mot commence par DE et se termine par MAIN.',
    ['demain'],['Demain','Hier','Jamais'],
    'La page demain révèle un autre chemin. Alessio dit : « La première tentative peut échouer. Cherchons ce qu’elle apprend avant de choisir la suivante. »'),
   point('horizon','La ligne des possibles',
    'Sur un paysage dessiné, une ligne semble séparer le ciel et la terre. Elle recule à mesure qu’on avance et n’est jamais un mur à franchir. Comment nomme-t-on cette ligne ?',
    'Le mot comporte sept lettres et commence par HOR.',
    ['horizon','l horizon',"l’horizon","l'horizon"],['Horizon','Frontière','Sommet'],
    'L’horizon ouvre le coffre du jardin. Alessio te confie son fragment : « L’Espoir n’efface pas l’obstacle. Il aide à chercher une possibilité et à soutenir quelqu’un qui continue. »'),
  ]),
 episode('istanbul-001','turquie','Istanbul','Le Pont de la parole','⌘',
  'Dans une Istanbul de fiction, Émir écoute un pont de mots qui s’interrompt au milieu d’une phrase. Sa Foi signifie ici tenir une conviction ouverte aux questions et la traduire en actes cohérents.',[
   point('parole','La phrase confiée',
    'Émir écrit PA sur une tuile et ROLE sur une autre. Assemble-les dans cet ordre. Quel mot de six lettres peut-on donner à quelqu’un lorsqu’on s’engage ?',
    'Ce mot s’entend dans « tenir sa … ».',
    ['parole','la parole','sa parole'],['Parole','Prestance','Silence'],
    'La parole forme le premier arc du pont. Émir précise : « La garder compte même quand personne ne vérifie. Si elle devient impossible, il faut le dire et chercher une réparation. »'),
   point('doute','La question permise',
    'Le carnet propose un mot de cinq lettres : D, O, U, T, E. Réunis-les. Quel mot désigne l’incertitude qui invite à poser une question plutôt qu’à prétendre tout savoir ?',
    'Lis les lettres dans l’ordre. La question ne détruit pas le pont.',
    ['doute','le doute','un doute'],['Doute','Déni','Certitude'],
    'Le doute fait apparaître une fenêtre dans le pont. Émir accueille la question : « La Foi de ce récit ne demande pas de fermer les yeux. Interroger peut rendre un engagement plus lucide. »'),
   point('coherence','Le geste accordé',
    'Émir dit « je partagerai la lumière », puis la partage réellement. Quel mot désigne l’accord entre sa parole et son action : cohérence, contradiction ou hasard ?',
    'La parole et l’action vont dans le même sens.',
    ['coherence','la coherence'],['Cohérence','Contradiction','Hasard'],
    'La cohérence complète le pont virtuel et révèle le coffre. Émir te confie le fragment : « Agir avec mesure et tenir une parole ouverte aux questions : voilà la Foi que je transmets. »'),
  ]),
 episode('tallinn-001','estonie','Tallinn','La Chambre des questions','⌕',
  'Dans une Tallinn inventée entre deux pages, Eira garde une chambre aux fenêtres lumineuses. Les indices restent visibles ici ; leur sens apparaît quand on observe, relie et prend du recul.',[
   point('observation','La fenêtre attentive',
    'Eira montre quatre symboles dans cet ordre : cercle, triangle, cercle, carré. Combien de cercles sont visibles ? Réponds par le nombre avant de tirer une conclusion.',
    'Compte le premier et le troisième symbole.',
    ['2','deux','deux cercles','2 cercles'],['2','3','4'],
    'Les deux cercles restent visibles, sans rien ajouter à ce qui a été observé. Eira dit : « La Sagesse commence par distinguer ce qu’on voit de ce qu’on imagine. »'),
   point('lien','Les signes rapprochés',
    'Deux fragments d’une phrase portent LI et EN. Assemble-les dans cet ordre. Quel mot de quatre lettres nomme ce qui relie deux éléments ?',
    'LI suivi de EN ; aucune lettre ne manque.',
    ['lien','un lien','le lien'],['Lien','Écart','Bloc'],
    'Le lien rapproche les deux fenêtres. Eira ajoute : « Une ressemblance propose une piste ; vérifions encore ce qui la soutient avant d’en faire une certitude. »'),
   point('recul','La distance utile',
    'Une note écrit RE puis CUL. Assemble ces deux morceaux. Quel mot de cinq lettres nomme la distance que l’on prend pour examiner un choix avec plus de calme ?',
    'On dit « prendre du … » avant une décision.',
    ['recul','du recul','le recul'],['Recul','Retard','Refus'],
    'Le recul remet les fenêtres à leur juste place. Eira ouvre l’accès au coffre : « La Sagesse relie et mesure, puis choisit. Prendre du recul ne signifie pas renoncer à agir. »'),
  ]),
]);

export const INVISIBLE_EPISODE_BY_ID=Object.freeze(Object.fromEntries(INVISIBLE_EPISODES.map(item=>[item.id,item])));
export const INVISIBLE_EPISODE=INVISIBLE_EPISODE_BY_ID['leman-001'];
export const getInvisibleEpisode=id=>Object.hasOwn(INVISIBLE_EPISODE_BY_ID,id)?INVISIBLE_EPISODE_BY_ID[id]:INVISIBLE_EPISODE;

export const INVISIBLE_CONVERGENCE=deepFreeze({
 id:'convergence-eight-v1',title:'La Convergence des huit fragments',
 description:'Tes huit fragments ouvrent une dernière page du récit. Ils se relient sans remplacer les valeurs des Gardiens ni accorder leurs sceaux. Cette fin personnelle reste indépendante de la mission coopérative.',
 question:'Les huit fragments éclairent huit mots dans cet ordre : Écouter, Nourrir, Soutenir, Examiner, Maintenir, Bâtir, Lier, Encourager. Lis leur première lettre. Quel mot de huit lettres les relie ?',
 clue:'Garde l’ordre des huit mots. Les initiales commencent par E, N, S et finissent par L, E.',
 answers:['ensemble'],options:['Ensemble','Solitude','Victoire'],
 story:'ENSEMBLE : les huit lumières se rejoignent. Les Gardiens transmettent leurs valeurs sans les confondre. Le chemin que tu as ouvert appartient maintenant au Monde Invisible du 3B, et d’autres aventures pourront y trouver leur place.',
 rewards:{xp:240,shards:60},
});
