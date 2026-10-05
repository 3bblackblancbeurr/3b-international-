import fs from 'node:fs';
import path from 'node:path';

const root=process.cwd();
const read=relative=>fs.readFileSync(path.join(root,relative),'utf8');
const variables=read('android/variables.gradle');
const gradle=read('android/app/build.gradle');
const capacitor=JSON.parse(read('capacitor.config.json'));

const number=(source,name)=>{
  const match=source.match(new RegExp('\\b'+name+'\\s*=\\s*(\\d+)'));
  if(!match)throw new Error('Android readiness: '+name+' introuvable.');
  return Number(match[1]);
};
const quoted=(source,pattern,label)=>{
  const match=source.match(pattern);
  if(!match)throw new Error('Android readiness: '+label+' introuvable.');
  return match[1];
};

const compileSdk=number(variables,'compileSdkVersion');
const targetSdk=number(variables,'targetSdkVersion');
const minSdk=number(variables,'minSdkVersion');
const applicationId=quoted(gradle,/applicationId\s+["']([^"']+)["']/,'applicationId');
const namespace=quoted(gradle,/namespace\s*=\s*["']([^"']+)["']/,'namespace');
const versionCode=Number(quoted(gradle,/versionCode\s+(\d+)/,'versionCode'));
const versionName=quoted(gradle,/versionName\s+["']([^"']+)["']/,'versionName');

const signingEnv=[
  'ANDROID_UPLOAD_KEYSTORE_BASE64',
  'ANDROID_KEYSTORE_PASSWORD',
  'ANDROID_KEY_ALIAS',
  'ANDROID_KEY_PASSWORD'
];
const signingSecretsPresent=signingEnv.every(name=>typeof process.env[name]==='string'&&process.env[name].length>0);

const errors=[];
if(compileSdk!==36)errors.push('compileSdk attendu 36, trouvé '+compileSdk);
if(targetSdk!==36)errors.push('targetSdk attendu 36, trouvé '+targetSdk);
if(minSdk<24)errors.push('minSdk inférieur au plancher 24: '+minSdk);
if(applicationId!==capacitor.appId)errors.push('applicationId '+applicationId+' != Capacitor appId '+capacitor.appId);
if(namespace!==applicationId)errors.push('namespace '+namespace+' != applicationId '+applicationId);
if(!Number.isInteger(versionCode)||versionCode<1)errors.push('versionCode doit être un entier positif.');
if(!versionName.trim())errors.push('versionName vide.');
if(!/buildTypes\s*\{[\s\S]*release\s*\{/.test(gradle))errors.push('buildType release absent.');

const remainingExternalGates=[];
if(!signingSecretsPresent)remainingExternalGates.push('Play App Signing / clé d’upload de distribution');
remainingExternalGates.push('upload Play Console sur piste interne ou fermée');
remainingExternalGates.push('test fermé avec les testeurs requis');

const report={
  checkedAt:new Date().toISOString(),
  readyForUnsignedCiBuild:errors.length===0,
  readyForSignedCiBuild:errors.length===0&&signingSecretsPresent,
  distributionSigningConfigured:signingSecretsPresent,
  playUploadConfigured:signingSecretsPresent,
  applicationId,
  namespace,
  compileSdk,
  targetSdk,
  minSdk,
  versionCode,
  versionName,
  remainingExternalGates,
  errors
};

fs.mkdirSync(path.join(root,'artifacts/mobile'),{recursive:true});
fs.writeFileSync(path.join(root,'artifacts/mobile/play-readiness.json'),JSON.stringify(report,null,2)+'\n','utf8');
console.log(JSON.stringify(report,null,2));
if(errors.length)process.exit(1);
