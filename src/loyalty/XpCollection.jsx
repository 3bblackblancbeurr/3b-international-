import {useRef,useState} from 'react';
import {Download,Gamepad2} from 'lucide-react';
import {TIERS,tierFor,nextTier,themeFor} from '../../shared/loyalty.js';
import {CARD_STORIES} from '../../shared/member-card.js';
import {useLoyalty} from './LoyaltyContext.jsx';
import {memberRequest} from './client.js';
import CompactCard from '../components/CompactCard.jsx';
import MemberCard,{downloadCard} from './MemberCard.jsx';
const number=n=>new Intl.NumberFormat('fr-FR').format(n||0);
export function RewardStats({profile}){const t=tierFor(profile?.xp),next=nextTier(profile?.xp||0),progress=next?Math.round(((profile?.xp||0)-t.xp)/(next.xp-t.xp)*100):100;return <div className="loyalty-progress"><div><span>{t.name}</span><strong>{next?number(next.xp-(profile?.xp||0))+' XP avant '+next.name:'Toutes les cartes XP débloquées'}</strong></div><progress max="100" value={progress} aria-label="Progression vers le prochain niveau XP"/><small>{number(profile?.xp)} XP au total · Les XP ne se dépensent pas.</small></div>;}
export default function XpCollection({goTo}){
 const account=useLoyalty(),{profile}=account,cardPreview=useRef(null);
 const[selected,setSelected]=useState(null),[busy,setBusy]=useState(false),[notice,setNotice]=useState('');
 const tier=TIERS.find(t=>t.id===selected)||themeFor(profile?.theme,profile?.xp||0),unlocked=!!profile&&tier.xp<=profile.xp;
 async function equip(){setBusy(true);setNotice('');try{account.accept(await memberRequest('theme',{theme:tier.id},account.user.id));setNotice('Ton design et ton aura de jeu sont équipés.');}catch(e){setNotice(e.message);}finally{setBusy(false);}}
 return <div className="xp-collection"><div className="boutique-page-heading"><p className="loyalty-kicker">LA COLLECTION DE TON UNIVERS</p><h1>Ton aventure.<br/>Tes cartes XP.</h1><p>Huit illustrations à débloquer en progressant dans le 3B. Elles accompagnent ton passeport et tes jeux.</p></div>
 <div className="xp-card-stage" ref={cardPreview}><MemberCard profile={profile} tier={tier}/><p className="boutique-stage-caption" aria-live="polite">{tier.name} · {number(tier.xp)} XP · {unlocked?'Design débloqué':'Aperçu du design'}</p><RewardStats profile={profile}/></div>
 {(notice||account.error)&&<p role="status" className="loyalty-notice">{notice||account.error}</p>}
 <div className="loyalty-collection">{TIERS.map(t=><CompactCard key={t.id} className={'loyalty-choice '+(tier.id===t.id?'selected':'')} aria-pressed={tier.id===t.id} title={t.name} description={CARD_STORIES[t.id]} eyebrow={number(t.xp)+' XP'} icon={<MemberCard tier={t} small/>} action="Voir" onClick={()=>{setSelected(t.id);setNotice('');cardPreview.current?.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'center'});}}/>)}</div>
 <div className="loyalty-card-detail"><div><span className="loyalty-eyebrow">{tier.name}</span><h2>{tier.benefit}</h2><p>Le design choisi colore aussi l’aura de Kaïs dans les jeux d’action et le Labyrinthe. Tes XP et tes points sont conservés.</p></div><div className="loyalty-detail-actions"><button className="loyalty-primary" disabled={!unlocked||busy||profile?.theme===tier.id} onClick={equip}>{profile?.theme===tier.id?'Design équipé':unlocked?'Équiper le design':'Design à débloquer'}</button><button disabled={!unlocked||busy} onClick={async()=>{setBusy(true);try{await downloadCard(profile,tier);}catch(e){setNotice(e.message);}finally{setBusy(false);}}}><Download size={16}/> Télécharger le design</button></div></div>
 <CompactCard title="Comprendre les XP" description="Jeux, explorations, bonus et règles de progression." icon={<Gamepad2/>} onClick={()=>goTo('guide')}/></div>;
}
