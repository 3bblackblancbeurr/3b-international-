import {COUNTRIES} from '../catalog.js';
import {GUARDIAN_VALUES} from '../guardian-values.js';

export const INVISIBLE_REALMS=Object.freeze(COUNTRIES.map(({id,name})=>Object.freeze({id,name,value:GUARDIAN_VALUES[id].value})));

// These positions describe a story diagram, never a GPS destination or a verified walking route.
export const INVISIBLE_EPISODE=Object.freeze({
 id:'leman-001',
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
   riddle:{question:'Sur une eau calme, je copie le ciel sans le voler. Je change quand la lumière change, mais je ne garde aucune image. Qui suis-je ?',clue:'Le miroir de l’eau montre une image : cherche le nom de cette image.',answers:['reflet','le reflet','un reflet']},
   story:'Le reflet se sépare du signal. Céliane murmure : « Une image ressemble à la vérité ; elle ne suffit pas à la prouver. Cherche maintenant ce qui permet de peser deux versions. »',
  }),
  Object.freeze({
   id:'balance',name:'Les deux plateaux',position:{x:51,y:36},
   description:'Repère narratif : un point de vue public, sans escalade ni accès à un site fermé. Les deux plateaux existent uniquement dans le récit.',
   riddle:{question:'J’ai deux plateaux et aucune assiette. Quand aucun côté ne l’emporte, je suis en équilibre. Quel objet suis-je ?',clue:'Cet objet pèse et devient aussi un symbole de la justice.',answers:['balance','la balance','une balance']},
   story:'La balance lumineuse se stabilise. « Écouter les deux côtés est un début, dit Céliane. Pour décider, il faut encore un indice que chacun puisse vérifier. »',
  }),
  Object.freeze({
   id:'preuve',name:'Les six mots',position:{x:78,y:62},
   description:'Repère narratif : une place publique. L’archive invisible est une page de fiction, disponible ici sans entrer dans un bâtiment.',
   riddle:{question:'Six mots apparaissent dans cet ordre : Partager, Respecter, Écouter, Unir, Vérifier, Équilibrer. Lis uniquement leur première lettre. Quel mot de six lettres obtiens-tu ?',clue:'Conserve l’ordre des six mots et réunis leurs initiales.',answers:['preuve','la preuve','une preuve']},
   story:'P · R · E · U · V · E : le mot éclaire les trois traces. Céliane te remet la clé d’un coffre virtuel. « La Justice écoute, vérifie et répare. Ce fragment portera ce souvenir. »',
  }),
 ]),
});
