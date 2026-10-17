import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {importCryptoProject} from '../lib/project-config.js';
import {prepareDeploymentPlan,verifyDeploymentLocally} from '../lib/deployment-plan.js';
const args=process.argv.slice(2),input=args[0];
if(!input||input.startsWith('--')){process.stderr.write('Usage: node scripts/prepare-deployment.mjs <project.json> [--verify-local] [--out <plan.json>]\n');process.exitCode=1;}
else try{
 let outputOption=null,verifyLocal=false;
 for(let index=1;index<args.length;index++){const value=args[index];if(value==='--verify-local'&&!verifyLocal){verifyLocal=true;continue;}if(value==='--out'&&outputOption===null&&args[index+1]&&!args[index+1].startsWith('--')){outputOption=args[++index];continue;}throw new Error('Option inconnue ou répétée. Aucun RPC, secret ou réseau distant ne peut être configuré.');}
 const text=readFileSync(resolve(input),'utf8');if(Buffer.byteLength(text)>30000)throw new Error('Manifeste supérieur à 30 Ko.');
 const project=importCryptoProject(text),plan=prepareDeploymentPlan(project);
 if(verifyLocal)plan.localVerification=await verifyDeploymentLocally(plan);
 const output=resolve(outputOption||'build/deployment-plan.json');mkdirSync(dirname(output),{recursive:true});writeFileSync(output,JSON.stringify(plan,null,2)+'\n');
 process.stdout.write('Plan hors ligne préparé'+(plan.localVerification?' et constructeur vérifié en EVM mémoire':'')+'. Aucune signature ni diffusion.\n'+output+'\n');
}catch(error){process.stderr.write(error.message+'\n');process.exitCode=1;}
