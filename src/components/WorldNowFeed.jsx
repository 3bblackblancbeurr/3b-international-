import {ArrowUpRight,BadgePercent,BookOpen,BriefcaseBusiness,Clapperboard,Compass,Globe2,HandHeart,Handshake,HeartPulse,IdCard,Newspaper,Plane,Sparkles,Users} from 'lucide-react';
import {RouteLink} from './AppNavigation.jsx';
import '../styles/world-living-cinema.css';
import {getWorldEditorialPathways} from './world-editorial-pathways.js';

const ICONS=Object.freeze({
 newspaper:Newspaper,plane:Plane,'badge-percent':BadgePercent,compass:Compass,
 globe:Globe2,book:BookOpen,'id-card':IdCard,users:Users,'hand-heart':HandHeart,
 handshake:Handshake,briefcase:BriefcaseBusiness
});

export default function WorldNowFeed({tab='world',goTo}){
 const section=getWorldEditorialPathways(tab);
 return <section className="world3b-editorial" aria-labelledby="world3b-editorial-title">
   <div className="world3b-editorial-heading">
    <span className="world3b-eyebrow"><Sparkles size={13} aria-hidden="true"/> {section.label}</span>
    <h2 id="world3b-editorial-title">{section.title}</h2>
   </div>
   <div className="world3b-editorial-rail">
    {section.items.map(({id,title,subtitle,icon,number})=>{const Icon=ICONS[icon]||Compass;return <RouteLink page={id} goTo={goTo} key={id} className={'world3b-editorial-card world3b-editorial-card-'+number}>
     <span className="world3b-editorial-icon"><Icon size={24} strokeWidth={1.6} aria-hidden="true"/></span>
     <span className="world3b-editorial-card-copy"><strong>{title}</strong><small>{subtitle}</small></span>
     <ArrowUpRight className="world3b-editorial-link-icon" size={17} aria-hidden="true"/>
    </RouteLink>;})}
   </div>
   <p className="world3b-editorial-footnote">Accès aux services 3B existants · les informations affichées dans chaque rubrique dépendent de son activation</p>
 </section>;
}
