import CompactCard from './CompactCard.jsx';
import {useState} from 'react';
import {TIERS,DISCOUNTS} from '../../shared/loyalty.js';
import {useLoyalty} from '../loyalty/LoyaltyContext.jsx';
import {memberRequest} from '../loyalty/client.js';
import {RouteLink,SectionIcon} from './AppNavigation.jsx';
const fmt=n=>new Intl.NumberFormat('fr-FR').format(n);
export default function GuidePage({goTo,menuItems}){
 const account=useLoyalty();const[notice,setNotice]=useState(''),[busy,setBusy]=useState(false);
 async function daily(){if(!account.user){goTo('member');return;}setBusy(true);try{const r=await memberRequest('daily',{},account.user.id);account.accept(r);setNotice(r.awarded?'+10 XP et +2 points ajoutés.':'Ton bonus est déjà récupéré aujourd’hui.');}catch(e){setNotice(e.message);}finally{setBusy(false);}}
 return <section className="editorial-page guide-page"><div className="editorial-heading"><p className="eyebrow">LE GUIDE 3B</p><h1>Chaque action<br/><em>a sa place.</em></h1><p>Comprendre ton univers, gagner de l’expérience et suivre tes avantages.</p></div>
 <div className="guide-distinction"><article><span>01 / EXPÉRIENCE</span><h2>Les XP font évoluer ta carte.</h2><p>Ils déterminent ton niveau. Tu ne les dépenses pas.</p><strong>{fmt(account.profile?.xp||0)} XP</strong></article><article><span>02 / FIDÉLITÉ</span><h2>Les points débloquent des réductions.</h2><p>Ils se cumulent et ne se dépensent pas. Les achats remboursés ajustent les gains.</p><strong>{fmt(account.profile?.points||0)} points</strong></article></div>
 <h2>Comment gagner</h2><div className="guide-table-wrap"><table className="guide-table"><thead><tr><th>Action</th><th>Récompense</th><th>Conditions</th><th>Destination</th></tr></thead><tbody>
 <tr><td>Jouer en ligne</td><td><strong>20 XP + 1 point / minute</strong></td><td>Temps actif vérifié. XP par tranche de 30 s, points par minute. Plafond quotidien : 600 XP et 20 points.</td><td><RouteLink page="games" goTo={goTo}>Jeux 3B →</RouteLink></td></tr>
 <tr><td>Explorer</td><td><strong>20 XP + 2 points</strong></td><td>Une fois par rubrique : passeport, manga et Monde 3B, après 12 secondes de visite visible. Le manga affiche uniquement « Bientôt ».</td><td><RouteLink page="world3b" goTo={goTo}>Le Monde du 3B →</RouteLink></td></tr>
 <tr><td>Bonus du jour</td><td><strong>10 XP + 2 points</strong></td><td>Une fois par jour. Renouvellement à minuit, heure de Paris. Aucune série à maintenir.</td><td><button className="quiet-button" disabled={busy} onClick={daily}>{busy?'En cours…':'Récupérer'}</button></td></tr>
 <tr><td>Acheter en boutique</td><td><strong>10 XP + 10 points / 1 €</strong></td><td>Compte connecté avant le paiement réel ; articles payés après réduction, hors livraison. À l’ouverture des ventes.</td><td><RouteLink page="shop" goTo={goTo}>Boutique →</RouteLink></td></tr>
 </tbody></table></div>{notice&&<p className="surface-notice" role="status">{notice}</p>}
 <p className="muted-copy">Les likes, messages, publications et créations IA ne rapportent pas d’XP actuellement. Les scores invités ne sont pas convertis. Les gains sont validés par le serveur.</p>
 <h2>Les huit niveaux</h2><div className="guide-levels">{TIERS.map(t=><article key={t.id} style={{'--card-accent':t.color}}><span>{t.name}</span><strong>{fmt(t.xp)} XP</strong><p>{t.benefit}</p></article>)}</div>
 <h2>Les avantages fidélité</h2><div className="guide-levels">{DISCOUNTS.map(d=><article key={d.points}><strong>−{d.percent} %</strong><p>À partir de {fmt(d.points)} points. Le meilleur taux s’applique aux articles éligibles, sans cumul et hors livraison.</p></article>)}</div>
 <h2>À quoi sert chaque rubrique ?</h2><div className="guide-directory">{menuItems.filter(i=>i.id!=='guide').map(i=><CompactCard as={RouteLink} key={i.id} page={i.id} goTo={goTo} icon={<SectionIcon page={i.id}/>} title={i.label} description={i.description}/>)}</div>
 <details className="guide-faq"><summary>Où retrouver mes gains et mes réglages ?</summary><p>L’historique des gains se trouve dans Cartes de fidélité. Ton compte et les réglages d’animation se trouvent dans Mon espace, accessible par la navigation.</p></details></section>;
}

