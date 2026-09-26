#!/usr/bin/env node
import os from 'node:os';
import fs from 'node:fs';
import path from 'node:path';
import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';

const VERSION='1.2.0';
const SUPABASE_URL='https://ttvhcezucsbbmnafrotq.supabase.co';
const PUBLIC_KEY='sb_publishable_MQUCR8oNdpEgeO2iMKnLQw_wj5XdNC4';
const ENDPOINT=SUPABASE_URL+'/functions/v1/control-center-agent';
const root=fileURLToPath(new URL('../',import.meta.url));
const configDir=process.platform==='win32'
 ? path.join(process.env.LOCALAPPDATA||os.homedir(), '3BControl')
 : path.join(os.homedir(),'.config','3b-control');
const configPath=path.join(configDir,'device.json');
const lockPath=path.join(configDir,'agent.lock');
const logPath=path.join(configDir,'agent.log');
const autostartPath=path.join(configDir,'autostart.json');

const CAPABILITIES={
 ping:true,
 system_status:true,
 open_3b:true,
 open_repo:true,
 open_unreal:true,
 unreal_health:true,
 open_github:true,
 open_supabase:true
};

function loadConfig(){
 try{return JSON.parse(fs.readFileSync(configPath,'utf8'));}catch{return null;}
}
function saveConfig(value){
 fs.mkdirSync(configDir,{recursive:true});
 fs.writeFileSync(configPath,JSON.stringify(value,null,2),{encoding:'utf8',mode:0o600});
}
function autostartEnabled(){
 try{
  const meta=JSON.parse(fs.readFileSync(autostartPath,'utf8'));
  return meta?.enabled===true&&typeof meta?.launcher_path==='string'&&fs.existsSync(meta.launcher_path);
 }catch{return false;}
}
function rotateLog(){
 try{
  const stat=fs.statSync(logPath);
  if(stat.size>1024*1024){
   const backup=logPath+'.1';
   try{fs.rmSync(backup,{force:true});}catch{}
   fs.renameSync(logPath,backup);
  }
 }catch{}
}
function log(kind,...parts){
 const line=new Date().toISOString()+' ['+kind+'] '+parts.map(part=>typeof part==='string'?part:JSON.stringify(part)).join(' ');
 try{
  fs.mkdirSync(configDir,{recursive:true});
  rotateLog();
  fs.appendFileSync(logPath,line+'\n','utf8');
 }catch{}
 if(kind==='ERROR')console.error(...parts);
 else console.log(...parts);
}
function pidAlive(pid){
 if(!Number.isInteger(pid)||pid<=0)return false;
 try{process.kill(pid,0);return true;}catch(error){return error?.code==='EPERM';}
}
function acquireLock(){
 fs.mkdirSync(configDir,{recursive:true});
 try{
  const current=JSON.parse(fs.readFileSync(lockPath,'utf8'));
  if(current?.pid&&current.pid!==process.pid&&pidAlive(current.pid)){
   throw new Error('Agent 3B déjà actif (PID '+current.pid+').');
  }
 }catch(error){
  if(error instanceof Error&&error.message.startsWith('Agent 3B déjà actif'))throw error;
 }
 fs.writeFileSync(lockPath,JSON.stringify({pid:process.pid,started_at:new Date().toISOString()}),'utf8');
 const release=()=>{
  try{
   const current=JSON.parse(fs.readFileSync(lockPath,'utf8'));
   if(current?.pid===process.pid)fs.rmSync(lockPath,{force:true});
  }catch{}
 };
 process.once('exit',release);
 process.once('SIGINT',()=>{release();process.exit(0);});
 process.once('SIGTERM',()=>{release();process.exit(0);});
}
function publicHeaders(extra={}){
 return{apikey:PUBLIC_KEY,'Content-Type':'application/json',...extra};
}
async function request(body,token=''){
 const response=await fetch(ENDPOINT,{
  method:'POST',
  headers:publicHeaders(token?{'x-3b-device-token':token}:{}),
  body:JSON.stringify(body),
  signal:AbortSignal.timeout(10000)
 });
 const data=await response.json().catch(()=>({}));
 if(!response.ok)throw new Error(data.error||('HTTP '+response.status));
 return data;
}
function roundGb(bytes){return Math.round(bytes/1024/1024/1024*10)/10;}
function systemStatus(){
 const cpus=os.cpus();
 return{
  hostname:os.hostname(),
  platform:os.platform(),
  release:os.release(),
  arch:os.arch(),
  uptime_seconds:Math.floor(os.uptime()),
  memory_total_gb:roundGb(os.totalmem()),
  memory_free_gb:roundGb(os.freemem()),
  cpu_count:cpus.length,
  cpu_model:cpus[0]?.model||'unknown',
  load_average:os.loadavg().map(v=>Math.round(v*100)/100),
  agent_version:VERSION,
  autostart_enabled:autostartEnabled()
 };
}
function openTarget(target){
 let child;
 if(process.platform==='win32')child=spawn('explorer.exe',[target],{detached:true,stdio:'ignore',windowsHide:true});
 else if(process.platform==='darwin')child=spawn('open',[target],{detached:true,stdio:'ignore'});
 else child=spawn('xdg-open',[target],{detached:true,stdio:'ignore'});
 child.unref();
 return{opened:true};
}
async function unrealHealth(){
 const response=await fetch('http://127.0.0.1:30010/remote/info',{signal:AbortSignal.timeout(3500)});
 if(!response.ok)throw new Error('Unreal Remote Control HTTP '+response.status);
 const data=await response.json().catch(()=>({}));
 const routes=Array.isArray(data?.Routes)?data.Routes:Array.isArray(data?.routes)?data.routes:[];
 return{online:true,route_count:routes.length};
}
async function execute(command){
 switch(command.command_type){
  case'ping':return{pong:true,at:new Date().toISOString()};
  case'system_status':return systemStatus();
  case'open_3b':return openTarget('https://3b-international.vercel.app/');
  case'open_github':return openTarget('https://github.com/3bblackblancbeurr/3b-international-');
  case'open_supabase':return openTarget('https://supabase.com/dashboard/project/ttvhcezucsbbmnafrotq');
  case'open_repo':return openTarget(root);
  case'open_unreal':{
   const project=path.join(root,'unreal','ThreeBWorld','ThreeBWorld.uproject');
   if(!fs.existsSync(project))throw new Error('Projet Unreal introuvable dans '+project);
   return openTarget(project);
  }
  case'unreal_health':return await unrealHealth();
  default:throw new Error('Commande non prise en charge par cet agent.');
 }
}
async function pair(code,name){
 const clean=String(code||'').trim().toUpperCase();
 if(!clean)throw new Error('Usage: npm run control:pair -- CODE [Nom du PC]');
 const data=await request({
  action:'pair',
  code:clean,
  device_name:name||os.hostname()||'PC 3B',
  platform:process.platform,
  agent_version:VERSION,
  capabilities:{...CAPABILITIES,autostart:autostartEnabled()}
 });
 saveConfig({device_id:data.device_id,device_token:data.device_token,paired_at:new Date().toISOString()});
 log('INFO','PC appairé au Centre de commande 3B.');
 log('INFO','Device ID:',data.device_id);
}
async function heartbeat(config){
 return await request({
  action:'heartbeat',
  agent_version:VERSION,
  capabilities:{...CAPABILITIES,autostart:autostartEnabled(),_runtime:systemStatus()}
 },config.device_token);
}
async function complete(config,command,ok,result={},error=''){
 await request({
  action:'complete',
  command_id:command.id,
  ok,
  result,
  error
 },config.device_token);
}
async function tick(config){
 const data=await heartbeat(config);
 const command=data.command;
 if(!command)return false;
 log('INFO',new Date().toLocaleTimeString(),'Commande:',command.command_type);
 try{
  const result=await execute(command);
  await complete(config,command,true,result,'');
  log('INFO','✓ terminée');
 }catch(error){
  await complete(config,command,false,{},error instanceof Error?error.message:String(error));
  log('ERROR','✗',error instanceof Error?error.message:String(error));
 }
 return true;
}
async function run(){
 const config=loadConfig();
 if(!config?.device_token)throw new Error('Ce PC n’est pas appairé. Crée un code dans l’application puis lance: npm run control:pair -- CODE');
 acquireLock();
 log('INFO','Agent 3B actif —',os.hostname(),'— version',VERSION,'— Ctrl+C pour arrêter.');
 let delay=3000;
 while(true){
  try{
   await tick(config);
   delay=3000;
  }catch(error){
   log('ERROR','Connexion:',error instanceof Error?error.message:String(error),'— nouvelle tentative dans',Math.round(delay/1000)+' s');
   delay=Math.min(Math.round(delay*1.6),30000);
  }
  await new Promise(resolve=>setTimeout(resolve,delay));
 }
}
async function once(){
 const config=loadConfig();
 if(!config?.device_token)throw new Error('PC non appairé.');
 const did=await tick(config);
 if(!did)log('INFO','Aucune commande en attente.');
}
function localStatus(){
 const config=loadConfig();
 console.log(JSON.stringify({
  paired:!!config?.device_token,
  device_id:config?.device_id||null,
  config_path:configPath,
  log_path:logPath,
  autostart_enabled:autostartEnabled(),
  ...systemStatus()
 },null,2));
}

const [command,arg1,...rest]=process.argv.slice(2);
try{
 if(command==='pair')await pair(arg1,rest.join(' ').trim());
 else if(command==='run')await run();
 else if(command==='once')await once();
 else if(command==='status')localStatus();
 else{
  console.log('3B Control Agent');
  console.log('  npm run control:pair -- CODE [Nom du PC]');
  console.log('  npm run control:agent');
  console.log('  npm run control:once');
  console.log('  npm run control:status');
  console.log('  npm run control:auto-start');
 }
}catch(error){
 console.error(error instanceof Error?error.message:String(error));
 process.exitCode=1;
}
