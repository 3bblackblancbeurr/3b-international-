import {ArrowUpRight,Compass,Crown,MapPinned,ShieldCheck,Sparkles} from 'lucide-react';
import {Button} from '../design-system/index.jsx';
import {RouteLink} from './AppNavigation.jsx';
import {WORLD_REALMS} from './world-living-data.js';
import '../styles/world-living-cinema.css';

// Artistic, narrative descriptions only. No invented physical 3B office, user count,
// live event, real-world partnership or country-by-country operational claim.
export const REALM_STORIES=Object.freeze({
 france:{epithet:'La lumière de la Justice',note:'Là où chaque décision laisse une trace et chaque voix mérite d’être entendue.',accent:'celestial'},
 algerie:{epithet:'La force de la Loyauté',note:'Un serment à protéger, des chemins à parcourir et des liens qui traversent les frontières.',accent:'emerald'},
 maroc:{epithet:'L’éclat de la Noblesse',note:'Le courage d’accueillir, la dignité d’avancer et un héritage qui se transmet.',accent:'amber'},
 tunisie:{epithet:'Le souffle du Courage',note:'Oser franchir la porte et trouver la force de construire son propre chemin.',accent:'azure'},
 espagne:{epithet:'Le feu de la Passion',note:'L’énergie des rencontres, des idées et des mondes que l’on imagine ensemble.',accent:'coral'},
 italie:{epithet:'Les voies de l’Espoir',note:'La beauté des possibles commence là où l’on décide de recommencer.',accent:'olive'},
 turquie:{epithet:'La flamme de la Foi',note:'Une conviction qui éclaire le voyage et rappelle ce qui nous rassemble.',accent:'violet'},
 estonie:{epithet:'Les secrets de la Sagesse',note:'Observer, apprendre et comprendre ce que les chemins ont à nous raconter.',accent:'frost'}
});

export function getRealmStory(realmId){
 const realm=WORLD_REALMS.find(item=>item.id===realmId)||WORLD_REALMS[0];
 return {realm,story:REALM_STORIES[realm.id],index:WORLD_REALMS.findIndex(item=>item.id===realm.id)+1};
}

export default function WorldRealmSpotlight({realmId='france',goTo,onSelect}){
 const {realm,story,index}=getRealmStory(realmId);
 return <section className="world3b-cinema-spotlight" data-realm={realm.id} data-accent={story.accent} aria-labelledby="world3b-cinema-title">
   <div className="world3b-cinema-image" aria-hidden="true">
    <img src="/art/monde-3b/reference-cite-huit-heritages.webp" width="940" height="530" loading="lazy" decoding="async" alt=""/>
    <span className="world3b-cinema-horizon"/>
   </div>
   <div className="world3b-cinema-copy">
    <div className="world3b-cinema-overline"><Sparkles size={15} aria-hidden="true"/> CARNET DES HUIT ROYAUMES <span className="world3b-cinema-count">{String(index).padStart(2,'0')} / 08</span></div>
    <span className="world3b-cinema-flag" aria-hidden="true">{realm.flag}</span>
    <h2 id="world3b-cinema-title">{realm.name}<span>{story.epithet}</span></h2>
    <p className="world3b-cinema-lead">{story.note}</p>
    <div className="world3b-cinema-signature">
      <span><Crown size={15} aria-hidden="true"/> {realm.guardian} · Gardien du royaume</span>
      <span><Compass size={15} aria-hidden="true"/> {realm.value}</span>
    </div>
    <div className="world3b-cinema-actions">
     <RouteLink className="world3b-cinema-primary" goTo={goTo} page="world3b">Entrer dans le Monde 3B <ArrowUpRight size={17} aria-hidden="true"/></RouteLink>
     <RouteLink className="world3b-cinema-secondary" goTo={goTo} page="passport">Mon Passeport <MapPinned size={16} aria-hidden="true"/></RouteLink>
    </div>
    <p className="world3b-cinema-truth"><ShieldCheck size={15} aria-hidden="true"/> Univers narratif 3B · visuel artistique, pas un hub physique annoncé</p>
   </div>
   <nav className="world3b-cinema-pips" aria-label="Choisir rapidement un royaume">
     {WORLD_REALMS.map((item,i)=><Button key={item.id} variant="ghost" type="button" aria-label={'Choisir '+item.name} aria-pressed={item.id===realm.id} onClick={()=>onSelect?.(item.id)} title={item.name}><span>{String(i+1).padStart(2,'0')}</span></Button>)}
   </nav>
 </section>;
}
