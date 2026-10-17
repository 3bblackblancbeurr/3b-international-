// A local product simulator only. No API, bank account, blockchain or real asset.
export const FINANCE_STORAGE_KEY = 'threeb_finance_demo_v1';
export const DEMO_RECIPIENTS = Object.freeze([
  {id:'hub-paris',name:'Hub Paris · démo',detail:'Projet culturel fictif'},
  {id:'atelier-3b',name:'Atelier 3B · démo',detail:'Création collective fictive'},
  {id:'reserve-3b',name:'Projet solidaire · démo',detail:'Caisse collective fictive'},
]);
export const DEMO_ASSETS = Object.freeze({
  EUR: {symbol:'€ fictifs',name:'Solde de démonstration',decimals:2},
  T3B: {symbol:'3BT démo',name:'Token 3B de démonstration',decimals:2},
});
export const OPENING_BALANCES = Object.freeze({EUR:250000,T3B:100000});
export const DEMO_RATE = 10; // One fictitious euro buys 10 demo tokens; no market price.
const LIMIT = 500;
const MAX_BALANCE = 100000000;
const fail = message => { throw new Error(message); };

export function newDemoLedger(){return {version:1,mode:'simulation',events:[]};}

// Strict decimal parsing prevents scientific notation, rounding and partial parses.
export function parseDemoAmount(value){
  const text=String(value??'').trim().replace(',','.');
  if(!/^\d{1,7}(?:\.\d{1,2})?$/.test(text))return null;
  const [whole,decimals='']=text.split('.');
  const minor=Number(whole)*100+Number(decimals.padEnd(2,'0'));
  return Number.isSafeInteger(minor)&&minor>0&&minor<=MAX_BALANCE ? minor : null;
}

export function formatDemoAmount(minor,asset='EUR'){
  return new Intl.NumberFormat('fr-FR',{minimumFractionDigits:2,maximumFractionDigits:2}).format(minor/100)+' '+(DEMO_ASSETS[asset]?.symbol||'');
}

export function quoteDemoExchange(asset,amountMinor){
  if(!Object.hasOwn(DEMO_ASSETS,asset)||!Number.isSafeInteger(amountMinor)||amountMinor<=0)fail('Montant de simulation invalide.');
  if(asset==='T3B'&&amountMinor%DEMO_RATE!==0)fail('Pour cette conversion, utilise un multiple de 0,10 3BT démo.');
  return {asset:asset==='EUR'?'T3B':'EUR',amountMinor:asset==='EUR'?amountMinor*DEMO_RATE:amountMinor/DEMO_RATE};
}

function applyEvent(balances,event){
  if(!event||typeof event!=='object'||!/^[-a-zA-Z0-9_]{8,100}$/.test(event.id||''))fail('Référence de simulation invalide.');
  if(typeof event.at!=='string'||!Number.isFinite(Date.parse(event.at)))fail('Date de simulation invalide.');
  if(!Object.hasOwn(DEMO_ASSETS,event.asset)||!Number.isSafeInteger(event.amountMinor)||event.amountMinor<=0||event.amountMinor>MAX_BALANCE)fail('Montant de simulation invalide.');
  if(typeof event.note!=='string'||event.note.length>80||/[\u0000-\u001f]/.test(event.note))fail('Le libellé doit contenir au maximum 80 caractères, sans retour à la ligne.');
  const next={...balances};
  if(event.kind==='topup'){
    if(event.asset!=='EUR'||event.amountMinor!==100000||event.recipient)fail('Recharge de simulation invalide.');
    next.EUR+=event.amountMinor;
  }else if(event.kind==='transfer'){
    if(!DEMO_RECIPIENTS.some(recipient=>recipient.id===event.recipient))fail('Choisis un destinataire de démonstration.');
    if(next[event.asset]<event.amountMinor)fail('Solde fictif insuffisant pour cette opération.');
    next[event.asset]-=event.amountMinor;
  }else if(event.kind==='exchange'){
    if(event.recipient)fail('Conversion de simulation invalide.');
    if(next[event.asset]<event.amountMinor)fail('Solde fictif insuffisant pour cette conversion.');
    const quote=quoteDemoExchange(event.asset,event.amountMinor);
    next[event.asset]-=event.amountMinor;
    next[quote.asset]+=quote.amountMinor;
  }else fail('Opération de simulation inconnue.');
  if(Object.values(next).some(value=>!Number.isSafeInteger(value)||value<0||value>MAX_BALANCE))fail('Plafond de simulation atteint. Réinitialise la démo pour recommencer.');
  return next;
}

export function demoSnapshot(ledger){
  if(ledger?.version!==1||ledger.mode!=='simulation'||!Array.isArray(ledger.events)||ledger.events.length>LIMIT)fail('Historique local de démonstration invalide.');
  let balances={...OPENING_BALANCES};
  const seen=new Set();
  for(const event of ledger.events){
    if(seen.has(event.id))fail('Référence de simulation dupliquée.');
    seen.add(event.id);
    balances=applyEvent(balances,event);
  }
  return {balances,count:ledger.events.length,capacity:LIMIT};
}

export function appendDemoOperation(ledger,operation,{id=globalThis.crypto?.randomUUID?.(),at=new Date().toISOString()}={}){
  const snapshot=demoSnapshot(ledger);
  if(ledger.events.some(event=>event.id===id))fail('Cette opération de démonstration est déjà enregistrée.');
  if(snapshot.count>=LIMIT)fail('Historique complet (500 opérations). Exporte puis réinitialise la démo.');
  const event={id,at,kind:operation.kind,asset:operation.asset,amountMinor:operation.amountMinor,note:String(operation.note||'').trim()};
  if(operation.recipient)event.recipient=operation.recipient;
  applyEvent(snapshot.balances,event);
  return {...ledger,events:[...ledger.events,event]};
}

export function decodeDemoLedger(raw){
  if(raw===null||raw===undefined||raw==='')return newDemoLedger();
  if(typeof raw!=='string'||raw.length>200000)fail('Historique local de démonstration invalide.');
  let parsed;
  try{parsed=JSON.parse(raw);}catch{fail('Historique local de démonstration illisible.');}
  demoSnapshot(parsed);
  return parsed;
}

export function readDemoLedger(storage){
  try{return {ledger:decodeDemoLedger(storage.getItem(FINANCE_STORAGE_KEY)),warning:''};}
  catch{return {ledger:newDemoLedger(),warning:'La sauvegarde locale est indisponible ou invalide. La démo reste utilisable en mémoire ; réinitialise-la pour tenter une nouvelle sauvegarde.'};}
}

export function describeDemoEvent(event){
  if(event.kind==='topup')return 'Recharge fictive';
  if(event.kind==='exchange')return 'Conversion de démonstration';
  return DEMO_RECIPIENTS.find(item=>item.id===event.recipient)?.name||'Transfert fictif';
}

const csvCell=value=>'"'+String(value).replaceAll('"','""')+'"';
// Prefix user-authored labels so opening an export cannot execute spreadsheet formulas.
const safeLabel=value=>/^[=+@\-\t\r]/.test(value)?"'"+value:value;
export function exportDemoCsv(ledger){
  demoSnapshot(ledger);
  const rows=[['MODE','RÉFÉRENCE','DATE','OPÉRATION','ACTIF','MONTANT FICTIF','CONTREPARTIE FICTIVE','LIBELLÉ']];
  for(const event of ledger.events){
    const quote=event.kind==='exchange'?quoteDemoExchange(event.asset,event.amountMinor):null;
    rows.push(['SIMULATION',event.id,event.at,describeDemoEvent(event),DEMO_ASSETS[event.asset].symbol,(event.kind==='topup'?'+':'-')+(event.amountMinor/100).toFixed(2),quote?formatDemoAmount(quote.amountMinor,quote.asset):'',safeLabel(event.note)]);
  }
  return '\uFEFF'+rows.map(row=>row.map(csvCell).join(';')).join('\r\n');
}
