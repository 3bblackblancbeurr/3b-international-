import QRCode from 'qrcode';
const APP='https://3b-international.vercel.app';
export function cardReferenceUrl(reference) {
 if(typeof reference!=='string'||!/^[0-9a-f]{64}$/.test(reference))throw Error('Référence de carte invalide.');
 return APP+'/?page=passport&passport_card='+reference;
}
export async function cardQr(reference) {
 const url=cardReferenceUrl(reference);
 return {url,png:await QRCode.toDataURL(url,{errorCorrectionLevel:'M',margin:4,width:420,color:{dark:'#07111fff',light:'#ffffffff'}}),
  svg:await QRCode.toString(url,{type:'svg',errorCorrectionLevel:'M',margin:4,width:420,color:{dark:'#07111fff',light:'#ffffffff'}})};
}
export function nfcSupported(){return typeof window!=='undefined'&&window.isSecureContext&&typeof window.NDEFReader==='function';}
export async function writeCardNfc(reference,{reader,signal}={}) {
 const url=cardReferenceUrl(reference);
 if(!reader){if(!nfcSupported())throw Error('L’écriture NFC nécessite un navigateur Android compatible. Tu peux transmettre le lien à ton fabricant de carte.');reader=new window.NDEFReader();}
 await reader.write({records:[{recordType:'url',data:url}]},{overwrite:false,...(signal?{signal}:{})});
 return {written:true,url}; // Clonable routing reference; authorization stays on the server.
}
