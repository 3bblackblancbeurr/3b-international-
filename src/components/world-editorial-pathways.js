export const WORLD_EDITORIAL_PATHWAYS=Object.freeze({
 world:{
   label:'POUR COMMENCER LE VOYAGE',title:'Un monde de possibilités',
   items:[
    {id:'news',title:'Info & actualités',subtitle:'Découvrir les informations 3B',icon:'newspaper',number:'01'},
    {id:'travel',title:'Voyager avec 3B',subtitle:'Explorer les destinations',icon:'plane',number:'02'},
    {id:'deals',title:'Les bons plans',subtitle:'Retrouver les avantages du jour',icon:'badge-percent',number:'03'}
   ]
 },
 realms:{
   label:'LA PORTE DES HUIT ROYAUMES',title:'Entrez dans la légende',
   items:[
    {id:'world3b',title:'Les huit royaumes',subtitle:'Justice, Loyauté, Noblesse…',icon:'compass',number:'01'},
    {id:'games',title:'Les Jeux 3B',subtitle:'Jouer et explorer',icon:'globe',number:'02'},
    {id:'manga',title:'Manga 3B',subtitle:'Les autres univers créatifs',icon:'book',number:'03'}
   ]
 },
 community:{
   label:'UNE COMMUNAUTÉ À CONSTRUIRE',title:'Vos liens, votre univers',
   items:[
    {id:'passport',title:'Passeport 3B',subtitle:'Votre point d’entrée unique',icon:'id-card',number:'01'},
    {id:'community',title:'Communauté',subtitle:'Partage et échanges',icon:'users',number:'02'},
    {id:'association',title:'Association 3B',subtitle:'Projets et entraide',icon:'hand-heart',number:'03'}
   ]
 },
 opportunities:{
   label:'DÉCOUVRIR · ENTREPRENDRE',title:'Faites avancer vos projets',
   items:[
    {id:'partners',title:'Collaborations',subtitle:'Partenaires et initiatives',icon:'handshake',number:'01'},
    {id:'join',title:'Nous recherchons',subtitle:'Voir les opportunités proposées',icon:'briefcase',number:'02'},
    {id:'travel',title:'Voyage 3B',subtitle:'Explorer les possibilités',icon:'plane',number:'03'}
   ]
 }
});

export function getWorldEditorialPathways(tab='world'){
 return WORLD_EDITORIAL_PATHWAYS[tab]||WORLD_EDITORIAL_PATHWAYS.world;
}

