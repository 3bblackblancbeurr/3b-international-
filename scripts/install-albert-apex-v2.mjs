#!/usr/bin/env node
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';

const repoRoot=fileURLToPath(new URL('../',import.meta.url));
const sourceDir=path.join(repoRoot,'runtime','albert_apex_v2');
const PACKAGE_VERSION='2.2.0';
const HEAD_MARK='<!-- ALBERT_APEX_V2_HEAD -->';
const BODY_MARK='<!-- ALBERT_APEX_V2_BODY -->';
const HEAD_END_MARK='<!-- ALBERT_APEX_V2_HEAD_END -->';
const BODY_END_MARK='<!-- ALBERT_APEX_V2_BODY_END -->';

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
 for(const file of ['__init__.py','core.py','server.py','manifest.json','web/apex-widget.js','web/apex-widget.css']){
  if(!fs.existsSync(path.join(sourceDir,file)))throw new Error('Paquet APEX incomplet: '+file);
 }
}
function backupPath(root,label='apex_v2'){
 return path.join(root,'backups',label+'_'+stamp());
}
function uiSignature(root){
 const index=path.join(root,'static','index.html');
 if(!fs.existsSync(index))return{ok:false,index,reasons:['static_index_missing']};
 const html=fs.readFileSync(index,'utf8');
 const identity=/ALBERT/i.test(html);
 const navigation=/(Créer|Projets|Mémoire|Tâches)/i.test(html);
 const structure=/<\/head>/i.test(html)&&/<\/body>/i.test(html);
 const reasons=[];
 if(!identity)reasons.push('albert_identity_missing');
 if(!navigation)reasons.push('apex_navigation_signature_missing');
 if(!structure)reasons.push('html_structure_missing');
 return{ok:reasons.length===0,index,html,reasons};
}
function patchUi(root){
 const ui=uiSignature(root);
 if(!ui.ok)throw new Error('Injection UI refusée: signature interface ALBERT non reconnue ('+ui.reasons.join(', ')+').');
 const staticTarget=path.join(root,'static','apex_v2');
 fs.rmSync(staticTarget,{recursive:true,force:true});
 fs.cpSync(path.join(sourceDir,'web'),staticTarget,{recursive:true,force:true});
 // Existing Albert servers can return index.html without serving new static
 // routes. Inline only these vetted, local resources; no remote script or CDN.
 const css=fs.readFileSync(path.join(sourceDir,'web','apex-widget.css'),'utf8');
 const script=fs.readFileSync(path.join(sourceDir,'web','apex-widget.js'),'utf8');
 if(/<\/style/i.test(css)||/<\/script/i.test(script)){
  throw new Error('Injection UI refusée: contenu inline non sûr.');
 }
 const head=HEAD_MARK+'\n<style id="albert-apex-v2-style">\n'+css+'\n</style>\n'+HEAD_END_MARK;
 const body=BODY_MARK+'\n<script id="albert-apex-v2-script">\n'+script+'\n</script>\n'+BODY_END_MARK;
 const legacyHead=HEAD_MARK+'\n<link rel="stylesheet" href="/apex_v2/apex-widget.css">';
 const legacyBody=BODY_MARK+'\n<script defer src="/apex_v2/apex-widget.js"></script>';
 let html=ui.html;
 const existed=html.includes(HEAD_MARK)||html.includes(BODY_MARK);
 if(existed){
  if(!html.includes(HEAD_MARK)||!html.includes(BODY_MARK)){
   throw new Error('Injection UI refusée: marqueurs APEX incomplets.');
  }
  if(html.includes(HEAD_END_MARK)&&html.includes(BODY_END_MARK)){
   for(const [start,end,replacement] of [[HEAD_MARK,HEAD_END_MARK,head],[BODY_MARK,BODY_END_MARK,body]]){
    const from=html.indexOf(start),to=html.indexOf(end,from);
    if(from<0||to<from)throw new Error('Injection UI refusée: bloc APEX invalide.');
    html=html.slice(0,from)+replacement+html.slice(to+end.length);
   }
  }else if(html.includes(legacyHead)&&html.includes(legacyBody)){
   html=html.replace(legacyHead,head).replace(legacyBody,body);
  }else{
   throw new Error('Injection UI refusée: format APEX existant non reconnu.');
  }
  fs.writeFileSync(ui.index,html,'utf8');
  return{patched:true,backup:null};
 }
 const backup=backupPath(root,'index_before_apex_v2')+'.html';
 fs.mkdirSync(path.dirname(backup),{recursive:true});
 fs.copyFileSync(ui.index,backup);
 html=html.replace(/<\/head>/i,head+'\n</head>').replace(/<\/body>/i,body+'\n</body>');
 fs.writeFileSync(ui.index,html,'utf8');
 return{patched:true,backup};
}
function restoreUi(root,installMeta={}){
 const index=path.join(root,'static','index.html');
 const rootResolved=path.resolve(root)+path.sep;
 const candidate=installMeta.ui_backup?path.resolve(root,installMeta.ui_backup):'';
 const backup=candidate&&candidate.startsWith(rootResolved)?candidate:'';
 if(backup&&fs.existsSync(backup)&&fs.existsSync(index)){
  const current=fs.readFileSync(index,'utf8');
  if(current.includes(HEAD_MARK)||current.includes(BODY_MARK))fs.copyFileSync(backup,index);
 }
 fs.rmSync(path.join(root,'static','apex_v2'),{recursive:true,force:true});
}
async function sidecarOnline(){
 try{
  const response=await fetch('http://127.0.0.1:8767/health',{signal:AbortSignal.timeout(1000),cache:'no-store'});
  if(!response.ok)return false;
  const data=await response.json();
  return data?.ok===true&&data?.name==='ALBERT APEX OS V2';
 }catch{return false;}
}
function vbsString(value){return String(value).replace(/"/g,'""');}
function shortcutCandidates(){
 return[
  path.join(os.homedir(),'OneDrive','Desktop','ALBERT.lnk'),
  path.join(os.homedir(),'Desktop','ALBERT.lnk')
 ];
}
function patchDesktopShortcut(root){
 if(process.platform!=='win32')return{patched:false,path:null,backup:null};
 const existing=firstExisting(shortcutCandidates());
 const desktopDir=firstExisting([
  path.join(os.homedir(),'OneDrive','Desktop'),
  path.join(os.homedir(),'Desktop')
 ]);
 if(!existing&&!desktopDir)return{patched:false,path:null,backup:null};
 const shortcut=existing||path.join(desktopDir,'ALBERT APEX OS V2.lnk');
 let backup=null;
 if(existing){
  backup=backupPath(root,'ALBERT_shortcut_before_apex_v2')+'.lnk';
  fs.mkdirSync(path.dirname(backup),{recursive:true});
  fs.copyFileSync(existing,backup);
 }
 const data=path.join(root,'data','apex_v2');
 fs.mkdirSync(data,{recursive:true});
 const temp=path.join(data,'shortcut_patch.vbs');
 const launcher=path.join(root,'START_ALBERT_APEX_OS_V2.bat');
 const hiddenLauncher=path.join(root,'START_ALBERT_APEX_OS_V2.vbs');
 const wscript=path.join(process.env.WINDIR||'C:\\Windows','System32','wscript.exe');
 const icon=firstExisting([
  path.join(root,'branding','ALBERT_MAX.ico'),
  path.join(root,'assets','albert-desktop.ico')
 ]);
 const lines=[
  'Option Explicit',
  'Dim shell, link',
  'Set shell = CreateObject("WScript.Shell")',
  'Set link = shell.CreateShortcut("'+vbsString(shortcut)+'")',
  'link.TargetPath = "'+vbsString(fs.existsSync(wscript)?wscript:hiddenLauncher)+'"',
  ...(fs.existsSync(wscript)?['link.Arguments = "'+vbsString(hiddenLauncher)+'"']:[]),
  'link.WorkingDirectory = "'+vbsString(root)+'"',
  'link.Description = "ALBERT APEX OS V2"'
 ];
 if(icon)lines.push('link.IconLocation = "'+vbsString(icon)+',0"');
 lines.push('link.WindowStyle = 1','link.Save');
 fs.writeFileSync(temp,lines.join('\r\n')+'\r\n','utf8');
 const result=spawnSync('cscript.exe',['//NoLogo',temp],{encoding:'utf8',windowsHide:true,timeout:5000});
 fs.rmSync(temp,{force:true});
 if(result.error||result.status!==0)throw new Error('Mise à jour du raccourci ALBERT impossible.');
 return{patched:true,path:shortcut,backup,created:!existing};
}
function restoreDesktopShortcut(root,installMeta={}){
 const shortcut=typeof installMeta.shortcut_path==='string'?installMeta.shortcut_path:'';
 const rootResolved=path.resolve(root)+path.sep;
 const candidate=installMeta.shortcut_backup?path.resolve(root,installMeta.shortcut_backup):'';
 const backup=candidate&&candidate.startsWith(rootResolved)?candidate:'';
 if(backup&&fs.existsSync(backup)&&shortcut){
  fs.copyFileSync(backup,shortcut);
  return;
 }
 if(installMeta.shortcut_created===true&&shortcut)fs.rmSync(shortcut,{force:true});
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
function hiddenLauncherContent(root){
 const batch=path.join(root,'START_ALBERT_APEX_OS_V2.bat');
 return[
  'Option Explicit',
  'Dim shell, command',
  'Set shell = CreateObject("WScript.Shell")',
  'command = Chr(34) & "'+vbsString(batch)+'" & Chr(34)',
  'shell.Run command, 0, False'
 ].join('\r\n')+'\r\n';
}
async function install(){
 assertSource();
 // Never swap a running private core's files underneath active requests.
 if(await sidecarOnline())throw new Error('Mise à jour APEX refusée : arrête d’abord le service APEX local.');
 const found=findRuntime();
 if(!found.signature.ok){
  throw new Error('Installation refusée: signature ALBERT non reconnue ('+found.signature.reasons.join(', ')+').');
 }
 const root=found.root;
 const data=path.join(root,'data','apex_v2');
 const installPath=path.join(data,'install.json');
 let previous={};
 if(fs.existsSync(installPath)){
  try{
   previous=JSON.parse(fs.readFileSync(installPath,'utf8'));
   if(!previous||typeof previous!=='object'||Array.isArray(previous))throw new Error('bad metadata');
  }catch{throw new Error('Installation refusée: métadonnées de sauvegarde précédentes illisibles.');}
 }
 const uiCheck=uiSignature(root);
 if(!uiCheck.ok)throw new Error('Installation refusée: interface ALBERT non reconnue ('+uiCheck.reasons.join(', ')+').');
 const target=path.join(root,'apex_v2');
 if(fs.existsSync(target)){
  const backup=backupPath(root);
  fs.mkdirSync(path.dirname(backup),{recursive:true});
  // The user's backup folder may be a junction to drive D:. Rename fails
  // across volumes (EXDEV), so snapshot first and retain the original.
  fs.cpSync(target,backup,{recursive:true,errorOnExist:true,force:false});
 }
 fs.cpSync(sourceDir,target,{recursive:true,errorOnExist:false,force:true});
 const ui=patchUi(root);
 fs.mkdirSync(data,{recursive:true});
 fs.writeFileSync(installPath,JSON.stringify({
  installed_at:previous.installed_at||new Date().toISOString(),
  updated_at:new Date().toISOString(),
  version:PACKAGE_VERSION,
  runtime_name:path.basename(root),
  installer:'3b-international',
  ui_injected:true,
  // Retain the ORIGINAL pre-APEX UI backup across repeat installations.
  ui_backup:previous.ui_backup||(ui.backup?path.relative(root,ui.backup):null)
 },null,2),'utf8');
 const launcher=path.join(root,'START_ALBERT_APEX_OS_V2.bat');
 const hiddenLauncher=path.join(root,'START_ALBERT_APEX_OS_V2.vbs');
 fs.writeFileSync(launcher,launcherContent(found.signature),'utf8');
 fs.writeFileSync(hiddenLauncher,hiddenLauncherContent(root),'utf8');
 const shortcut=patchDesktopShortcut(root);
 const installMeta=JSON.parse(fs.readFileSync(installPath,'utf8'));
 installMeta.shortcut_path=previous.shortcut_path||shortcut.path;
 // Never replace the first original-shortcut backup with a newer APEX shortcut.
 installMeta.shortcut_backup=previous.shortcut_backup||(shortcut.backup?path.relative(root,shortcut.backup):null);
 installMeta.shortcut_created=previous.shortcut_created===true||shortcut.created===true;
 fs.writeFileSync(installPath,JSON.stringify(installMeta,null,2),'utf8');
 return{
  installed:true,
  version:PACKAGE_VERSION,
  runtime_name:path.basename(root),
  target:path.basename(target),
  launcher:path.basename(launcher),
  existing_albert_launcher:Boolean(found.signature.launcher),
  desktop_runtime:Boolean(found.signature.desktop),
  ui_injected:true,
  shortcut_patched:shortcut.patched
 };
}
async function status(){
 const found=findRuntime();
 const root=found.root;
 const installed=Boolean(root&&fs.existsSync(path.join(root,'apex_v2','manifest.json')));
 const ui=root?uiSignature(root):{html:''};
 return{
  runtime_found:Boolean(root),
  runtime_name:root?path.basename(root):null,
  signature_ok:found.signature.ok,
  signature_reasons:found.signature.reasons,
  installed,
  version:installed?JSON.parse(fs.readFileSync(path.join(root,'apex_v2','manifest.json'),'utf8')).version:null,
  launcher_present:Boolean(root&&fs.existsSync(path.join(root,'START_ALBERT_APEX_OS_V2.bat'))),
  hidden_launcher_present:Boolean(root&&fs.existsSync(path.join(root,'START_ALBERT_APEX_OS_V2.vbs'))),
  ui_injected:Boolean(ui.html&&ui.html.includes(HEAD_MARK)&&ui.html.includes(BODY_MARK)),
  shortcut_present:Boolean(shortcutCandidates().some(value=>fs.existsSync(value))),
  sidecar_online:await sidecarOnline()
 };
}
async function remove(){
 const found=findRuntime();
 if(!found.root||!found.signature.ok)throw new Error('Suppression refusée: runtime ALBERT non reconnu.');
 if(await sidecarOnline())throw new Error('Suppression refusée: le service APEX local tourne encore. Ferme ALBERT APEX puis réessaie.');
 const root=found.root,target=path.join(root,'apex_v2');
 if(!fs.existsSync(target))return{removed:false,reason:'not_installed'};
 const installPath=path.join(root,'data','apex_v2','install.json');
 const installMeta=fs.existsSync(installPath)?JSON.parse(fs.readFileSync(installPath,'utf8')):{};
 const backup=backupPath(root,'apex_v2_removed');
 fs.mkdirSync(path.dirname(backup),{recursive:true});
 fs.cpSync(target,backup,{recursive:true,errorOnExist:true,force:false});
 // Only alter the local UI after the cross-volume backup has succeeded.
 restoreUi(root,installMeta);
 restoreDesktopShortcut(root,installMeta);
 fs.rmSync(target,{recursive:true,force:true});
 fs.rmSync(path.join(root,'START_ALBERT_APEX_OS_V2.bat'),{force:true});
 fs.rmSync(path.join(root,'START_ALBERT_APEX_OS_V2.vbs'),{force:true});
 return{removed:true,backup:path.basename(backup)};
}

const command=process.argv[2]||'status';
try{
 if(command==='install')console.log(JSON.stringify(await install(),null,2));
 else if(command==='status')console.log(JSON.stringify(await status(),null,2));
 else if(command==='remove')console.log(JSON.stringify(await remove(),null,2));
 else throw new Error('Usage: node scripts/install-albert-apex-v2.mjs install|status|remove');
}catch(error){
 console.error(error instanceof Error?error.message:String(error));
 process.exitCode=1;
}
