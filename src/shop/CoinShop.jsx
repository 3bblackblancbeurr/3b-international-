import React,{useMemo,useState} from 'react';
import {Coins,LockKeyhole,PackageCheck,Sparkles} from 'lucide-react';
import {ECONOMY_ITEMS,canPurchase} from '../../shared/economy.js';
import './coin-shop.css';

const rarity={rare:'Rare',epic:'Épique',legendary:'Légendaire'};
export default function CoinShop({wallet,onPurchase}){
 const coins=Number(wallet?.coins)||0;
 const owned=useMemo(()=>new Set((wallet?.inventory||[]).map(i=>i.item_code||i.code)),[wallet?.inventory]);
 const[busy,setBusy]=useState(''),[notice,setNotice]=useState('');
 const buy=async item=>{if(!wallet){setNotice('Le Wallet serveur doit être activé avant un achat.');return;}const check=canPurchase({coins,price:item.coinPrice,quantity:1});if(!check.ok){setNotice('Solde de 3B Coins insuffisant.');return;}if(typeof onPurchase!=='function'){setNotice('Les achats Coins ne sont pas encore activés côté serveur.');return;}setBusy(item.code);setNotice('');try{await onPurchase(item.code,1);setNotice(`${item.name} ajouté à ton inventaire.`);}catch(e){setNotice(e?.message||'Achat indisponible. Aucun Coin ne doit être débité.');}finally{setBusy('');}};
 return <section className="coin-shop"><header><div><span className="loyalty-eyebrow">BOUTIQUE VIRTUELLE</span><h2>Objets du Monde 3B</h2><p>Cette zone utilise uniquement les 3B Coins. Les vêtements et produits physiques restent payés séparément avec le système de paiement normal.</p></div><strong><Coins size={18}/>{coins.toLocaleString('fr-FR')} Coins</strong></header>
 {notice&&<p className="coin-shop__notice" role="status">{notice}</p>}
 <div className="coin-shop__grid">{ECONOMY_ITEMS.map(item=>{const have=owned.has(item.code),check=canPurchase({coins,price:item.coinPrice,quantity:1});return <article key={item.code} data-rarity={item.rarity}><Sparkles/><span>{rarity[item.rarity]||item.rarity}</span><h3>{item.name}</h3><p>{item.category==='badge'?'Objet de collection et signe distinctif du Cercle.':'Personnalisation visuelle virtuelle du Monde 3B.'}</p><div><b>{item.coinPrice.toLocaleString('fr-FR')} Coins</b>{have?<em><PackageCheck size={15}/> Possédé</em>:null}</div><button disabled={have||busy===item.code||!wallet} onClick={()=>buy(item)}>{have?'Dans ton inventaire':busy===item.code?'Validation…':!wallet?<><LockKeyhole size={15}/> Wallet requis</>:check.ok?'Acheter':'Coins insuffisants'}</button></article>})}</div>
 </section>;
}
