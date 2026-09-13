import React from 'react';
import {ArrowUpRight, Coins, PackageOpen, ShieldCheck, Sparkles} from 'lucide-react';
import './economy-wallet.css';

const clamp=(n,min,max)=>Math.min(max,Math.max(min,Number(n)||0));
const levelFor=xp=>Math.min(10,Math.floor(clamp(xp,0,10000)/1000)+1);
const nextXp=xp=>Math.min(10000,Math.ceil((clamp(xp,0,10000)+1)/1000)*1000);
const fmt=n=>new Intl.NumberFormat('fr-FR').format(Number(n)||0);

export default function EconomyWallet({wallet,legacyProfile,goTo}){
 const xp=wallet?.xp??legacyProfile?.xp??0;
 const coins=wallet?.coins??0;
 const level=levelFor(xp);
 const target=nextXp(xp);
 const bandStart=(level-1)*1000;
 const progress=xp>=10000?100:clamp(((xp-bandStart)/1000)*100,0,100);
 const transactions=Array.isArray(wallet?.transactions)?wallet.transactions:[];
 const inventory=Array.isArray(wallet?.inventory)?wallet.inventory:[];
 const ready=Boolean(wallet);
 return <section className="economy-wallet" aria-label="Wallet 3B">
  <header className="economy-wallet__hero">
   <div><span className="loyalty-eyebrow">WALLET 3B</span><h2>Ton économie dans le Cercle.</h2><p>XP pour ta progression. 3B Coins pour les objets virtuels. Les 3B Coins ne sont pas une cryptomonnaie et ne sont pas retirables.</p></div>
   <span className={ready?'economy-status is-ready':'economy-status'}><ShieldCheck size={16}/>{ready?'Synchronisé':'Préparation du Wallet'}</span>
  </header>
  <div className="economy-wallet__stats">
   <article><Sparkles/><span>EXPÉRIENCE</span><strong>{fmt(xp)} <small>/ 10 000 XP</small></strong><p>Niveau {level}/10 · {xp>=10000?'Palier maximum':`${fmt(target-xp)} XP avant le prochain palier`}</p><div className="economy-progress"><i style={{width:`${progress}%`}}/></div></article>
   <article><Coins/><span>MONNAIE INTERNE</span><strong>{fmt(coins)} <small>3B Coins</small></strong><p>À utiliser uniquement pour les objets et personnalisations virtuels 3B.</p><button onClick={()=>goTo?.('shop')}>Voir la Boutique <ArrowUpRight size={15}/></button></article>
   <article><PackageOpen/><span>INVENTAIRE</span><strong>{fmt(inventory.reduce((sum,item)=>sum+(Number(item.quantity)||0),0))} <small>objets</small></strong><p>{inventory.length?`${inventory.length} type${inventory.length>1?'s':''} d’objet possédé${inventory.length>1?'s':''}.`:'Tes futurs objets 3B apparaîtront ici.'}</p></article>
  </div>
  <div className="economy-wallet__lower">
   <article><h3>Derniers mouvements</h3>{transactions.length?<ul>{transactions.slice(0,8).map(tx=><li key={tx.id||tx.idempotency_key}><span>{tx.source||tx.kind||'3B'}</span><strong className={(Number(tx.amount)||0)>=0?'is-positive':'is-negative'}>{(Number(tx.amount)||0)>0?'+':''}{fmt(tx.amount)} {tx.asset==='xp'?'XP':'Coins'}</strong></li>)}</ul>:<p className="economy-empty">L’historique apparaîtra après activation complète du moteur économique serveur.</p>}</article>
   <article><h3>Inventaire 3B</h3>{inventory.length?<ul>{inventory.slice(0,8).map(item=><li key={item.item_code||item.code}><span>{item.name||item.item_code||item.code}</span><strong>× {fmt(item.quantity||1)}</strong></li>)}</ul>:<p className="economy-empty">Gagne ou achète des objets virtuels pour construire ta collection.</p>}</article>
  </div>
 </section>;
}
