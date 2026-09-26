import {useState} from 'react';
import {BrainCircuit,Send,ShieldCheck,Sparkles} from 'lucide-react';
import {commandAIRequest} from './integrations-client.js';

const QUICK=[
 'Résume ce qui demande mon attention maintenant.',
 'Donne-moi les 3 prochaines actions utiles.',
 'Fais un point court sur les services connectés.'
];

export default function AICommandPanel(){
 const[prompt,setPrompt]=useState('');
 const[answer,setAnswer]=useState('');
 const[error,setError]=useState('');
 const[busy,setBusy]=useState(false);
 const[model,setModel]=useState('');

 const run=async(value=prompt)=>{
  const text=String(value||'').trim();
  if(!text||busy)return;
  setBusy(true);setError('');
  try{
   const data=await commandAIRequest(text);
   setAnswer(data?.answer?.text||'');
   setModel(data?.answer?.model||'');
   setPrompt('');
  }catch(e){setError(e.message||'3B IA Command indisponible.');}
  finally{setBusy(false);}
 };

 const submit=event=>{event.preventDefault();run();};

 return <section className="control-section control-ai-command control-hide-in-focus" id="cc-ai" aria-label="3B IA Command">
  <header className="control-section-heading">
   <div><p className="control-kicker"><BrainCircuit size={13}/> IA · PROPRIÉTAIRE</p><h2>3B IA Command</h2></div>
   <Sparkles size={20}/>
  </header>

  <div className="control-ai-quick">
   {QUICK.map(item=><button type="button" key={item} disabled={busy} onClick={()=>run(item)}>{item}</button>)}
  </div>

  <form className="control-ai-form" onSubmit={submit}>
   <textarea
    value={prompt}
    onChange={event=>setPrompt(event.target.value.slice(0,4000))}
    placeholder="Demande une synthèse, une priorité ou une prochaine action…"
    aria-label="Demande à 3B IA Command"
    rows={3}
   />
   <div><small>{prompt.length}/4000</small><button type="submit" disabled={busy||!prompt.trim()}><Send size={15}/>{busy?'Analyse…':'Envoyer'}</button></div>
  </form>

  {error&&<div className="control-ai-error" role="status">{error}</div>}

  {answer&&<div className="control-ai-answer" aria-live="polite">
   <div><BrainCircuit size={16}/><span>RÉPONSE{model?' · '+model:''}</span></div>
   <p>{answer}</p>
  </div>}

  <p className="control-ai-truth"><ShieldCheck size={14}/><span>L’IA ne reçoit jamais les clés API. Elle utilise uniquement le résumé de données déjà autorisées par le backend propriétaire et ses réponses ne sont pas stockées par Command OS.</span></p>
 </section>;
}
