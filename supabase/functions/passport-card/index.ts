import {authenticate,Failure,rate,rpc,serve,sha256} from '../_shared/passport-server.ts';
import {randomToken} from '../_shared/passport-security.js';
const ENABLED=Deno.env.get('PASSPORT_CARDS_ENABLED')==='true';
const APP=(Deno.env.get('APP_URL')||'https://3b-international.vercel.app').replace(/\/$/,'');
const configured=()=>{try{return ENABLED&&new URL(APP).protocol==='https:'&&new URL(APP).origin===APP;}catch{return false;}};
const id=(value:unknown)=>{if(typeof value!=='string'||!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(value))throw new Failure(400,'Carte invalide.');return value;};
serve(async(req,body)=>{
 const {userId,sessionId}=await authenticate(req),action=String(body.action||'');
 if(action==='readiness')return {enabled:configured(),mode:'opaque_online_reference',activationRequiresPasskey:true};
 await rate(userId+':passport-card',20,300);
 // Inspection and revocation remain available if issuance is later disabled.
 if(action==='list')return {cards:await rpc('passport_card_list',{p_user:userId,p_session:sessionId})};
 if(action==='resolve'){
  if(typeof body.cardReference!=='string'||!/^[0-9a-f]{64}$/.test(body.cardReference))throw new Failure(400,'Référence de carte invalide.');
  return {card:await rpc('passport_card_resolve',{p_user:userId,p_session:sessionId,p_reference:await sha256(body.cardReference)})};
 }
 if(action==='revoke')return {revoked:await rpc('passport_card_revoke',{p_user:userId,p_session:sessionId,p_card:id(body.cardId)})};
 if(!configured())throw new Failure(503,'Les cartes QR et NFC sont en préparation.');
 if(action==='issue'){
   if(!['digital','physical'].includes(String(body.kind)))throw new Failure(400,'Type de carte invalide.');
   const reference=randomToken();
   const cardId=await rpc('passport_card_issue',{p_user:userId,p_session:sessionId,p_reference:await sha256(reference),
     p_kind:body.kind,p_label:String(body.label||'Ma carte 3B').trim().slice(0,60)||'Ma carte 3B',p_replace:body.replaceCardId?id(body.replaceCardId):null});
   return {cardId,reference,url:APP+'/?page=passport&passport_card='+reference,state:'issued'};
 }
 if(action==='activate'){
   if(typeof body.stepupToken!=='string'||!/^[0-9a-f]{64}$/.test(body.stepupToken))throw new Failure(400,'Confirmation requise.');
   return {activated:await rpc('passport_card_activate',{p_user:userId,p_session:sessionId,p_card:id(body.cardId),p_proof:await sha256(body.stepupToken)})};
 }
 throw new Failure(404,'Action inconnue.');
});
