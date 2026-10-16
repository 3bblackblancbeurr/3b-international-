import {Button as GoldButton} from '../design-system/index.jsx';
import React,{useEffect,useRef,useState} from 'react';
import {ArrowUpRight,Building2,MapPin,Search,ShieldCheck,Phone,RefreshCw} from 'lucide-react';
import './official-directory.css';
const VALID = /^[\p{L}\p{M}0-9 '-]{2,50}$/u;
export default function OfficialDirectory(){
  const [city,setCity]=useState('');
  const [requested,setRequested]=useState('');
  const [results,setResults]=useState([]);
  const [visible,setVisible]=useState(5),[total,setTotal]=useState(null);
  const [error,setError]=useState('');
  const [busy,setBusy]=useState(false);
  const abortRef=useRef(null);
  useEffect(()=>()=>abortRef.current?.abort(),[]);
  async function searchDirectory(event){
    event?.preventDefault();
    const name=city.trim();
    if(!VALID.test(name)){setError('Écris simplement le nom de ta ville (2 à 50 caractères).');return;}
    abortRef.current?.abort();
    const ctrl=new AbortController();abortRef.current=ctrl;
    setError('');setResults([]);setVisible(5);setTotal(null);setRequested(name);setBusy(true);
    try{
      const response=await fetch('/api/official-directory?ville='+encodeURIComponent(name),{
        method:'GET',credentials:'omit',signal:ctrl.signal,headers:{Accept:'application/json'},
      });
      const data=await response.json();
      if(!response.ok || !Array.isArray(data.services)) throw new Error(data.error||'Annuaire indisponible.');
      if(!ctrl.signal.aborted){setResults(data.services);setTotal(Number.isInteger(data.total)?data.total:null);}
    }catch(e){if(!ctrl.signal.aborted)setError(e.message||'Impossible de chercher maintenant.');}
    finally{if(!ctrl.signal.aborted)setBusy(false);}
  }
  return <section className="mx-directory" aria-labelledby="mx-directory-title">
    <header><span className="mx-eyebrow"><Building2 size={15}/> ANNUAIRE PUBLIC OFFICIEL</span>
      <h4 id="mx-directory-title">Les vrais services près de ta ville.</h4>
      <p>Mairie, France Services, CAF, préfecture ou autres organismes : recherche leurs coordonnées dans l’annuaire officiel de l’administration française.</p>
    </header>
    <form className="mx-directory-form" onSubmit={searchDirectory}>
      <label htmlFor="mx-dir-city">Dans quelle ville ?</label>
      <div className="mx-directory-form-row">
        <MapPin size={18} aria-hidden="true"/>
        <input id="mx-dir-city" type="search" value={city} autoComplete="address-level2"
          maxLength={50} placeholder="Ex. Thonon-les-Bains, Lyon…" onChange={e=>setCity(e.target.value)}
          aria-describedby="mx-dir-help"/>
        <GoldButton variant="health" type="submit" aria-label="Rechercher les organismes officiels" disabled={busy || !VALID.test(city.trim())}><Search size={18}/><span>{busy?'Recherche…':'Rechercher'}</span></GoldButton>
      </div>
      <small id="mx-dir-help">Tu choisis ta ville. Aucune localisation GPS ni connexion à tes comptes administratifs.</small>
    </form>
    {busy&&<p className="mx-directory-feedback" role="status"><RefreshCw size={17} className="mx-dir-spin"/> Consultation de l’annuaire public…</p>}
    {error&&<p className="mx-directory-feedback is-error" role="alert">{error} <a href="https://lannuaire.service-public.gouv.fr/" target="_blank" rel="noopener noreferrer">Ouvrir l’annuaire officiel <ArrowUpRight size={14}/></a></p>}
    {requested&&!busy&&!error&&<>
      <p className="mx-directory-count" role="status"><ShieldCheck size={15}/> {results.length ? `${Math.min(visible,results.length)} affichés · ${total??results.length} correspondances officielles pour « ${requested} »` : `Aucun résultat pour « ${requested} » dans les noms de services.`}</p>
      <div className="mx-directory-list">{results.slice(0,visible).map((item,index)=><article key={item.profile} className="mx-directory-item">
        <span className="mx-directory-index">{String(index+1).padStart(2,'0')}</span>
        <div className="mx-directory-description">
          <strong>{item.name}</strong>
          {item.address&&<span>{item.address}</span>}
          {item.phone&&<a href={'tel:'+item.phone.replace(/[^+0-9]/g,'')}><Phone size={14}/>{item.phone}</a>}
          <a className="mx-directory-profile" href={item.profile} target="_blank" rel="noopener noreferrer">Voir la fiche officielle <ArrowUpRight size={16}/></a>
        </div>
      </article>)}</div>
      {results.length>visible&&<GoldButton variant="health" type="button" className="mx-dir-more" onClick={()=>setVisible(n=>Math.min(results.length,n+5))}>Voir les {Math.min(5,results.length-visible)} services suivants</GoldButton>}
      {total>results.length&&<p className="mx-directory-limit">D’autres services sont référencés. <a href="https://lannuaire.service-public.gouv.fr/" target="_blank" rel="noopener noreferrer">Consulter l’annuaire complet <ArrowUpRight size={14}/></a></p>}
    </>}
    <p className="mx-honesty"><ShieldCheck size={16}/> Données publiques DILA · annuaire Service-Public, actualisées par l’administration. Les horaires et informations sont à confirmer auprès de l’organisme. 3B ne réalise aucune démarche à ta place.</p>
  </section>;
}
