import {ArrowUpRight,BadgePercent,BookOpen,BriefcaseBusiness,Clapperboard,Compass,Globe2,HandHeart,Handshake,HeartPulse,IdCard,Newspaper,Plane,Sparkles,Users} from 'lucide-react';
import {RouteLink} from './AppNavigation.jsx';
import '../styles/world-living-cinema.css';

// These cards are navigational pathways into existing routes, NOT live partner,
// offer, event, booking, employment or membership data.
export const WORLD_EDITORIAL_PATHWAYS=Object.freeze({
 world:{
   label:'POUR COMMENCER LE VOYAGE',title:'Un monde de possibilités',
   items:[
    {id:'news',title:'Info & actualités',subtitle:'Découvrir les informations 3B',Icon:Newspaper,number:'01'},
    {id:'travel',title:'Voyager avec 3B',subtitle:'Explorer les destinations',Icon:Plane,number:'02'},
    {id:'deals',title:'Les bons plans',subtitle:'Retrouver les avantages du jour',Icon:BadgePercent,number:'03'}
   ]
 },
 realms:{
   label:'LA PORTE DES HUIT ROYAUMES',title:'Entrez dans la légende',
   items:[
    {id:'world3b',title:'Les huit royaumes',subtitle:'Justice, Loyauté, Noblesse…',Icon:Compass,number:'01'},
    {id:'games',title:'Les Jeux 3B',subtitle:'Jouer et explorer',Icon:Globe2,number:'02'},
    {id:'manga',title:'Manga 3B',subtitle:'Les autres univers créatifs',Icon:BookOpen,number:'03'}
   ]
 },
 community:{
   label:'UNE COMMUNAUTÉ À CONSTRUIRE',title:'Vos liens, votre univers',
   items:[
    {id:'passport',title:'Passeport 3B',subtitle:'Votre point d’entrée unique',Icon:IdCard,number:'01'},
    {id:'community',title:'Communauté',subtitle:'Partage et échanges',Icon:Users,number:'02'},
    {id:'association',title:'Association 3B',subtitle:'Projets et entraide',Icon:HandHeart,number:'03'}
   ]
 },
 opportunities:{
   label:'DÉCOUVRIR · ENTREPRENDRE',title:'Faites avancer vos projets',
   items:[
    {id:'partners',title:'Collaborations',subtitle:'Partenaires et initiatives',Icon:Handshake,number:'01'},
    {id:'join',title:'Nous recherchons',subtitle:'Voir les opportunités proposées',Icon:BriefcaseBusiness,number:'02'},
    {id:'travel',title:'Voyage 3B',subtitle:'Explorer les possibilités',Icon:Plane,number:'03'}
   ]
 }
});

export function getWorldEditorialPathways(tab='world'){
 return WORLD_EDITORIAL_PATHWAYS[tab]||WORLD_EDITORIAL_PATHWAYS.world;
}

export default function WorldNowFeed({tab='world',goTo}){
 const section=getWorldEditorialPathways(tab);
 return <section className="world3b-editorial" aria-labelledby="world3b-editorial-title">
   <div className="world3b-editorial-heading">
    <span className="world3b-eyebrow"><Sparkles size={13} aria-hidden="true"/> {section.label}</span>
    <h2 id="world3b-editorial-title">{section.title}</h2>
   </div>
   <div className="world3b-editorial-rail">
    {section.items.map(({id,title,subtitle,Icon,number})=><RouteLink page={id} goTo={goTo} key={id} className={'world3b-editorial-card world3b-editorial-card-'+number}>
     <span className="world3b-editorial-icon"><Icon size={24} strokeWidth={1.6} aria-hidden="true"/></span>
     <span className="world3b-editorial-card-copy"><strong>{title}</strong><small>{subtitle}</small></span>
     <ArrowUpRight className="world3b-editorial-link-icon" size={17} aria-hidden="true"/>
    </RouteLink>)}
   </div>
   <p className="world3b-editorial-footnote">Accès aux services 3B existants · les informations affichées dans chaque rubrique dépendent de son activation</p>
 </section>;
}
