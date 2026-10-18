import {WORLD_MODULES,WORLD_MORE_SERVICES,findAlbertDestination,normalizeWorldSearch} from '../components/world-living-data.js';
const DETAILS=Object.freeze({
 member:'La carte de fidélité est maintenant dans ton espace membre, avec tes points et tes avantages. Je ne lis ni ton compte ni tes documents.',
 admin:'Mes papiers & démarches rassemble le suivi des dossiers et un coffre chiffré sur cet appareil. Les impôts, France Travail et les autres administrations demandent leurs propres connexions autorisées ; aucun document ne leur est envoyé automatiquement.',
 news:'Info Actu permet de lire les titres et les extraits disponibles dans 3B. Les éditeurs et les dates restent visibles. La couverture des pays dépend des sources réellement disponibles.',
 finance:'L’atelier prépare le budget, les partenaires, les preuves et les autorisations de la banque et du token. Le prototype crypto se vérifie localement. Il ne crée pas de compte bancaire réel et ne déploie pas de token public.',
 health:'Santé rassemble l’anatomie, l’alimentation et le mouvement. Un capteur cardiaque Bluetooth compatible peut être choisi dans cet espace. Je ne reçois aucune mesure de santé.',
 association:'Association 3B aide à préparer les engagements, les actions, leur budget et les pièces du projet. Une préparation dans l’application ne vaut pas déclaration officielle.',
 religion:'Dans l’arbre, la vue Schéma aide à suivre les filiations et les relations documentées. La recherche et la sélection restent communes aux vues.',
 games:'Les jeux ont chacun une illustration de la même collection. Choisis une fiche pour voir son fonctionnement et son état de disponibilité.',
 albert:'Albert ouvre une conversation IA quand le service est activé et ton compte connecté. Sa disponibilité est vérifiée dans son espace. Ici, mes repères et mes animations fonctionnent localement.',
 travel:'Le carnet Voyage organise tes étapes, ton budget et tes préparatifs. Les réservations restent à effectuer auprès du prestataire choisi.',
 cinema:'Cinéma rassemble tes envies de films, tes notes et ta sélection. Tu gardes la maîtrise de ton carnet.',
 partners:'L’atelier Collaborations structure un brief et ses étapes. Tu choisis ensuite si tu souhaites contacter un partenaire.',
});
export const COMPANION_EXPLORER=Object.freeze([
 {page:'member',label:'Mon espace membre',hint:'Carte de fidélité & compte'},
 {page:'admin',label:'Mes papiers',hint:'Coffre privé & démarches'},
 {page:'news',label:'Info Actu',hint:'Lire dans 3B'},
 {page:'health',label:'Santé & vivant',hint:'Anatomie & capteur compatible'},
 {page:'association',label:'Association',hint:'Engagements & projets'},
 {page:'finance',label:'Banque & crypto',hint:'Préparer le projet'},
 {page:'religion',label:'Arbre & schéma',hint:'Comprendre les relations'},
 {page:'albert',label:'Parler à Albert',hint:'Disponibilité dans son espace'},
]);
const ALLOWED=new Set(['home','passport','member','secret','world3b','guide','shop','albert',...WORLD_MODULES.map(x=>x.id),...WORLD_MORE_SERVICES.map(x=>x.id)]);
export function companionDestinationAllowed(page){return typeof page==='string'&&ALLOWED.has(page);}
export function companionApplicationReply(text,{memberRegistered=false,page}={}){
 const input=normalizeWorldSearch(text).slice(0,300);
 if(/\b(?:donnees privees|confidentialite|mes donnees|lis mes papiers|lis mon dossier|mes analyses|mot de passe)\b/.test(input))return{message:'Je ne consulte pas ton coffre, tes pièces administratives, tes mesures de santé ni tes mots de passe. Cette discussion reste en mémoire pour cette visite. Ouvre toi-même l’espace concerné pour agir.',pose:'focus',choices:[{label:'Mes papiers & démarches',page:'admin'},{label:'Mon espace membre',page:'member'}]};
 let destination;
 if(/\b(?:fidelite|mes cartes|mes points)\b/.test(input))destination={id:'member',label:'Espace membre'};
 else if(/\b(?:papiers|impots|pole emploi|france travail|coffre|administratif|demarches)\b/.test(input))destination={id:'admin',label:'Mes papiers & démarches'};
 else if(/\b(?:bracelet|capteur|anatomie|organes)\b/.test(input))destination={id:'health',label:'Santé & vivant'};
 else if(/\b(?:actualites|actus|informations de france)\b/.test(input))destination={id:'news',label:'Info Actu'};
 else destination=findAlbertDestination(input);
 if(!destination||!DETAILS[destination.id])return null;
 return{message:DETAILS[destination.id],pose:'curious',choices:[{label:destination.id==='member'&&!memberRegistered?'Connexion / inscription':'Ouvrir '+destination.label,page:destination.id},...(destination.id!=='albert'?[{label:'Conversation avec Albert',page:'albert'}]:[])].filter(choice=>choice.page!==page)};
}
export function companionContextActions(page){
 const pairs={news:['member','albert'],admin:['member','association'],association:['admin','finance'],finance:['admin','albert'],health:['member','albert'],religion:['albert','member'],community:['association','member'],travel:['admin','member']};
 const ids=pairs[page]||['member','news'];
 return ids.map(id=>COMPANION_EXPLORER.find(item=>item.page===id)).filter(Boolean);
}
