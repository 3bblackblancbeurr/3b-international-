import test from 'node:test';
import assert from 'node:assert/strict';
import jsQR from 'jsqr';
import {PNG} from 'pngjs';
import {cardQr,cardReferenceUrl,writeCardNfc} from '../src/passport/card-reference.js';
const reference='7'.repeat(64);
test('real generated PNG QR decodes to exactly the opaque routing URL, without a consent ticket or personal data',async()=>{
 const qr=await cardQr(reference),png=PNG.sync.read(Buffer.from(qr.png.split(',')[1],'base64'));
 const decoded=jsQR(new Uint8ClampedArray(png.data),png.width,png.height);
 assert.ok(decoded,'QR must be decodable');assert.equal(decoded.data,qr.url);assert.equal(qr.url,cardReferenceUrl(reference));
 const url=new URL(decoded.data);assert.equal(url.searchParams.get('passport_card'),reference);assert.equal(url.searchParams.has('passport_request'),false);
 assert.deepEqual([...url.searchParams.keys()],['page','passport_card']);assert.match(qr.svg,/<svg/);
});
test('malformed and injected references never reach the QR or NFC encoder',async()=>{
 for(const ref of ['',reference.toUpperCase().replace('7','A'),reference+'&passport_request=forged','https://evil.example',null]){
  assert.throws(()=>cardReferenceUrl(ref));await assert.rejects(cardQr(ref));
 }
});
test('NFC writes exactly the same reference URL and never claims success after a write failure',async()=>{
 let payload,options;const result=await writeCardNfc(reference,{reader:{write:async(value,config)=>{payload=value;options=config;}}});
 assert.equal(result.written,true);assert.deepEqual(payload,{records:[{recordType:'url',data:cardReferenceUrl(reference)}]});
 assert.deepEqual(options,{overwrite:false});
 await assert.rejects(writeCardNfc(reference,{reader:{write:async()=>{throw Error('permission denied');}}}),/permission denied/);
});
