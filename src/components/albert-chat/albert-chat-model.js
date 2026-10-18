const LIMITS=Object.freeze({prompt:4000,history:11,total:20000,turns:12,answer:20000});
export const ALBERT_CHAT_LIMITS=LIMITS;
const text=value=>typeof value==='string'?value.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g,'').trim():'';
export function prepareAlbertMessages(turns,prompt){
 const current=text(prompt);if(!current||current.length>LIMITS.prompt)throw Error('Écris une question de 1 à 4 000 caractères.');
 const messages=[{role:'user',content:current}];let count=current.length;
 for(const turn of (Array.isArray(turns)?turns:[]).slice(-5).reverse()){
  const question=text(turn.question).slice(0,4000),answer=text(turn.answer).slice(0,4000);
  if(!question||!answer)continue;
  if(count+question.length+answer.length>LIMITS.total)break;
  messages.unshift({role:'user',content:question},{role:'assistant',content:answer});count+=question.length+answer.length;
 }
 return messages;
}
export function readAlbertReply(payload){
 const answer=text(payload?.answer);if(!answer||answer.length>LIMITS.answer)throw Error('La réponse IA est vide ou trop volumineuse. Réessaie.');
 return {answer,contributors:[...new Set(Array.isArray(payload.contributors)?payload.contributors:[])].filter(id=>['gpt','claude','gemini'].includes(id)),partial:payload.partial===true,synthesized:payload.synthesized===true};
}
export function exportAlbertConversation(turns){
 return JSON.stringify({format:'3b-albert-conversation',version:1,turns:(Array.isArray(turns)?turns:[]).slice(-LIMITS.turns).map(turn=>({question:text(turn.question).slice(0,LIMITS.prompt),answer:text(turn.answer).slice(0,LIMITS.answer),contributors:readAlbertReply(turn).contributors}))},null,2);
}
