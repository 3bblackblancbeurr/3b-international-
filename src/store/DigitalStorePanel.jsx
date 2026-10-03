import {Button} from '../design-system/index.jsx';
import {useCallback,useEffect,useMemo,useRef,useState} from "react";
import {Check,LockKeyhole,RefreshCw,ShieldCheck,ShoppingBag,Sparkles} from "lucide-react";
import {beginDigitalPurchase,confirmDigitalPurchase,digitalProviderLabel,digitalPurchasePlatform,loadDigitalStore,spendDigitalCredits} from "./digital-store-client.js";
import "./digital-store.css";

const money=value=>new Intl.NumberFormat("fr-FR",{style:"currency",currency:"EUR"}).format((Number(value)||0)/100);

export default function DigitalStorePanel({scope="all",onStoreChange}){
  const [data,setData]=useState(null),[busy,setBusy]=useState(""),[error,setError]=useState(""),[notice,setNotice]=useState("");
  const platform=useMemo(()=>digitalPurchasePlatform(),[]);
  const [confirmation,setConfirmation]=useState(null);
  const onStoreChangeRef=useRef(onStoreChange);
  useEffect(()=>{onStoreChangeRef.current=onStoreChange;},[onStoreChange]);
  const refresh=useCallback(async()=>{
    setError("");
    try{const next=await loadDigitalStore(scope);setData(next);onStoreChangeRef.current?.(next);}
    catch(e){setError(e.message);}
  },[scope]);

  useEffect(()=>{refresh();},[refresh]);

  useEffect(()=>{
    const url=new URL(location.href),status=url.searchParams.get("digital_store"),sessionId=url.searchParams.get("session_id");
    if(status!=="success"||!sessionId)return;
    setBusy("confirm");
    confirmDigitalPurchase(sessionId).then(result=>{
      setNotice(result.paid?"Achat vérifié · ton achat est maintenant lié à ton Passeport 3B.":result.entitlement?.status==="refund_pending"?"Cet objet était déjà acquis. Le paiement supplémentaire est en cours de remboursement.":result.entitlement?.status==="refunded"?"Ce paiement a été remboursé.":"Paiement en cours de confirmation.");
      refresh();
    }).catch(e=>setError(e.message)).finally(()=>{
      setBusy("");
      url.searchParams.delete("digital_store");url.searchParams.delete("session_id");
      history.replaceState(null,"",url.pathname+(url.search?url.search:"")+url.hash);
    });
  },[refresh]);

  const buy=async product=>{
    if(product.owned||busy)return;
    setBusy(product.code);setError("");setNotice("");
    try{
      const result=await beginDigitalPurchase(product);
      if(result.native){
        if(!result.ready){
          setNotice(`${digitalProviderLabel(result.provider)} : produit préparé, mais l’identifiant natif n’est pas encore activé. Aucun paiement externe n’est proposé.`);
          return;
        }
        setNotice(`${digitalProviderLabel(result.provider)} est prêt côté catalogue. Le module d’achat natif doit encore être activé avant transaction.`);
        return;
      }
      if(!result.url)throw Error("Checkout non disponible.");
      location.assign(result.url);
    }catch(e){setError(e.message);}
    finally{setBusy("");}
  };

  const items=data?.items||[];
  const creditName=asset=>asset==='premium_credits'?'Crédits Premium':'Crédits boutique';
  const spend=async()=>{
    if(!confirmation||busy)return;
    setBusy(confirmation.product.code);setError('');
    try{const result=await spendDigitalCredits(confirmation.product,confirmation.attemptId);if(!result.ok)throw Error('Achat non confirmé.');setConfirmation(null);setNotice('Objet acquis avec tes crédits.');await refresh();}
    catch(e){setError(e.message);}finally{setBusy('');}
  };
  return <section className="digital-store" data-scope={scope}>
    <header className="digital-store-head">
      <div><p>3B DIGITAL STORE</p><h2>{scope==="city"?"Premium · Créer ma Ville":"Premium · Monde du 3B"}</h2><span>Objets permanents · zéro pay-to-win · achats liés au Passeport 3B.</span></div>
      <div className="digital-store-security"><ShieldCheck size={21}/><span><strong>Achats conservés</strong><small>Retrouve tes achats avec ton compte 3B.</small></span></div>
    </header>

    <div className="digital-store-rules">
      <span><Check size={15}/> Progression gratuite conservée</span>
      <span><Check size={15}/> Objets payants non revendables au lancement</span>
      <span><Check size={15}/> Remboursement = droit révoqué</span>
      <span><LockKeyhole size={15}/> {platform==="web"?"Stripe Web":digitalProviderLabel(platform)} uniquement</span>
    </div>

    {data?.mode==="test"&&<div className="digital-store-test"><Sparkles size={16}/> MODE TEST · aucun paiement réel Stripe n’est ouvert au public.</div>}
    {error&&<div className="digital-store-error" role="alert">{error}</div>}
    {notice&&<div className="digital-store-notice" role="status">{notice}</div>}
    {data?.expansionEnabled&&<div className="digital-store-rules" aria-label="Portefeuilles boutique">{['credits','premium_credits'].map(asset=><span key={asset}><strong>{data.wallet?.[asset]?.available||0}</strong> {creditName(asset)}{data.wallet?.[asset]?.debt>0?` · solde à régulariser : ${data.wallet[asset].debt}`:''}</span>)}<p>Ces crédits servent aux objets facultatifs. Les Coins gagnés en jeu et l’XP ville restent séparés.</p></div>}
    {confirmation&&<div className="digital-store-notice" role="dialog" aria-modal="false" aria-label="Confirmer l’achat en crédits"><strong>{confirmation.product.name}</strong><p>Dépenser {confirmation.product.creditCost} {creditName(confirmation.product.creditAsset)} pour cet objet permanent ?</p><Button variant="champagne" disabled={!!busy} onClick={spend}>Confirmer l’achat</Button><Button variant="ghost" disabled={!!busy} onClick={()=>setConfirmation(null)}>Annuler</Button></div>}

    {!data?<div className="digital-store-loading">Chargement du catalogue premium…</div>:
    <div className="digital-store-grid">{items.map(item=>{
      const nativeId=platform==="google_play"?item.provider?.googlePlay:platform==="app_store"?item.provider?.appStore:null;
      const webReady=data?.purchasingEnabled===true&&platform==="web"&&item.provider?.web==="stripe";
      const ready=platform==="web"?webReady:data?.nativePurchasingEnabled===true&&!!nativeId;
      return <article key={item.code} className="digital-store-card" data-owned={item.owned}>
        <div className="digital-store-art"><ShoppingBag size={28}/><span>{item.category}</span></div>
        <div className="digital-store-copy"><small>{item.scope==="city"?"CRÉER MA VILLE":"MONDE DU 3B"}</small><h3>{item.name}</h3><p>{item.description}</p></div>
        <div className="digital-store-price"><strong>{money(item.amount)}</strong><small>{item.kind==='consumable'?`${item.walletAmount} ${creditName(item.walletAsset)} · achat renouvelable`:'achat unique · permanent'}</small></div>
        {!item.owned&&item.creditCost&&<Button variant="ghost" disabled={!!busy||!item.creditReady||Object.values(data.wallet||{}).some(w=>w.debt>0)||(data.wallet?.[item.creditAsset]?.available||0)<item.creditCost} onClick={()=>setConfirmation({product:item,attemptId:crypto.randomUUID()})}>{item.creditCost} {creditName(item.creditAsset)}</Button>}
        <Button variant="ghost" type="button" disabled={item.owned||!!busy||!ready||!data?.purchasingEnabled} onClick={()=>buy(item)} data-ready={ready}>
          {item.owned?<><Check size={17}/> Acquis</>:busy===item.code?"Vérification…":ready?`Acheter · ${money(item.amount)}`:platform==="web"?"Paiement en préparation":`${digitalProviderLabel(platform)} à connecter`}
        </Button>
      </article>;
    })}</div>}

    <footer className="digital-store-footer">
      <Button variant="ghost" type="button" onClick={refresh} disabled={!!busy}><RefreshCw size={16}/> Restaurer / actualiser mes achats</Button>
      <p>Les achats mobiles numériques restent séparés du paiement des vêtements physiques : Google Play Billing sur Android, Apple In-App Purchase sur iPhone, Stripe uniquement sur le web lorsque le canal est autorisé.</p>
    </footer>
  </section>;
}
