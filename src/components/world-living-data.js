// Canonical presentation layer for the World Living welcome screen.
// Routes point to existing 3B experiences; this file never creates fake services or users.
export const WORLD_MODULE_GROUPS = Object.freeze([
 {id:'all',label:'Tout'},
 {id:'daily',label:'Découvrir'},
 {id:'play',label:'Passions'},
 {id:'member',label:'Communauté'},
 {id:'business',label:'Opportunités'},
]);

export const WORLD_MODULES = Object.freeze([
 {id:'deals',label:'3B Bons Plans',group:'daily',icon:'badge-percent',aliases:['bons plans','offres','reductions']},
 {id:'health',label:'Santé',group:'daily',icon:'heart-pulse',aliases:['sante','bien etre','nutrition','pas','recettes']},
 {id:'religion',label:'3B Religion',group:'daily',icon:'book-open',aliases:['religion','islam','christianisme','judaisme','arbre']},
 {id:'invisible',label:'Monde caché',group:'daily',icon:'eye',aliases:['secret','realite augmentee','monde cache']},
 {id:'world3b',label:'Monde du 3B',group:'daily',icon:'globe-2',aliases:['royaumes','kais','monde 3b']},
 {id:'sport',label:'Sport 3B',group:'play',icon:'trophy',aliases:['sport','football','foot']},
 {id:'manga',label:'Manga 3B',group:'play',icon:'book-image',aliases:['manga','anime']},
 {id:'games',label:'Jeux 3B',group:'play',icon:'gamepad-2',aliases:['jeux','jouer','creer ma ville']},
 {id:'esports',label:'16-18 E-sport',group:'play',icon:'headphones',aliases:['esport','e-sport','gaming','competition','recrutement joueur']},
 {id:'passport',label:'Passeport 3B',group:'member',icon:'id-card',aliases:['passeport','identite']},
 {id:'member',label:'Espace membre',group:'member',icon:'user-round',aliases:['membre','compte','connexion']},
 {id:'loyalty',label:'Carte de fidélité',group:'member',icon:'credit-card',aliases:['fidelite','carte']},
 {id:'shop',label:'Boutique',group:'member',icon:'shopping-bag',aliases:['boutique','vetements','hoodie']},
 {id:'community',label:'Communauté',group:'member',icon:'users',aliases:['communaute','membres','entraide']},
 {id:'ia',label:'Espace tactile IA',group:'member',icon:'sparkles',aliases:['textile','ia','creation textile']},
 {id:'news',label:'Info Actu',group:'daily',icon:'newspaper',aliases:['actualites','actualite','informations','evenements']},
 {id:'association',label:'Association 3B',group:'business',icon:'hand-heart',aliases:['association','solidarite']},
 {id:'partners',label:'Partenaires',group:'business',icon:'handshake',aliases:['partenaires','collaboration','collaborations']},
 {id:'finance',label:'Banque & crypto',group:'business',icon:'landmark',aliases:['banque','crypto','finance']},
 {id:'travel',label:'Voyage 3B',group:'business',icon:'plane',aliases:['voyage','pays','destinations','tourisme']},
 {id:'tv',label:'3B ORIGINS TV',group:'play',icon:'clapperboard',aliases:['television','origins tv','chaine tv','video']},
 {id:'admin',label:'Administratif',group:'business',icon:'file-text',aliases:['administration','administratif','demarches']},
]);

// Additional actual routes are not squeezed out to force an artificial 22-item total.
export const WORLD_MORE_SERVICES = Object.freeze([
 {id:'maintenant',label:'3B Maintenant',aliases:['boussole','coup de main','activités']},
 {id:'foodscan',label:'Scanner alimentaire',aliases:['scanner','nutrition','code barre','allergènes']},
 {id:'cinema',label:'Cinéma 3B',aliases:['films','film','cinéma','séances']},
 {id:'join',label:'Nous recherchons',aliases:['recrutement','rechercher joueur','emploi','collaborateurs']},
 {id:'secret',label:'Premier Secret',aliases:['énigme','mystère','secret']},
 {id:'guide',label:'Guide 3B',aliases:['aide','assistance','débuter','comment faire']},
]);

// These are CANONICAL FICTIONAL realms of Monde du 3B, not operational physical hubs.
export const WORLD_REALMS = Object.freeze([
 {id:'france',name:'France',value:'Justice',guardian:'Céliane',lat:46.6,lon:2.2,flag:'🇫🇷'},
 {id:'algerie',name:'Algérie',value:'Loyauté',guardian:'Yliane',lat:28.0,lon:2.7,flag:'🇩🇿'},
 {id:'maroc',name:'Maroc',value:'Noblesse',guardian:'Naël',lat:31.8,lon:-7.1,flag:'🇲🇦'},
 {id:'tunisie',name:'Tunisie',value:'Courage',guardian:'Soraya',lat:34.0,lon:9.4,flag:'🇹🇳'},
 {id:'espagne',name:'Espagne',value:'Passion',guardian:'Diego',lat:40.4,lon:-3.7,flag:'🇪🇸'},
 {id:'italie',name:'Italie',value:'Espoir',guardian:'Alessio',lat:42.6,lon:12.5,flag:'🇮🇹'},
 {id:'turquie',name:'Turquie',value:'Foi',guardian:'Émir',lat:39.0,lon:35.0,flag:'🇹🇷'},
 {id:'estonie',name:'Estonie',value:'Sagesse',guardian:'Eira',lat:58.8,lon:25.3,flag:'🇪🇪'},
]);

export function normalizeWorldSearch(value){
 return String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('fr').trim();
}

// Search extra real routes too, without pretending there are more than 22 primary tiles.
export function findWorldExtraServices(query=''){
 const words=normalizeWorldSearch(query).split(/\s+/).filter(Boolean);
 if(!words.length)return [];
 return WORLD_MORE_SERVICES.filter(item=>{
  const blob=normalizeWorldSearch([item.id,item.label,...(item.aliases||[])].join(' '));
  return words.every(word=>blob.includes(word));
 });
}

export function findWorldModules({query='',category='all',favorites=[]}={}){
 const words=normalizeWorldSearch(query).split(/\s+/).filter(Boolean);
 const favoriteSet=new Set(favorites);
 return WORLD_MODULES.filter(module=>{
  if(category==='favorites'&&!favoriteSet.has(module.id))return false;
  if(category!=='all'&&category!=='favorites'&&module.group!==category)return false;
  const blob=normalizeWorldSearch([module.id,module.label,...module.aliases].join(' '));
  return words.every(word=>blob.includes(word));
 });
}

export function findAlbertDestination(input){
 const query=normalizeWorldSearch(input);
 if(!query)return null;
 const extra=[
  {id:'foodscan',label:'Scanner alimentaire',aliases:['scanner alimentaire','aliment','code barre','allergene']},
  {id:'cinema',label:'Cinéma 3B',aliases:['cinema','film','streaming']},
  {id:'join',label:'Nous recherchons',aliases:['nous recherchons','offre emploi','recherche joueur','recrutement']},
  {id:'maintenant',label:'3B Maintenant',aliases:['boussole','aujourd hui','maintenant','coup de main']},
  {id:'albert',label:'Albert APEX',aliases:['albert']},
 ];
 const candidates=[...WORLD_MODULES,...extra];
 const words=query.split(/\s+/).filter(Boolean);
 let best=null,score=0;
 for(const mod of candidates){
  const aliases=[mod.label,mod.id,...mod.aliases].map(normalizeWorldSearch);
  let next=0;
  for(const alias of aliases){
   if(alias && (query===alias || query.includes(alias)))next=Math.max(next,alias.length+20);
   else if(alias.length>3 && words.every(word=>alias.includes(word)))next=Math.max(next,words.join('').length);
  }
  if(next>score){score=next;best=mod;}
 }
 return best&&score>=3?{id:best.id,label:best.label}:null;
}

export function albertLocalGuideAnswer(input){
 const query=normalizeWorldSearch(input).slice(0,300);
 if(!query)return {message:'Écris ta demande ou choisis un raccourci. Je peux te guider vers les rubriques 3B.',destination:null};
 if(/^(bonjour|salut|salam|hello|coucou)\b/.test(query))return {message:'Bienvenue dans 3B International ! Dis-moi quel univers tu veux explorer.',destination:null};
 if(/\b(qui es[- ]tu|tu es qui|quel est ton nom|fonctionne comment)\b/.test(query))return {message:'Je suis le guide de navigation 3B. Le moteur personnel Albert APEX n’est pas connecté ici : je ne prétends pas répondre avec lui.',destination:null};
 const destination=findAlbertDestination(query);
 if(destination && destination.id!=='albert')return {message:'Je peux t’ouvrir « '+destination.label+' » dans l’application 3B. Utilise le lien ci-dessous pour accéder à la vraie rubrique.',destination};
 if(/(pays|royaume|carte|monde|planete)/.test(query))return {message:'Les huit royaumes du Monde du 3B sont explorables depuis la carte mondiale. Ils représentent notre univers créatif, pas des hubs physiques vérifiés.',destination:{id:'world3b',label:'Monde du 3B'}};
 return {message:'Je peux t’aider à trouver une rubrique 3B, par exemple Santé, Voyage, Cinéma, Sport, Jeux, Passeport ou Association. Pour une conversation IA générative, utilise le Mode 3 IA déjà présent.',destination:{id:'ia-trio',label:'Mode 3 IA'}};
}
