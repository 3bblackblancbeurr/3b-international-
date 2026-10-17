import {Button as GoldButton} from '../design-system/index.jsx';
import React,{lazy,Suspense,useEffect,useMemo,useRef,useState} from 'react';
import {ArrowDownLeft,ArrowRight,ArrowRightLeft,ArrowUpRight,Check,ChevronRight,Coins,CreditCard,Download,Eye,EyeOff,FlaskConical,Globe2,History,Landmark,LockKeyhole,Plus,RotateCcw,ShieldCheck,Sparkles,WalletCards,X} from 'lucide-react';
import {appendDemoOperation,DEMO_ASSETS,DEMO_RATE,DEMO_RECIPIENTS,demoSnapshot,describeDemoEvent,exportDemoCsv,FINANCE_STORAGE_KEY,formatDemoAmount,newDemoLedger,parseDemoAmount,quoteDemoExchange,readDemoLedger,decodeDemoLedger} from './demo-ledger.js';
import './finance.css';
import FinanceProjectStudio from './FinanceProjectStudio.jsx';
const CryptoProjectStudio=lazy(()=>import('./crypto/CryptoProjectStudio.jsx'));

function loadSession(){
  try{return readDemoLedger(window.localStorage);}
  catch{return {ledger:newDemoLedger(),warning:'Stockage local indisponible. Cette session de démonstration reste en mémoire.'};}
}
const operationId=()=>globalThis.crypto?.randomUUID?.()||'demo-'+Date.now()+'-'+Math.random().toString(36).slice(2);
const dates=value=>new Intl.DateTimeFormat('fr-FR',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'}).format(new Date(value));

export default function FinanceStudio(){
  const [workspace,setWorkspace]=useState('project');
  return <div className="finance-workbench"><nav className="finance-workbench-nav" aria-label="Espaces banque et crypto"><GoldButton variant="health" aria-pressed={workspace==='project'} onClick={()=>setWorkspace('project')}><Landmark size={17}/>Atelier projet</GoldButton><GoldButton variant="health" aria-pressed={workspace==='token'} onClick={()=>setWorkspace('token')}><Coins size={17}/>Prototype du token</GoldButton><GoldButton variant="health" aria-pressed={workspace==='demo'} onClick={()=>setWorkspace('demo')}><FlaskConical size={17}/>Tester la démo</GoldButton></nav>{workspace==='project'?<FinanceProjectStudio/>:workspace==='token'?<Suspense fallback={<p className="finance-feedback" role="status">Ouverture de l’atelier du token…</p>}><CryptoProjectStudio/></Suspense>:<FinanceDemo/>}</div>;
}

function FinanceDemo(){
  const [session,setSession]=useState(loadSession);
  const latest=useRef(session);
  const [tab,setTab]=useState('bank');
  const [hidden,setHidden]=useState(false);
  const [kind,setKind]=useState('transfer');
  const [asset,setAsset]=useState('EUR');
  const [amount,setAmount]=useState('');
  const [recipient,setRecipient]=useState(DEMO_RECIPIENTS[0].id);
  const [note,setNote]=useState('');
  const [error,setError]=useState('');
  const [message,setMessage]=useState('');
  const [review,setReview]=useState(null);
  const [resetting,setResetting]=useState(false);
  const [historyFilter,setHistoryFilter]=useState('all');
  const amountInput=useRef(null);
  const reviewPanel=useRef(null);
  const confirmButton=useRef(null);
  const {balances,count,capacity}=useMemo(()=>demoSnapshot(session.ledger),[session.ledger]);
  const minor=parseDemoAmount(amount);
  let quote=null;
  if(kind==='exchange'&&minor){try{quote=quoteDemoExchange(asset,minor);}catch{/* Shown on submit. */}}
  const history=[...session.ledger.events].reverse().filter(event=>historyFilter==='all'||event.asset===historyFilter);

  function updateSession(next){latest.current=next;setSession(next);}
  useEffect(()=>{
    function onStorage(event){
      if(event.key!==FINANCE_STORAGE_KEY&&event.key!==null)return;
      const next=loadSession();latest.current=next;setSession(next);setReview(null);
      setMessage('La démo a été actualisée depuis un autre onglet.');
    }
    window.addEventListener('storage',onStorage);
    return()=>window.removeEventListener('storage',onStorage);
  },[]);
  useEffect(()=>{if(review){reviewPanel.current?.scrollIntoView?.({block:'nearest'});confirmButton.current?.focus();}},[review]);

  function changeTab(next){
    setTab(next);setReview(null);setResetting(false);setError('');setMessage('');
    setAsset(next==='crypto'?'T3B':'EUR');setKind('transfer');setAmount('');setNote('');
  }
  function prepare(operation){
    setError('');setMessage('');setResetting(false);
    try{
      const id=operationId();
      appendDemoOperation(latest.current.ledger,operation,{id});
      setReview({...operation,id});
    }catch(cause){setError(cause.message);}
  }
  function preview(event){
    event.preventDefault();
    if(!minor){setError('Saisis un montant positif avec deux décimales maximum (ex. 25,50).');amountInput.current?.focus();return;}
    prepare({kind,asset,amountMinor:minor,recipient:kind==='transfer'?recipient:undefined,note});
  }
  function commit(){
    if(!review)return;
    try{
      let current=latest.current;
      if(!current.warning){
        // Re-read immediately before a synchronous write: a stale review cannot overspend.
        try{current={ledger:decodeDemoLedger(window.localStorage.getItem(FINANCE_STORAGE_KEY)),warning:''};}
        catch{current={...current,warning:'La sauvegarde locale est inaccessible. Les nouvelles opérations restent en mémoire.'};}
      }
      const ledger=appendDemoOperation(current.ledger,review,{id:review.id});
      let warning=current.warning;
      if(!warning){try{window.localStorage.setItem(FINANCE_STORAGE_KEY,JSON.stringify(ledger));}catch{warning='Sauvegarde locale impossible. Garde cette page ouverte ou exporte ton historique : les opérations restent en mémoire.';}}
      updateSession({ledger,warning});setReview(null);setAmount('');setNote('');setError('');
      setMessage('Simulation enregistrée. Aucun fonds réel n’a été déplacé.');
    }catch(cause){setError(cause.message);setReview(null);}
  }
  function reset(){
    const ledger=newDemoLedger();let warning='';
    try{window.localStorage.setItem(FINANCE_STORAGE_KEY,JSON.stringify(ledger));}
    catch{warning='Stockage local indisponible. La nouvelle démo reste en mémoire.';}
    updateSession({ledger,warning});setResetting(false);setReview(null);setError('');setAmount('');setNote('');
    setMessage('Démo réinitialisée : 2 500 € fictifs et 1 000 3BT démo.');
  }
  function exportHistory(){
    const url=URL.createObjectURL(new Blob([exportDemoCsv(session.ledger)],{type:'text/csv;charset=utf-8'}));
    const link=document.createElement('a');link.href=url;link.download='3B-historique-SIMULATION.csv';
    document.body.appendChild(link);link.click();link.remove();
    window.setTimeout(()=>URL.revokeObjectURL(url),1000);
    setMessage('Historique fictif exporté au format CSV.');
  }
  const balance=(value,which)=>hidden?'••••••':formatDemoAmount(value,which);

  return <section className="finance-studio" aria-labelledby="finance-title">
    <div className="finance-demo-banner"><FlaskConical size={19} aria-hidden="true"/><div><strong>ESPACE DE DÉMONSTRATION</strong><span>Argent et tokens fictifs · aucune connexion bancaire · aucune blockchain</span></div><span className="finance-local-tag">LOCAL</span></div>
    <header className="finance-heading"><div><span className="finance-eyebrow">3B INTERNATIONAL · FINANCE LAB</span><h3 id="finance-title">Ton univers financier.<br/><em>À explorer librement.</em></h3><p>Teste les parcours de banque et de crypto 3B dans un espace de simulation personnel.</p></div><span className="finance-seal" aria-hidden="true"><Landmark size={31}/><small>3B</small></span></header>
    <nav className="finance-nav" aria-label="Espaces de démonstration financière">
      {[['bank','Banque démo',Landmark],['crypto','Crypto démo',Coins],['history','Activité',History]].map(([id,label,Icon])=><GoldButton variant="health" type="button" key={id} aria-pressed={tab===id} onClick={()=>changeTab(id)}><Icon size={17}/>{label}{id==='history'&&<span>{count}</span>}</GoldButton>)}
    </nav>

    {session.warning&&<p className="finance-feedback finance-warning" role="status"><ShieldCheck size={18}/>{session.warning}</p>}
    {message&&<p className="finance-feedback finance-success" role="status"><Check size={18}/>{message}</p>}
    {error&&<p className="finance-feedback finance-error" role="alert" id="finance-error">{error}</p>}

    {tab!=='history'&&<>
      <div className="finance-overview">
        <article className={'finance-balance '+(tab==='crypto'?'is-crypto':'')}>
          <div className="finance-balance-top"><span>{tab==='crypto'?'PORTEFEUILLE DE SIMULATION':'SOLDE DISPONIBLE · FICTIF'}</span><GoldButton variant="health" type="button" onClick={()=>setHidden(value=>!value)} aria-label={hidden?'Afficher les soldes fictifs':'Masquer les soldes fictifs'}>{hidden?<EyeOff size={19}/>:<Eye size={19}/>}</GoldButton></div>
          <strong className="finance-balance-number">{balance(balances[tab==='crypto'?'T3B':'EUR'],tab==='crypto'?'T3B':'EUR')}</strong>
          <p>{tab==='crypto'?'Token 3B de démonstration · aucun actif négociable':'Allocation initiale : 2 500 € fictifs · frais simulés : 0'}</p>
          <div className="finance-balance-actions"><GoldButton variant="health" type="button" onClick={()=>{setKind('transfer');setReview(null);amountInput.current?.focus();amountInput.current?.scrollIntoView?.({block:'center'});}}><ArrowUpRight size={17}/>Transférer</GoldButton>{tab==='bank'?<GoldButton variant="health" type="button" onClick={()=>prepare({kind:'topup',asset:'EUR',amountMinor:100000,note:'Recharge de démonstration'})}><Plus size={17}/>1 000 € fictifs</GoldButton>:<GoldButton variant="health" type="button" onClick={()=>{setKind('exchange');setReview(null);amountInput.current?.focus();amountInput.current?.scrollIntoView?.({block:'center'});}}><ArrowRightLeft size={17}/>Convertir</GoldButton>}</div>
          <div className="finance-balance-foot"><span><i/> Simulation locale</span><span>3B FINANCE LAB</span></div>
        </article>
        {tab==='bank'?<article className="finance-card" aria-label="Maquette de carte virtuelle, sans moyen de paiement"><div><span>3B <small>INTERNATIONAL</small></span><span>DÉMO</span></div><CreditCard size={32} strokeWidth={1.25} aria-hidden="true"/><strong>•••• &nbsp; •••• &nbsp; •••• &nbsp; DÉMO</strong><footer><span>CARTE CONCEPT<br/><b>Aucun paiement possible</b></span><Globe2 size={27}/></footer></article>:<article className="finance-token"><span className="finance-token-orb" aria-hidden="true">3B</span><div><span className="finance-eyebrow">3BT · PROTOTYPE</span><h4>Une idée de token.<br/>Un terrain d’essai.</h4><p>Solde de départ : 1 000 3BT démo. Aucune valeur monétaire ni adresse de dépôt.</p></div></article>}
      </div>
      <div className="finance-stat-row"><div><WalletCards size={18}/><span>Autre solde<strong>{balance(balances[tab==='crypto'?'EUR':'T3B'],tab==='crypto'?'EUR':'T3B')}</strong></span></div><div><ArrowRightLeft size={18}/><span>Taux de scénario<strong>1 € fictif = {DEMO_RATE} 3BT démo</strong></span></div><div><ShieldCheck size={18}/><span>Réseau<strong>Simulation sur cet appareil</strong></span></div></div>

      <div className="finance-workspace">
        <section className="finance-transfer" aria-labelledby="finance-transfer-title">
          <header><span className="finance-eyebrow">FAIRE UN ESSAI</span><h4 id="finance-transfer-title">{kind==='exchange'?'Convertir des unités fictives':'Un transfert, simplement.'}</h4><p>{kind==='exchange'?'Le taux est fixe et illustratif. Ce parcours n’utilise aucun cours de marché.':'Choisis un destinataire de test. Aucun IBAN ni adresse de portefeuille ne sont utilisés.'}</p></header>
          {tab==='crypto'&&<div className="finance-form-switch" role="group" aria-label="Opération crypto de démonstration"><GoldButton variant="health" type="button" aria-pressed={kind==='transfer'} onClick={()=>{setKind('transfer');setReview(null);setError('');}}>Transférer</GoldButton><GoldButton variant="health" type="button" aria-pressed={kind==='exchange'} onClick={()=>{setKind('exchange');setReview(null);setError('');}}>Convertir</GoldButton></div>}
          <form onSubmit={preview} noValidate>
            {kind==='transfer'&&<label htmlFor="finance-recipient">Destinataire fictif<select id="finance-recipient" value={recipient} onChange={event=>{setRecipient(event.target.value);setReview(null);}}>{DEMO_RECIPIENTS.map(item=><option key={item.id} value={item.id}>{item.name}</option>)}</select></label>}
            {tab==='crypto'&&<label htmlFor="finance-asset">{kind==='exchange'?'Actif à convertir':'Actif à transférer'}<select id="finance-asset" value={asset} onChange={event=>{setAsset(event.target.value);setReview(null);}}><option value="T3B">3BT de démonstration</option><option value="EUR">Euros fictifs</option></select></label>}
            <label htmlFor="finance-amount">Montant en {DEMO_ASSETS[asset].symbol}<input ref={amountInput} id="finance-amount" inputMode="decimal" autoComplete="off" value={amount} maxLength={11} placeholder="0,00" onChange={event=>{setAmount(event.target.value);setReview(null);setError('');}} aria-invalid={!!error} aria-describedby={error?'finance-error finance-amount-help':'finance-amount-help'}/></label>
            <div className="finance-amount-help" id="finance-amount-help"><span>Disponible : {balance(balances[asset],asset)}</span><GoldButton variant="health" type="button" onClick={()=>{setAmount((kind==='exchange'&&asset==='T3B'?Math.floor(balances[asset]/DEMO_RATE)*DEMO_RATE/100:balances[asset]/100).toFixed(2));setReview(null);}}>Tout utiliser</GoldButton></div>
            {kind==='exchange'&&<div className="finance-exchange-quote"><ArrowDownLeft size={18}/><span>Tu recevrais<strong>{quote?formatDemoAmount(quote.amountMinor,quote.asset):'—'}</strong></span><small>Frais fictifs : 0</small></div>}
            <label htmlFor="finance-note">Libellé <span>(facultatif)</span><input id="finance-note" value={note} maxLength={80} autoComplete="off" placeholder="Ex. mon premier essai" onChange={event=>{setNote(event.target.value);setReview(null);}}/></label>
            <small className="finance-form-hint">N’inscris aucune donnée personnelle. Les essais restent dans ce navigateur.</small>
            <GoldButton variant="health" className="finance-primary" type="submit">Vérifier la simulation <ArrowRight size={17}/></GoldButton>
          </form>
          {review&&<div ref={reviewPanel} className="finance-review" aria-labelledby="finance-review-title"><span className="finance-eyebrow">AVANT DE CONFIRMER</span><h5 id="finance-review-title">{describeDemoEvent(review)}</h5><dl><div><dt>Montant fictif</dt><dd>{formatDemoAmount(review.amountMinor,review.asset)}</dd></div>{review.kind==='exchange'&&<div><dt>Montant reçu fictif</dt><dd>{formatDemoAmount(quoteDemoExchange(review.asset,review.amountMinor).amountMinor,quoteDemoExchange(review.asset,review.amountMinor).asset)}</dd></div>}<div><dt>Frais simulés</dt><dd>0</dd></div>{review.note&&<div><dt>Libellé</dt><dd>{review.note}</dd></div>}</dl><p>Aucune transaction réelle ne sera exécutée.</p><div><GoldButton variant="health" ref={confirmButton} className="finance-primary" type="button" onClick={commit}><Check size={17}/>Confirmer la simulation</GoldButton><GoldButton variant="health" className="finance-text-button" type="button" onClick={()=>setReview(null)}><X size={16}/>Annuler</GoldButton></div></div>}
        </section>
        <aside className="finance-side"><div className="finance-section-line"><h4>Derniers essais</h4><GoldButton variant="health" type="button" onClick={()=>changeTab('history')}>Tout voir <ChevronRight size={15}/></GoldButton></div><ActivityList events={session.ledger.events.slice(-3).reverse()} hidden={hidden}/><div className="finance-roadmap"><LockKeyhole size={20}/><div><strong>Le réel reste verrouillé.</strong><p>Cette version permet de tester le produit. Les comptes réels, dépôts, retraits, paiements et émission blockchain ne sont pas activés.</p></div></div>{tab==='crypto'&&<dl className="finance-token-spec"><div><dt>Nom du prototype</dt><dd>3B Token</dd></div><div><dt>Symbole de démonstration</dt><dd>3BT</dd></div><div><dt>Précision du simulateur</dt><dd>2 décimales</dd></div><div><dt>Contrat / clé privée</dt><dd>Aucun</dd></div></dl>}</aside>
      </div>
    </>}
    {tab==='history'&&<section className="finance-history"><div className="finance-section-line"><div><span className="finance-eyebrow">TON JOURNAL LOCAL</span><h4>Tous tes essais, au même endroit.</h4><p>{count} opération{count>1?'s':''} de simulation sur {capacity} possibles.</p></div><GoldButton variant="health" className="finance-outline" type="button" onClick={exportHistory} disabled={!count}><Download size={17}/>Exporter CSV</GoldButton></div><label className="finance-history-filter" htmlFor="finance-history-filter">Afficher<select id="finance-history-filter" value={historyFilter} onChange={event=>setHistoryFilter(event.target.value)}><option value="all">Tous les actifs fictifs</option><option value="EUR">Euros fictifs</option><option value="T3B">3BT démo</option></select></label><ActivityList events={history} hidden={hidden}/></section>}
    <footer className="finance-footer"><p><ShieldCheck size={17}/><span>100 % simulation · sauvegarde locale {session.warning?'indisponible':'active'} · aucune donnée envoyée par ce module</span></p><GoldButton variant="health" type="button" className="finance-text-button" onClick={()=>{setResetting(value=>!value);setReview(null);}}><RotateCcw size={14}/>Réinitialiser la démo</GoldButton></footer>
    {resetting&&<div className="finance-reset" role="group" aria-label="Confirmer la réinitialisation"><p><strong>Repartir du début ?</strong> Les essais de ce navigateur seront effacés. Tu retrouveras les soldes fictifs de départ.</p><GoldButton variant="health" type="button" className="finance-outline" onClick={exportHistory} disabled={!count}><Download size={15}/>Exporter avant</GoldButton><GoldButton variant="health" type="button" className="finance-primary" onClick={reset}>Réinitialiser</GoldButton><GoldButton variant="health" type="button" className="finance-text-button" onClick={()=>setResetting(false)}>Annuler</GoldButton></div>}
  </section>;
}

function ActivityList({events,hidden}){
  if(!events.length)return <div className="finance-empty"><span><Sparkles size={24}/></span><strong>Le premier pas t’appartient.</strong><p>Tes transferts et conversions de démonstration apparaîtront ici.</p></div>;
  return <ol className="finance-activity">{events.map(event=>{
    const quote=event.kind==='exchange'?quoteDemoExchange(event.asset,event.amountMinor):null;
    const Icon=event.kind==='topup'?Plus:event.kind==='exchange'?ArrowRightLeft:ArrowUpRight;
    return <li key={event.id}><span className={'finance-activity-icon '+(event.kind==='topup'?'is-incoming':'')}><Icon size={19}/></span><div className="finance-activity-copy"><strong>{describeDemoEvent(event)}</strong><time dateTime={event.at}>{dates(event.at)} · simulation</time>{event.note&&<small>{event.note}</small>}<small className="finance-event-id">Réf. {event.id.slice(0,8)}</small></div><div className="finance-activity-amount"><strong>{hidden?'••••':(event.kind==='topup'?'+':'−')+formatDemoAmount(event.amountMinor,event.asset)}</strong>{quote&&<small>{hidden?'••••':'+'+formatDemoAmount(quote.amountMinor,quote.asset)}</small>}<span><Check size={11}/>Simulé</span></div></li>;
  })}</ol>;
}
