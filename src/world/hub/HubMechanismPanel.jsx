import React,{useMemo,useState} from 'react';
import {initialRelay,switchRelay,relayConnected} from './mechanism.js';
export function HubMechanismPanel({item,onSolved,onCancel}){
 const initial=useMemo(()=>initialRelay(item.missionId+':'+item.actionId),[item]),[board,setBoard]=useState(initial.board),[moves,setMoves]=useState(0),[submitted,setSubmitted]=useState(false),complete=relayConnected(board);
 return <section className="hub-mechanism"><span className="world-kicker">MÉCANISME DU CERCLE · {item.missionId==='eight_signals'?'FRÉQUENCE':'RÉSEAU MATRIX'}</span><h3>{item.actionLabel||item.name}</h3><p>Rétablis les neuf connexions bleues. Chaque contact inverse sa case et ses voisines directes. Observe le circuit : tu peux revenir sur tes choix.</p>
 <div className="hub-relay-grid" aria-label="Circuit de neuf connexions">{board.map((on,index)=><button key={index} type="button" aria-label={'Connexion '+(index+1)+(on?' active':' coupée')} aria-pressed={on} disabled={submitted} onClick={()=>{setBoard(switchRelay(board,index));setMoves(n=>n+1);}}><span>{on?'●':'○'}</span><small>{index+1}</small></button>)}</div>
 <p role="status">{complete?'Circuit rétabli. Tu peux valider cette étape.':board.filter(Boolean).length+'/9 connexions actives'} · {moves} manipulations</p><div className="world-actions"><button disabled={!complete||submitted} className="world-primary" onClick={()=>{if(!complete||submitted)return;setSubmitted(true);onSolved(item);}}>Valider le circuit</button><button disabled={submitted} onClick={()=>{setBoard(initial.board);setMoves(0);}}>Recommencer</button><button disabled={submitted} onClick={onCancel}>Revenir dans le monde</button></div>
 <p>La progression est enregistrée après validation. Quitter le mécanisme ne valide pas l’objectif.</p></section>;
}
