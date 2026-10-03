import {Button} from '../design-system/index.jsx';
import React from 'react';
import {cardById} from './catalog.js';
import {TOURNAMENT_ROUNDS,TOURNAMENT_REWARD,normalizeTournament} from './tournament.js';

export function TournamentPanel({save,onStart,onNext,onClose}){
 const state=normalizeTournament(save.adventure.tournament),current=TOURNAMENT_ROUNDS[state.round],encounter=save.adventure.encounter;
 return <div className="tournament-panel">
  <span className="world-kicker">FRANCE · DÉFI SOLO</span>
  <h3>Le Tournoi des Liens</h3>
  <p>Trois partenaires, trois gestes à maîtriser. Chaque manche se joue dans le monde, avec tes déplacements, ta garde et ton pouvoir. Ta vitalité est restaurée au début de chaque manche.</p>
  <ol className="tournament-rounds">
   {TOURNAMENT_ROUNDS.map((round,index)=><li key={round.id} aria-current={state.round===index?'step':undefined}>
    <span aria-hidden="true">{index<state.round?'◆':String(index+1).padStart(2,'0')}</span><div><strong>{round.title}</strong>
    <small>{cardById[round.card].name} · {round.rule}</small></div>
   </li>)}
  </ol>
  {state.status==='active'&&<p className="world-rule" role="status">Manche {state.round+1} en cours · geste validé {encounter?.tournamentProgress||0}/{current.goal}. Tu peux suspendre et reprendre ce duel.</p>}
  {state.status==='between'&&<p className="world-rule" role="status">Manche {state.round} remportée. Ta prochaine épreuve : {current.title}.</p>}
  {['defeat','abandoned'].includes(state.status)&&<p className="world-rule" role="status">{state.status==='defeat'?'Cette manche a été perdue.':'Tu t’es retiré de cette manche.'} Les {state.round} manches déjà remportées sont conservées. Reprends la manche {state.round+1} avec toute ta vitalité.</p>}
  {state.status==='completed'?<p className="world-rule" role="status">Tournoi accompli · les trois gestes ont été validés. Récompense reçue : {TOURNAMENT_REWARD.xp} XP monde et {TOURNAMENT_REWARD.shards} éclats.</p>:<p>Récompense à la fin des trois manches : <strong>{TOURNAMENT_REWARD.xp} XP monde · {TOURNAMENT_REWARD.shards} éclats</strong>, une seule fois. Ce défi ne donne ni sceau de Gardien ni monnaie du compte.</p>}
  <div className="world-actions">
   {state.status==='available'&&<Button className="world-primary" onClick={onStart}>Commencer la première manche</Button>}
   {state.status==='between'&&<Button className="world-primary" onClick={onNext}>Jouer la manche {state.round+1}</Button>}
   {['defeat','abandoned'].includes(state.status)&&<Button className="world-primary" onClick={onStart}>Reprendre la manche {state.round+1}</Button>}
   {state.status==='active'&&<Button className="world-primary" onClick={onStart}>Reprendre le duel</Button>}
   <Button onClick={onClose}>Retour à l’exploration</Button>
  </div>
 </div>;
}
