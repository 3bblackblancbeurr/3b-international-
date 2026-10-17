import {createHash} from 'node:crypto';
import {isDeepStrictEqual} from 'node:util';
import {readFileSync} from 'node:fs';
import http from 'node:http';import https from 'node:https';import net from 'node:net';
import {AbiCoder,Interface,concat,getAddress} from 'ethers';
import {Common,Hardfork,Mainnet} from '@ethereumjs/common';
import {createAddressFromString,hexToBytes,bytesToHex} from '@ethereumjs/util';
import {createVM} from '@ethereumjs/vm';
import {assessCryptoProject,createCryptoManifest,validateCryptoParameters} from './project-config.js';
const artifactText=readFileSync(new URL('../build/ThreeBTokenPrototype.json',import.meta.url),'utf8');
const artifact=JSON.parse(artifactText),iface=new Interface(artifact.abi),coder=AbiCoder.defaultAbiCoder();
const sha256=value=>createHash('sha256').update(value).digest('hex');
export function prepareDeploymentPlan(project){
 const validation=validateCryptoParameters(project);if(!validation.valid)throw new Error(Object.values(validation.errors).join(' '));
 let recipient;try{recipient=getAddress(project.recipient);}catch{throw new Error('Adresse publique invalide : vérifie sa casse ou sa somme de contrôle.');}
 const manifest=createCryptoManifest(project),assessment=assessCryptoProject(project);const argumentsEncoded=coder.encode(['address','uint256'],[recipient,validation.supplyBaseUnits]);
 return {format:'3b-token-deployment-plan',version:1,project:manifest,contractName:artifact.contractName,constructorArguments:{initialRecipient:recipient,supplyBaseUnits:validation.supplyBaseUnits},constructorArgumentsEncoded:argumentsEncoded,creationData:concat([artifact.bytecode,argumentsEncoded]),artifactSha256:sha256(artifactText),sourceSha256:sha256(readFileSync(new URL('../contracts/ThreeBTokenPrototype.sol',import.meta.url))),publicContractAddress:null,reviewComplete:assessment.complete,execution:{mode:'offline-preparation-only',signed:false,broadcast:false,rpcConfigured:false},network:manifest.network};
}
export async function verifyDeploymentLocally(plan){
 if(plan?.format!=='3b-token-deployment-plan'||plan.execution?.broadcast!==false)throw new Error('Plan local incompatible.');
 const expected=prepareDeploymentPlan(plan.project?.project);if(!isDeepStrictEqual(plan,expected))throw new Error('Le plan ne correspond pas aux paramètres, aux sources, à l’artefact et à l’exécution hors ligne attendus.');
 const deny=()=>{throw new Error('Network access is forbidden during local deployment verification.');};
 globalThis.fetch=deny;http.request=deny;http.get=deny;https.request=deny;https.get=deny;net.connect=deny;net.createConnection=deny;net.Socket.prototype.connect=deny;
 // Message caller is a deterministic EVM-only fixture. There is no private key or signer.
 const caller=createAddressFromString('0x1000000000000000000000000000000000000001');
 const vm=await createVM({common:new Common({chain:Mainnet,hardfork:Hardfork.Cancun})});
 const creation=await vm.evm.runCall({caller,data:hexToBytes(expected.creationData),gasLimit:10000000n});
 if(creation.execResult.exceptionError||!creation.createdAddress)throw new Error('Le constructeur a échoué dans l’EVM locale.');
 async function value(name,args=[]){const result=await vm.evm.runCall({caller,to:creation.createdAddress,data:hexToBytes(iface.encodeFunctionData(name,args)),gasLimit:1000000n});if(result.execResult.exceptionError)throw new Error('Lecture locale impossible : '+name);return iface.decodeFunctionResult(name,bytesToHex(result.execResult.returnValue))[0];}
 const [name,symbol,decimals,totalSupply,recipientBalance]=await Promise.all([value('name'),value('symbol'),value('decimals'),value('totalSupply'),value('balanceOf',[expected.constructorArguments.initialRecipient])]);
 const matches=name==='3B Token Prototype'&&symbol==='T3B'&&decimals===18n&&totalSupply.toString()===expected.constructorArguments.supplyBaseUnits&&recipientBalance===totalSupply;
 if(!matches)throw new Error('Les valeurs exécutées ne correspondent pas au manifeste.');
 return {status:'passed',scope:'in-memory EVM only',networkConnected:false,publicContractAddress:null,signed:false,broadcast:false,checks:{name,symbol,decimals:Number(decimals),totalSupply:totalSupply.toString(),recipientBalance:recipientBalance.toString()},artifactSha256:expected.artifactSha256};
}
