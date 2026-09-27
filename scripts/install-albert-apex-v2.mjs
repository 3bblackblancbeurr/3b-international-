#!/usr/bin/env node
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const repoRoot=fileURLToPath(new URL('../',import.meta.url));
const sourceDir=path.join(repoRoot,'runtime','albert_apex_v2');
const PACKAGE_VERSION='2.0.0';

function stamp(){
 return new Date().toISOString().replace(/[-:TZ.]/g,'').slice(0,14);
}
function candidates(){
 const rows=[];
 if(process.env.LOCALAPPDATA)rows.push(path.join(process.env.LOCALAPPDATA,'ALBERT_MAX_RUNTIME'));
 rows.push(path.join(os.homedir(),'Documents','ALBERT_Local'));
 return [...new Set(rows)];
}
function firstExisting(rows){
 return rows.find(value=>value&&fs.existsSync(value))||'';
}
function signature(root){
 if(!root)return{ok:false,reasons:['runtime_absent']};
 const python=path.join(root,'.venv','Scripts','python.exe');
 const launchers=[
  path.join(root,'START_ALBERT_APEX.bat'),
  path.join(root,'START_ALBERT_AND_MAX.bat'),
  path.join(root,'START_ALBERT_MAX.bat')
 ];
 const desktop=[
  path.join(root,'desktop','albert_desktop_final.py'),
  path.join(root,'desktop','albert_desktop.py')
 ];
 const launcher=firstExisting(launchers);
 const desktopFile=firstExisting(desktop);
 const reasons=[];
 if(!fs.existsSync(python))reasons.push('python_venv_missing');
 if(!launcher&&!desktopFile)reasons.push('albert_launcher_signature_missing');
 return{ok:reasons.length===0,python,launcher,desktop:desktopFile,reasons};
}
function findRuntime(){
 const root=firstExisting(candidates());
 return{root,signature:signature(root)};
}
function assertSource(){
 for(const file of ['__init__.py','core.py','server.py','manifest.json']){
  if(!fs.existsSync(path.join(sourceDir,file)))throw new Error('Paquet APEX incomplet: '+file);
 }
}
function backupPath(root,label='apex_v2'){
 return path.join(root,'backups',label+'_'+stamp());
}
async function sidecarOnline(){
 try{
  const response=await fetch('http://127.0.0.1:8766/health',{signal:AbortSignal.timeout(1000),cache:'no-store'});
  return response.ok;
 }catch{return false;}
}
function launcherContent(sig){
 const fallback=sig.launcher
  ?'call "%~dp0'+path.basename(sig.launcher)+'"'
  :sig.desktop
   ?'start "" "%PYTHON%" "%~dp0desktop\\'+path.basename(sig.desktop)+'"'
   :'echo Lanceur ALBERT introuvable.& exit /b 2';
 return [
  '@echo off',
  'setlocal',
  'title ALBERT APEX OS V2',
  'cd /d "%~dp0"',
  'set "PYTHON=%~dp0.venv\\Scripts\\python.exe"',
  'if not exist "%PYTHON%" (echo Python ALBERT introuvable.& exit /b 2)',
  'start "ALBERT APEX CORE" /min "%PYTHON%" -m apex_v2.server',
  'timeout /t 1 /nobreak >nul',
  fallback,
  'endlocal'
 ].join('\r\n')+'\r\n';
}
function install(){
 assertSource();
 const found=findRuntime();
 if(!found.signature.ok){
  throw new Error('Installation refusée: signature ALBERT non reconnue ('+found.signature.reasons.join(', ')+').');
 }
 const root=found.root;
 const target=path.join(root,'apex_v2');
 if(fs.existsSync(target)){
  const backup=backupPath(root);
  fs.mkdirSync(path.dirname(backup),{recursive:true});
  fs.renameSync(target,backup);
 }
 fs.cpSync(sourceDir,target,{recursive:true,errorOnExist:false,force:true});
 const data=path.join(root,'data','apex_v2');
 fs.mkdirSync(data,{recursive:true});
 fs.writeFileSync(path.join(data,'install.json'),JSON.stringify({
  installed_at:new Date().toISOString(),
  version:PACKAGE_VERSION,
  runtime_name:path.basename(root),
  installer:'3b-international'
 },null,2),'utf8');
 const launcher=path.join(root,'START_ALBERT_APEX_OS_V2.bat');
 fs.writeFileSync(launcher,launcherContent(found.signature),'utf8');
 return{
  installed:true,
  version:PACKAGE_VERSION,
  runtime_name:path.basename(root),
  target:path.basename(target),
  launcher:path.basename(launcher),
  existing_albert_launcher:Boolean(found.signature.launcher),
  desktop_runtime:Boolean(found.signature.desktop)
 };
}
async function status(){
 const found=findRuntime();
 const root=found.root;
 const installed=Boolean(root&&fs.existsSync(path.join(root,'apex_v2','manifest.json')));
 return{
  runtime_found:Boolean(root),
  runtime_name:root?path.basename(root):null,
  signature_ok:found.signature.ok,
  signature_reasons:found.signature.reasons,
  installed,
  version:installed?JSON.parse(fs.readFileSync(path.join(root,'apex_v2','manifest.json'),'utf8')).version:null,
  launcher_present:Boolean(root&&fs.existsSync(path.join(root,'START_ALBERT_APEX_OS_V2.bat'))),
  sidecar_online:await sidecarOnline()
 };
}
async function remove(){
 const found=findRuntime();
 if(!found.root||!found.signature.ok)throw new Error('Suppression refusée: runtime ALBERT non reconnu.');
 if(await sidecarOnline())throw new Error('Suppression refusée: le service APEX local tourne encore. Ferme ALBERT APEX puis réessaie.');
 const root=found.root,target=path.join(root,'apex_v2');
 if(!fs.existsSync(target))return{removed:false,reason:'not_installed'};
 const backup=backupPath(root,'apex_v2_removed');
 fs.mkdirSync(path.dirname(backup),{recursive:true});
 fs.renameSync(target,backup);
 fs.rmSync(path.join(root,'START_ALBERT_APEX_OS_V2.bat'),{force:true});
 return{removed:true,backup:path.basename(backup)};
}

const command=process.argv[2]||'status';
try{
 if(command==='install')console.log(JSON.stringify(install(),null,2));
 else if(command==='status')console.log(JSON.stringify(await status(),null,2));
 else if(command==='remove')console.log(JSON.stringify(await remove(),null,2));
 else throw new Error('Usage: node scripts/install-albert-apex-v2.mjs install|status|remove');
}catch(error){
 console.error(error instanceof Error?error.message:String(error));
 process.exitCode=1;
}
