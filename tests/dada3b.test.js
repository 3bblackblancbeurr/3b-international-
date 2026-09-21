import test from 'node:test';
import assert from 'node:assert/strict';
import {
  FINISH_STEP,
  STABLE,
  TRACK_LENGTH,
  achievementsFor,
  createMatch,
  globalCellFor,
  legalMoves,
  movePiece,
  readMatchSnapshot,
  resolveTimeout,
  rollTurn,
  selectBotMove,
  serializeMatch,
} from '../src/games/dada3b/engine.js';

const seats=[
  {countryId:'fr',type:'human'},
  {countryId:'dz',type:'human'},
];

function stepForCell(countryId,cell){
  for(let step=0;step<TRACK_LENGTH;step+=1)if(globalCellFor(countryId,step)===cell)return step;
  return null;
}
const countryStart=countryId=>globalCellFor(countryId,0);

test('sortie de l’écurie uniquement sur 6',()=>{
  const match=createMatch(seats);
  const five=rollTurn(match,5);
  assert.equal(five.match.players[0].pieces[0].steps,STABLE);
  assert.equal(five.match.turn,1);
  const six=rollTurn(createMatch(seats),6);
  assert.deepEqual(six.match.pendingMoves,[0,1,2,3]);
});

test('un 6 conserve le tour après déplacement',()=>{
  let match=createMatch(seats);
  match=rollTurn(match,6).match;
  match=movePiece(match,0).match;
  assert.equal(match.players[0].pieces[0].steps,0);
  assert.equal(match.turn,0);
  assert.equal(match.pendingRoll,null);
});

test('trois 6 consécutifs passent le tour',()=>{
  let match=createMatch(seats,{tripleSixPenalty:true});
  for(let n=0;n<2;n+=1){
    match=rollTurn(match,6).match;
    match=movePiece(match,n).match;
  }
  const third=rollTurn(match,6);
  assert.equal(third.penalty,true);
  assert.equal(third.match.turn,1);
  assert.equal(third.match.players[0].stats.tripleSixPenalties,1);
});

test('capture renvoie un adversaire à l’écurie',()=>{
  let match=createMatch(seats,{safeCells:false});
  match.players[0].pieces[0].steps=2;
  const landing=globalCellFor('fr',5);
  match.players[1].pieces[0].steps=stepForCell('dz',landing);
  match=rollTurn(match,3).match;
  const result=movePiece(match,0);
  assert.equal(result.match.players[1].pieces[0].steps,STABLE);
  assert.equal(result.match.players[0].stats.captures,1);
});

test('un Sanctuaire empêche une capture',()=>{
  let match=createMatch(seats,{safeCells:true});
  const sanctuary=countryStart('dz');
  match.players[0].pieces[0].steps=stepForCell('fr',sanctuary)-3;
  match.players[1].pieces[0].steps=stepForCell('dz',sanctuary);
  assert.equal(legalMoves(match,3,0).includes(0),false);
});

test('deux Totems alliés forment une barricade infranchissable',()=>{
  let match=createMatch(seats,{safeCells:false,barricades:true});
  const blockedCell=globalCellFor('dz',4);
  match.players[1].pieces[0].steps=4;
  match.players[1].pieces[1].steps=4;
  const frStep=stepForCell('fr',blockedCell);
  match.players[0].pieces[0].steps=(frStep-2+TRACK_LENGTH)%TRACK_LENGTH;
  assert.equal(legalMoves(match,3,0).includes(0),false);
});

test('compte exact obligatoire pour le Nexus',()=>{
  let match=createMatch(seats);
  match.players[0].pieces[0].steps=FINISH_STEP-2;
  assert.deepEqual(legalMoves(match,3,0),[]);
  assert.deepEqual(legalMoves(match,2,0),[0]);
  match=rollTurn(match,2).match;
  match=movePiece(match,0).match;
  assert.equal(match.players[0].pieces[0].steps,FINISH_STEP);
});

test('IA Gardien privilégie une capture sûre',()=>{
  let match=createMatch([{countryId:'fr',type:'bot',aiLevel:'gardien'},{countryId:'dz',type:'human'}],{safeCells:false});
  match.players[0].pieces[0].steps=1;
  match.players[0].pieces[1].steps=10;
  const cell=globalCellFor('fr',4);
  match.players[1].pieces[0].steps=stepForCell('dz',cell);
  match=rollTurn(match,3).match;
  assert.equal(selectBotMove(match,3,0,'gardien'),0);
});

test('timeout joue automatiquement et incrémente la statistique',()=>{
  let match=createMatch(seats);
  match.players[0].pieces[0].steps=3;
  const result=resolveTimeout(match,2);
  assert.equal(result.match.players[0].stats.turnsTimedOut,1);
  assert.equal(result.match.players[0].pieces[0].steps,5);
});

test('sauvegarde V2 round-trip validée',()=>{
  let match=createMatch(seats,{piecesPerPlayer:3,aiLevel:'gardien'});
  match=rollTurn(match,6).match;
  match=movePiece(match,0).match;
  const restored=readMatchSnapshot(serializeMatch(match));
  assert.ok(restored);
  assert.equal(restored.version,2);
  assert.equal(restored.rules.piecesPerPlayer,3);
  assert.equal(restored.players[0].pieces[0].steps,0);
});

test('succès 8 nations et 4 au Nexus sont calculés',()=>{
  const match=createMatch([
    {countryId:'fr'},{countryId:'dz'},{countryId:'es'},{countryId:'ma'},
    {countryId:'it'},{countryId:'tn'},{countryId:'tr'},{countryId:'ee'},
  ]);
  match.players[0].pieces.forEach(piece=>{piece.steps=FINISH_STEP;});
  match.status='finished';match.winner='fr';
  const ids=achievementsFor(match,'fr').map(a=>a.id);
  assert.ok(ids.includes('four-nexus'));
  assert.ok(ids.includes('eight-nations'));
});


test('2v2 exige exactement deux joueurs par équipe',()=>{
  assert.throws(()=>createMatch([
    {countryId:'fr',team:'A'},{countryId:'dz',team:'A'},{countryId:'es',team:'A'},{countryId:'ma',team:'B'},
  ],{teamMode:true}),/deux joueurs dans chaque équipe/);
  const match=createMatch([
    {countryId:'fr',team:'A'},{countryId:'dz',team:'B'},{countryId:'es',team:'A'},{countryId:'ma',team:'B'},
  ],{teamMode:true});
  assert.equal(match.players.filter(p=>p.team==='A').length,2);
  assert.equal(match.players.filter(p=>p.team==='B').length,2);
});

test('un allié 2v2 ne peut jamais être capturé',()=>{
  let match=createMatch([
    {countryId:'fr',team:'A'},{countryId:'dz',team:'B'},{countryId:'es',team:'A'},{countryId:'ma',team:'B'},
  ],{teamMode:true,safeCells:false});
  match.players[0].pieces[0].steps=2;
  const landing=globalCellFor('fr',5);
  match.players[2].pieces[0].steps=stepForCell('es',landing);
  match=rollTurn(match,3).match;
  const result=movePiece(match,0);
  assert.notEqual(result.match.players[2].pieces[0].steps,STABLE);
  assert.equal(result.match.players[0].stats.captures,0);
});

test('deux alliés peuvent former un Bouclier d Alliance',()=>{
  let match=createMatch([
    {countryId:'fr',team:'A'},{countryId:'dz',team:'B'},{countryId:'es',team:'A'},{countryId:'ma',team:'B'},
  ],{teamMode:true,safeCells:false,barricades:true});
  match.players[0].pieces[0].steps=2;
  const landing=globalCellFor('fr',5);
  match.players[2].pieces[0].steps=stepForCell('es',landing);
  match=rollTurn(match,3).match;
  const result=movePiece(match,0);
  assert.equal(result.event.formsBarricade,true);
  assert.equal(result.match.players[0].stats.barricadesFormed,1);
});

test('la victoire 2v2 attend les deux partenaires',()=>{
  let match=createMatch([
    {countryId:'fr',team:'A'},{countryId:'dz',team:'B'},{countryId:'es',team:'A'},{countryId:'ma',team:'B'},
  ],{teamMode:true});
  match.players[0].pieces.forEach(p=>{p.steps=FINISH_STEP;});
  match.players[2].pieces.forEach(p=>{p.steps=FINISH_STEP;});
  match.players[2].pieces[0].steps=FINISH_STEP-1;
  match.turn=2;
  match=rollTurn(match,1).match;
  const result=movePiece(match,0);
  assert.equal(result.match.status,'finished');
  assert.equal(result.match.winnerTeam,'A');
});

test('sauvegarde 2v2 conserve les équipes',()=>{
  const match=createMatch([
    {countryId:'fr',team:'A'},{countryId:'dz',team:'B'},{countryId:'es',team:'A'},{countryId:'ma',team:'B'},
  ],{teamMode:true});
  const restored=readMatchSnapshot(serializeMatch(match));
  assert.ok(restored);
  assert.equal(restored.rules.teamMode,true);
  assert.deepEqual(restored.players.map(p=>p.team),['A','B','A','B']);
});
