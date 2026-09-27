export async function* readEvents(body){
 if(!body)throw Error('Flux indisponible.');
 const reader=body.getReader(),decoder=new TextDecoder();let buffer='',total=0;
 try{
  while(true){
   const {done,value}=await reader.read();
   if(done)break;
   total+=value.length;if(total>500000)throw Error('Flux trop volumineux.');
   buffer+=decoder.decode(value,{stream:true}).replace(/\r/g,'');
   let end;
   while((end=buffer.indexOf('\n\n'))!==-1){
    const block=buffer.slice(0,end);buffer=buffer.slice(end+2);
    const data=block.split('\n').filter(l=>l.startsWith('data:')).map(l=>l.slice(5).trimStart()).join('\n');
    if(data&&data!=='[DONE]')yield JSON.parse(data);
   }
  }
 }finally{await reader.cancel().catch(()=>{});reader.releaseLock();}
}
// Decode only the first JSON text string as it arrives; incomplete escapes wait.
export function partialText(raw){
 const match=/"text"\s*:\s*"/.exec(raw);if(!match)return '';
 let text='',i=match.index+match[0].length;
 while(i<raw.length){
  const c=raw[i++];if(c==='"')break;
  if(c!=='\\'){text+=c;continue;}
  if(i>=raw.length)break;
  const e=raw[i++];
  if(e==='u'){if(i+4>raw.length)break;const hex=raw.slice(i,i+4);if(!/^[0-9a-f]{4}$/i.test(hex))break;text+=String.fromCharCode(parseInt(hex,16));i+=4;}
  else text+=({n:'\n',r:'\r',t:'\t',b:'\b',f:'\f','"':'"','\\':'\\','/':'/'})[e]??'';
 }
 return text;
}
