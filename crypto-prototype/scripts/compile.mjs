import {createHash} from 'node:crypto';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {resolve,sep} from 'node:path';
import solc from 'solc';

const root=process.cwd(),entry='contracts/ThreeBTokenPrototype.sol';
const sources={[entry]:{content:readFileSync(resolve(root,entry),'utf8')}};
function findImports(name){
 if(!name.startsWith('@openzeppelin/contracts/'))return {error:'Only pinned OpenZeppelin imports are permitted.'};
 const allowed=resolve(root,'node_modules/@openzeppelin/contracts'),path=resolve(root,'node_modules',name);
 if(!path.startsWith(allowed+sep))return {error:'Import escapes the library directory.'};
 try{const content=readFileSync(path,'utf8');sources[name]={content};return {contents:content};}catch{return {error:'Import unavailable: '+name};}
}
const settings={optimizer:{enabled:true,runs:200},evmVersion:'cancun',viaIR:false,outputSelection:{'*':{'*':['abi','metadata','evm.bytecode.object','evm.deployedBytecode.object','evm.methodIdentifiers']}}};
const input={language:'Solidity',sources,settings};
let output=JSON.parse(solc.compile(JSON.stringify(input),{import:findImports}));
// Store a complete Standard JSON input so every dependency source is reproducible.
output=JSON.parse(solc.compile(JSON.stringify(input)));
const diagnostics=output.errors||[];
if(diagnostics.some(item=>item.severity==='error')){for(const item of diagnostics)process.stderr.write(item.formattedMessage+'\n');process.exit(1);}
const compiled=output.contracts[entry].ThreeBTokenPrototype;
const artifact={contractName:'ThreeBTokenPrototype',sourceName:entry,compiler:solc.version(),settings,abi:compiled.abi,bytecode:'0x'+compiled.evm.bytecode.object,deployedBytecode:'0x'+compiled.evm.deployedBytecode.object,methodIdentifiers:compiled.evm.methodIdentifiers,metadata:JSON.parse(compiled.metadata)};
const sha256=value=>createHash('sha256').update(value).digest('hex');
const artifactText=JSON.stringify(artifact,null,2)+'\n';
const report={status:'compiled',scope:'local-only; no public deployment',compiler:solc.version(),node:process.version,evmVersion:settings.evmVersion,optimizer:settings.optimizer,viaIR:settings.viaIR,sourceCount:Object.keys(sources).length,creationBytecodeBytes:compiled.evm.bytecode.object.length/2,runtimeBytecodeBytes:compiled.evm.deployedBytecode.object.length/2,errors:diagnostics.filter(item=>item.severity==='error'),warnings:diagnostics.filter(item=>item.severity==='warning').map(item=>item.formattedMessage),sha256:{entry:sha256(sources[entry].content),lockfile:sha256(readFileSync(resolve(root,'package-lock.json'))),artifact:sha256(artifactText)},packages:JSON.parse(readFileSync(resolve(root,'package.json'),'utf8'))};
mkdirSync(resolve(root,'build'),{recursive:true});
writeFileSync(resolve(root,'build/standard-input.json'),JSON.stringify(input,null,2)+'\n');
writeFileSync(resolve(root,'build/ThreeBTokenPrototype.json'),artifactText);
writeFileSync(resolve(root,'build/compilation-report.json'),JSON.stringify(report,null,2)+'\n');
process.stdout.write(`Compiled ${artifact.contractName} with ${solc.version()}; ${report.runtimeBytecodeBytes} runtime bytes; ${report.warnings.length} warnings.\n`);
