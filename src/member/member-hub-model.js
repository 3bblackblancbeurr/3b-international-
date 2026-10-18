export const MEMBER_HUB_GROUPS=Object.freeze([['all','Tout mon espace'],['identity','Mon identité'],['life','Mon quotidien'],['projects','Mes projets']]);
export const MEMBER_HUB_CARDS=Object.freeze([
 {id:'loyalty',title:'Carte de fidélité',subtitle:'Tes cartes, tes points et tes avantages boutique.',group:'identity',icon:'wallet',tag:'Dans ton espace membre'},
 {id:'passport',title:'Passeport 3B',subtitle:'Ton identité 3B, son apparence et sa progression.',group:'identity',icon:'passport',tag:'Compte 3B'},
 {id:'admin',title:'Mes papiers & démarches',subtitle:'Un coffre chiffré pour tes fichiers et un suivi de tes dossiers.',group:'life',icon:'file',tag:'Coffre privé sur cet appareil'},
 {id:'travel',title:'Mes voyages',subtitle:'Étapes, budget, préparatifs et carnet de route.',group:'life',icon:'plane',tag:'Carnet personnel'},
 {id:'news',title:'Mon fil d’actualité',subtitle:'France et pays du monde, avec une lecture dans 3B.',group:'life',icon:'news',tag:'Sources et dates visibles'},
 {id:'health',title:'Santé & vivant',subtitle:'Nutrition, mouvement, anatomie et capteur compatible.',group:'life',icon:'heart',tag:'Mon rythme'},
 {id:'association',title:'Association 3B',subtitle:'Préparer des projets solidaires et organiser les prochaines actions.',group:'projects',icon:'hands',tag:'Actions & engagement'},
 {id:'finance',title:'Projet banque & crypto',subtitle:'Budget, preuves, autorisations à préparer et prototype du token.',group:'projects',icon:'bank',tag:'Atelier de préparation'},
 {id:'partners',title:'Mes collaborations',subtitle:'Structurer une proposition et suivre les étapes du projet.',group:'projects',icon:'partners',tag:'Réseau & projets'},
 {id:'albert',title:'Albert',subtitle:'Un espace de conversation IA et un guide pour explorer 3B.',group:'projects',icon:'sparkles',tag:'Disponibilité vérifiée à l’ouverture'},
 {id:'tv',title:'Mes médias 3B',subtitle:'Lectures, écoutes et repères de progression.',group:'life',icon:'tv',tag:'À retrouver'},
 {id:'cinema',title:'Mon cinéma',subtitle:'Ta sélection de films, tes notes et tes envies de séance.',group:'life',icon:'film',tag:'Carnet personnel'},
]);
const normalize=value=>String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
export function findMemberHubCards({query='',group='all'}={}){
 const words=normalize(query).split(/\s+/).filter(Boolean);
 return MEMBER_HUB_CARDS.filter(card=>(group==='all'||card.group===group)&&words.every(word=>normalize([card.title,card.subtitle,card.tag].join(' ')).includes(word)));
}
