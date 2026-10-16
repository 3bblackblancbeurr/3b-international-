import React,{useCallback,useEffect,useRef,useState} from 'react';
import {AlertTriangle, ArrowUpRight, Barcode, Camera, CheckCircle2, CircleHelp, LoaderCircle, RotateCcw, ScanLine, ShieldCheck, StopCircle, X} from 'lucide-react';
import './food-scanner.css';
import {validFoodBarcode} from './foodBarcode.js';
import {allergenLabel} from './allergenLabels.js';

const SCANNABLE = ['ean_13','ean_8','upc_a','upc_e','itf'];
const NUMERIC = [
  ['kcal','Énergie','kcal'],
  ['sugars','Sucres','g'],
  ['salt','Sel','g'],
  ['fat','Matières grasses','g'],
  ['saturated','Acides gras saturés','g'],
  ['fiber','Fibres','g'],
  ['proteins','Protéines','g'],
];
const safeNumber=value=>typeof value==='number'&&Number.isFinite(value)?new Intl.NumberFormat('fr-FR',{maximumFractionDigits:1}).format(value):'—';

export default function FoodScanner(){
  const videoRef=useRef(null), streamRef=useRef(null), timerRef=useRef(null), activeRef=useRef(false), requestRef=useRef(null);
  const [scanning,setScanning]=useState(false);
  const [support,setSupport]=useState('checking');
  const [code,setCode]=useState('');
  const [loading,setLoading]=useState(false);
  const [result,setResult]=useState(null);
  const [error,setError]=useState('');
  const [notice,setNotice]=useState('');
  const stopCamera=useCallback(()=>{
    activeRef.current=false;
    if(timerRef.current!==null){clearTimeout(timerRef.current);timerRef.current=null;}
    streamRef.current?.getTracks().forEach(track=>track.stop());
    streamRef.current=null;
    if(videoRef.current){videoRef.current.pause();videoRef.current.srcObject=null;}
    setScanning(false);
  },[]);
  const lookup=useCallback(async raw=>{
    const barcode=String(raw||'').trim();
    if(!validFoodBarcode(barcode)) {setError('Code incorrect : vérifie les chiffres et la clé de contrôle.');return;}
    stopCamera();
    requestRef.current?.abort();
    const abort=new AbortController();
    requestRef.current=abort;
    setCode(barcode);setError('');setNotice('');setResult(null);setLoading(true);
    try{
      const response=await fetch('/api/food-product?code='+encodeURIComponent(barcode),{signal:abort.signal,credentials:'omit'});
      const data=await response.json();
      if(!response.ok||!data.product)throw new Error(data.error||'Ce produit est introuvable.');
      setResult({...data.product,sourceUrl:data.url});
      setNotice('Fiche trouvée. Vérifie toujours l’emballage réel.');
    }catch(e){
      if(!abort.signal.aborted)setError(e.message||'Lecture impossible. Vérifie ta connexion.');
    }finally{if(!abort.signal.aborted)setLoading(false);}
  },[stopCamera]);
  useEffect(()=>{
    let active=true;
    async function check(){
      const Detector=window.BarcodeDetector;
      if(typeof Detector!=='function'||!navigator.mediaDevices?.getUserMedia){setSupport('unsupported');return;}
      try {
        const formats=typeof Detector.getSupportedFormats==='function'?await Detector.getSupportedFormats():SCANNABLE;
        if(active)setSupport(formats.some(x=>SCANNABLE.includes(x))?'ready':'unsupported');
      }catch{if(active)setSupport('unsupported');}
    }
    check();
    return ()=>{active=false;};
  },[]);
  useEffect(()=>{
    const hidden=()=>{if(document.hidden)stopCamera();};
    document.addEventListener('visibilitychange',hidden);
    return ()=>{document.removeEventListener('visibilitychange',hidden);stopCamera();requestRef.current?.abort();};
  },[stopCamera]);

  async function startCamera(){
    setError('');setNotice('');setResult(null);
    const Detector=window.BarcodeDetector;
    if(typeof Detector!=='function'||!navigator.mediaDevices?.getUserMedia){
      setError('Scanner vidéo non pris en charge ici : utilise le code inscrit sur l’emballage.');return;
    }
    try{
      const formats=typeof Detector.getSupportedFormats==='function'?await Detector.getSupportedFormats():SCANNABLE;
      const usable=formats.filter(f=>SCANNABLE.includes(f));
      if(!usable.length)throw new Error('Aucun format de code alimentaire reconnu sur cet appareil.');
      const detector=new Detector({formats:usable});
      const stream=await navigator.mediaDevices.getUserMedia({audio:false,video:{facingMode:{ideal:'environment'},width:{ideal:1280},height:{ideal:720}}});
      streamRef.current=stream;
      activeRef.current=true;setScanning(true);
      const video=videoRef.current;
      if(!video)throw new Error('Écran caméra indisponible.');
      video.srcObject=stream;
      await video.play();
      const inspect=async()=>{
        if(!activeRef.current)return;
        try{
          if(video.readyState>=2){
            const found=await detector.detect(video);
            const match=found.map(x=>x.rawValue).find(value=>validFoodBarcode(value));
            if(match){await lookup(match);return;}
          }
        }catch{
          if(activeRef.current)setNotice('Cadre ton code-barres sous une meilleure lumière.');
        }
        if(activeRef.current)timerRef.current=setTimeout(inspect,400);
      };
      timerRef.current=setTimeout(inspect,250);
    }catch(e){
      stopCamera();
      setError(e.name==='NotAllowedError'?'Accès caméra refusé. Autorise la caméra dans les paramètres du navigateur pour scanner.':e.message||'Caméra indisponible sur cet appareil.');
    }
  }

  return <section className="foodscan" aria-labelledby="foodscan-title">
    <header className="fs-intro"><div><span className="fs-eyebrow"><ScanLine size={15}/> 3B SANTÉ · SCANNER ALIMENTAIRE</span><h2 id="foodscan-title">Ton produit.<br/><em>En clair.</em></h2><p>Scanne son code-barres avec la caméra pour retrouver ingrédients, Nutri-Score et valeurs nutritionnelles depuis Open Food Facts.</p></div><div className="fs-mark" aria-hidden="true"><Barcode size={70}/></div></header>
    <div className="fs-commands">{scanning?<button type="button" className="fs-stop" onClick={stopCamera}><StopCircle size={20}/> Arrêter la caméra</button>:<button type="button" className="fs-start" onClick={startCamera} disabled={support==='checking'}><Camera size={20}/>{support==='checking'?'Vérification du téléphone…':'Scanner avec mon téléphone'}</button>}</div>
    <div className={'fs-camera '+(scanning?'is-active':'')} >
      <video ref={videoRef} playsInline muted autoPlay aria-label="Aperçu caméra pour le scan des codes-barres" style={{display:scanning?'block':'none'}}/>
      {scanning?<div className="fs-guides" aria-hidden="true"><span/><span/><span/><span/><i/></div>:<div className="fs-placeholder" aria-hidden="true"><ScanLine size={66}/><span>PRÊT À SCANNER</span></div>}
      {scanning&&<span className="fs-live"><span/> CAMÉRA ACTIVE · LOCAL</span>}
    </div>
    {support==='unsupported'&&<p className="fs-support" role="status"><CircleHelp size={17}/> Scanner en direct non disponible sur ce navigateur. Chrome Android et certains navigateurs Samsung le prennent en charge ; le code imprimé reste utilisable.</p>}
    <form className="fs-fallback" onSubmit={e=>{e.preventDefault();lookup(code);}}>
      <label htmlFor="fs-code">Ou saisir le code-barres du produit</label>
      <div><input id="fs-code" type="text" inputMode="numeric" pattern="(?:[0-9]{8}|[0-9]{12}|[0-9]{13}|[0-9]{14})" maxLength="14" autoComplete="off" placeholder="EAN, UPC ou GTIN" value={code} onChange={e=>setCode(e.target.value.replace(/\D/g,''))} aria-describedby="fs-code-help"/><button type="submit" disabled={loading||scanning||!validFoodBarcode(code)}>Rechercher</button></div>
      <small id="fs-code-help">Solution de secours si ton appareil ne permet pas la détection vidéo.</small>
    </form>
    {loading&&<p className="fs-notice" role="status"><LoaderCircle size={18} className="fs-spin"/> Recherche de la fiche alimentaire…</p>}
    {error&&<p className="fs-error" role="alert"><AlertTriangle size={18}/>{error}</p>}
    {notice&&<p className="fs-notice" role="status"><CheckCircle2 size={18}/>{notice}</p>}
    {result&&<article className="fs-product">
      <div className="fs-product-title"><span className="fs-eyebrow">FICHE PRODUIT · {result.code}</span><h3>{result.name}</h3>{result.brand&&<p>{result.brand}{result.quantity?' · '+result.quantity:''}</p>}</div>
      <div className="fs-badges">
        {result.nutriscore?<span className="fs-nutriscore">Nutri-Score <strong>{result.nutriscore}</strong></span>:<span>Nutri-Score non renseigné</span>}
        {result.nova?<span>Groupe NOVA {result.nova}</span>:<span>NOVA non renseigné</span>}
      </div>
      <h4>Valeurs pour 100 g / 100 ml selon la fiche</h4>
      <dl className="fs-nutrients">{NUMERIC.map(([id,label,unit])=><div key={id}><dt>{label}</dt><dd>{safeNumber(result.per100g?.[id])} {result.per100g?.[id]==null?'':unit}</dd></div>)}</dl>
      <h4>Ingrédients et allergènes</h4>
      <p className="fs-ingredients">{result.ingredients||'Ingrédients non renseignés dans la base.'}</p>
      <p className="fs-allergens"><strong>Allergènes signalés : </strong>{result.allergens?.length?result.allergens.map(allergenLabel).join(', '):'non renseignés'}</p>
      <p className="fs-allergens"><strong>Traces possibles signalées : </strong>{result.traces?.length?result.traces.map(allergenLabel).join(', '):'non renseignées'}</p>
      <p className="fs-alert"><AlertTriangle size={19}/><span><strong>Allergies : ne te fie jamais uniquement au scanner.</strong> Cette base est contributive, parfois incomplète ou périmée. Seule l’étiquette du produit et, au besoin, un professionnel, peuvent guider ton choix.</span></p>
      {result.sourceUrl&&<a className="fs-source" href={result.sourceUrl} target="_blank" rel="noopener noreferrer">Voir la fiche Open Food Facts <ArrowUpRight size={17}/></a>}
      <button type="button" className="fs-again" onClick={()=>{setResult(null);setError('');setNotice('');setCode('');}}><RotateCcw size={18}/> Scanner un autre produit</button>
    </article>}
    <footer className="fs-footer"><ShieldCheck size={19}/><span>Caméra traitée sur ton appareil ; aucune vidéo envoyée à 3B. Seul le code-barres est consulté via l’API Open Food Facts (données sous licence ODbL). Aucun diagnostic médical ni jugement automatique sur ta santé.</span></footer>
  </section>;
}
