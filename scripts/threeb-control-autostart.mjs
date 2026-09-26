#!/usr/bin/env node
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';

const repoRoot=fileURLToPath(new URL('../',import.meta.url));
const agentPath=path.join(repoRoot,'scripts','threeb-control-agent.mjs');
const configDir=process.platform==='win32'
 ? path.join(process.env.LOCALAPPDATA||os.homedir(),'3BControl')
 : path.join(os.homedir(),'.config','3b-control');
const configPath=path.join(configDir,'device.json');
const metaPath=path.join(configDir,'autostart.json');

function ensureWindows(){
 if(process.platform!=='win32')throw new Error('Le démarrage automatique 3B est prévu pour Windows.');
}
function startupDir(){
 const appData=process.env.APPDATA;
 if(!appData)throw new Error('APPDATA introuvable.');
 return path.join(appData,'Microsoft','Windows','Start Menu','Programs','Startup');
}
function launcherPath(){
 return path.join(startupDir(),'3B Control Agent.vbs');
}
function paired(){
 try{return Boolean(JSON.parse(fs.readFileSync(configPath,'utf8'))?.device_token);}catch{return false;}
}
function vbsString(value){return String(value).replace(/"/g,'""');}
function buildLauncher(){
 const node=vbsString(process.execPath);
 const agent=vbsString(agentPath);
 return [
  'Option Explicit',
  'Dim shell, nodePath, agentPath, command',
  'Set shell = CreateObject("WScript.Shell")',
  'nodePath = "'+node+'"',
  'agentPath = "'+agent+'"',
  'command = Chr(34) & nodePath & Chr(34) & " " & Chr(34) & agentPath & Chr(34) & " run"',
  'shell.Run command, 0, False'
 ].join('\r\n')+'\r\n';
}
function readMeta(){
 try{return JSON.parse(fs.readFileSync(metaPath,'utf8'));}catch{return null;}
}
function state(){
 const launcher=process.platform==='win32'?launcherPath():null;
 const meta=readMeta();
 return{
  supported:process.platform==='win32',
  paired:paired(),
  enabled:Boolean(launcher&&fs.existsSync(launcher)&&meta?.enabled===true),
  launcher_path:launcher,
  agent_path:agentPath,
  node_path:process.execPath,
  installed_at:meta?.installed_at||null
 };
}
function startAgent(){
 const child=spawn(process.execPath,[agentPath,'run'],{
  detached:true,
  stdio:'ignore',
  windowsHide:true,
  cwd:repoRoot
 });
 child.unref();
}
function install(){
 ensureWindows();
 if(!paired())throw new Error('Le PC doit être appairé avant d’activer le démarrage automatique.');
 if(!fs.existsSync(agentPath))throw new Error('Agent 3B introuvable: '+agentPath);
 fs.mkdirSync(configDir,{recursive:true});
 fs.mkdirSync(startupDir(),{recursive:true});
 const launcher=launcherPath();
 fs.writeFileSync(launcher,buildLauncher(),'utf8');
 fs.writeFileSync(metaPath,JSON.stringify({
  enabled:true,
  installed_at:new Date().toISOString(),
  launcher_path:launcher,
  agent_path:agentPath,
  node_path:process.execPath
 },null,2),'utf8');
 startAgent();
 console.log('Démarrage automatique 3B activé.');
 console.log('Windows lancera désormais le Control Agent automatiquement à chaque connexion.');
 console.log('État:',JSON.stringify(state(),null,2));
}
function remove(){
 ensureWindows();
 const launcher=launcherPath();
 try{fs.rmSync(launcher,{force:true});}catch{}
 try{fs.rmSync(metaPath,{force:true});}catch{}
 console.log('Démarrage automatique 3B désactivé.');
}
const command=String(process.argv[2]||'status').toLowerCase();
try{
 if(command==='install')install();
 else if(command==='remove'||command==='uninstall')remove();
 else if(command==='status')console.log(JSON.stringify(state(),null,2));
 else throw new Error('Usage: install | status | remove');
}catch(error){
 console.error(error instanceof Error?error.message:String(error));
 process.exitCode=1;
}
