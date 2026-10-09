import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createLensCameraController} from '../src/world/invisible/xr-session.js';

const read=path=>readFile(new URL('../'+path,import.meta.url),'utf8');
const android=await read('android/app/src/main/AndroidManifest.xml');
const ios=await read('ios/App/App/Info.plist');
function attributes(xml,tag){return [...xml.matchAll(new RegExp('<'+tag+'\\b([^>]*)>','g'))].map(match=>Object.fromEntries([...match[1].matchAll(/([\w:.-]+)\s*=\s*"([^"]*)"/g)].map(value=>[value[1],value[2]])));}
const permissions=new Set(attributes(android,'uses-permission').map(value=>value['android:name']));
const features=new Map(attributes(android,'uses-feature').map(value=>[value['android:name'],value['android:required']]));
const iosStrings=new Map([...ios.matchAll(/<key>([^<]+)<\/key>\s*<string>([^<]*)<\/string>/g)].map(match=>[match[1],match[2]]));

test('native camera declarations allow video while preserving devices without cameras',()=>{
 assert.ok(permissions.has('android.permission.CAMERA'));
 for(const feature of ['android.hardware.camera.any','android.hardware.camera','android.hardware.camera.autofocus'])assert.equal(features.get(feature),'false',feature+' must remain optional');
 for(const permission of ['RECORD_AUDIO','MODIFY_AUDIO_SETTINGS','READ_MEDIA_IMAGES','READ_MEDIA_VIDEO','WRITE_EXTERNAL_STORAGE'])assert.equal(permissions.has('android.permission.'+permission),false,permission+' is unnecessary for a transient video preview');
 assert.match(iosStrings.get('NSCameraUsageDescription')||'',/caméra.*Monde Invisible/);
 assert.match(iosStrings.get('NSCameraUsageDescription')||'',/sans caméra/);
 assert.equal(ios.includes('<key>NSMicrophoneUsageDescription</key>'),false);
});

test('native location is foreground only and remains optional for installation',()=>{
 // Capacitor 8's stock WebView bridge requests this pair and accepts a
 // coarse-only grant on Android 12+, unlike its Android 7–11 path.
 for(const permission of ['ACCESS_COARSE_LOCATION','ACCESS_FINE_LOCATION'])assert.ok(permissions.has('android.permission.'+permission));
 assert.equal(permissions.has('android.permission.ACCESS_BACKGROUND_LOCATION'),false);
 for(const feature of ['android.hardware.location','android.hardware.location.gps','android.hardware.location.network'])assert.equal(features.get(feature),'false',feature+' must remain optional');
 assert.match(iosStrings.get('NSLocationWhenInUseUsageDescription')||'',/repère du Monde Invisible.*distance parcourue dans le Monde 3B/);
 assert.match(iosStrings.get('NSLocationWhenInUseUsageDescription')||'',/sans localisation/);
 for(const key of ['NSLocationAlwaysUsageDescription','NSLocationAlwaysAndWhenInUseUsageDescription','NSMotionUsageDescription'])assert.equal(ios.includes('<key>'+key+'</key>'),false,key+' is unnecessary for this web opt-in');
 const background=ios.match(/<key>UIBackgroundModes<\/key>\s*<array>([\s\S]*?)<\/array>/)?.[1]||'';
 assert.doesNotMatch(background,/<string>(location|audio)<\/string>/);
 const required=ios.match(/<key>UIRequiredDeviceCapabilities<\/key>\s*<array>([\s\S]*?)<\/array>/)?.[1]||'';
 assert.doesNotMatch(required,/<string>(gps|location-services|still-camera|video-camera|microphone)<\/string>/);
});

test('camera request is explicit, video-only, and releases the preview on stop',async()=>{
 const requests=[];let stops=0;
 const controller=createLensCameraController({mediaDevices:{getUserMedia:async options=>{requests.push(options);return {getTracks:()=>[{stop:()=>stops++}]};}}});
 await Promise.resolve();assert.equal(requests.length,0,'initializing a viewer must not ask for native permission');
 assert.equal(await controller.start(),true);assert.equal(requests.length,1);assert.equal(requests[0].audio,false);assert.equal(requests[0].video.facingMode.ideal,'environment');
 controller.stop();assert.equal(stops,1);assert.equal(controller.active,false);
 const unavailable=createLensCameraController({mediaDevices:{}});await assert.rejects(unavailable.start());assert.equal(unavailable.active,false);
});

test('GPS remains a bounded button action with a cancellation and remote fallback',async()=>{
 const source=await read('src/world/invisible/WalkCheck.jsx');
 assert.match(source,/onClick=\{locate\}/);assert.match(source,/function locate\(\)/);
 assert.match(source,/watchPosition\(/);assert.match(source,/enableHighAccuracy\s*:\s*false/);assert.match(source,/maximumAge\s*:\s*0/);assert.match(source,/timeout\s*:\s*12000/);
 assert.match(source,/clearWatch\(watch\.current\)/);assert.match(source,/visibilitychange/);assert.match(source,/onRemote\(\)/);
 const mountEffect=source.match(/useEffect\(\(\)=>\{([\s\S]*?)\},\[\]\)/)?.[1]||'';
 assert.doesNotMatch(mountEffect,/watchPosition|getCurrentPosition|locate\(/,'mounting the walk view must not request GPS');
});

const config=JSON.parse(await read('vercel.json'));
const policyFor=rule=>Object.fromEntries(rule.headers.find(header=>header.key.toLowerCase()==='permissions-policy').value.split(',').map(value=>value.trim().split('=')));

test('the deployed application permits explicit camera, motion and spatial tracking only on its own origin',()=>{
 const rules=config.headers.filter(rule=>rule.source.startsWith('/:path('));
 assert.equal(rules.length,1);
 const policy=policyFor(rules[0]);
 for(const feature of ['camera','accelerometer','gyroscope','magnetometer','xr-spatial-tracking'])assert.equal(policy[feature],'(self)',feature);
 assert.equal(policy.microphone,'(self)');
 assert.equal(policy.geolocation,'(self)');
});

test('the embedded sport shell keeps its restrictive device permissions',()=>{
 const shell=config.headers.find(rule=>rule.source==='/sport-player-shell.html');
 const policy=policyFor(shell);
 for(const feature of ['camera','microphone','geolocation'])assert.equal(policy[feature],'()',feature);
});
