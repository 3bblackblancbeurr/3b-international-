import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import {createHash} from 'node:crypto';
import {CRYPTO_PROJECT_KEY,PROJECT_EVIDENCE,UINT256_MAX,assessCryptoProject,createCryptoManifest,createCryptoProjectSession,exportCryptoProject,importCryptoProject,isRecipient,loadCryptoProject,newCryptoProject,normalizeCryptoProject,parseTokenSupply,saveCryptoProject,validateCryptoParameters} from '../src/finance/crypto/crypto-project.js';
const valid=()=>({...newCryptoProject(),purpose:'Fiche technique à examiner',supplyTokens:'1000,000000000000000001',recipient:'0x2000000000000000000000000000000000000002',organisation:'Équipe de recette',lead:'Préparation',reviewer:'Relecture'});
const memory=()=>{const values=new Map();return {getItem:key=>values.get(key)??null,setItem:(key,value)=>values.set(key,value)};};
const evidence=()=>Object.fromEntries(PROJECT_EVIDENCE.map(({id})=>[id,{reference:'Document de recette '+id,reviewer:'Équipe de relecture',date:'2026-10-17'}]));
test('token quantities use exact 18 decimal integer arithmetic and uint256 bounds',()=>{
 assert.equal(parseTokenSupply('1000,000000000000000001'),1000000000000000000001n);assert.equal(parseTokenSupply('0.000000000000000001'),1n);
 const max=UINT256_MAX.toString(),display=max.slice(0,-18)+'.'+max.slice(-18);assert.equal(parseTokenSupply(display),UINT256_MAX);
 for(const value of ['0','-1','1e18','1.0000000000000000001','',1000,UINT256_MAX.toString()])assert.throws(()=>parseTokenSupply(value));
});
test('draft has no implicit supply, recipient or launch claim',()=>{const state=newCryptoProject(),result=assessCryptoProject(state,'2026-10-18');assert.equal(state.supplyTokens,'');assert.equal(state.recipient,'');assert.equal(result.status,'draft');assert.equal(result.deployed,false);assert.equal(result.broadcastEnabled,false);});
test('autosaved text preserves spaces while typing and does not force an empty title',()=>{assert.equal(normalizeCryptoProject({...valid(),title:'Mon ',purpose:'Mon projet '}).title,'Mon ');assert.equal(normalizeCryptoProject({...valid(),title:''}).title,'');assert.equal(validateCryptoParameters({...valid(),title:'   '}).valid,false);assert.equal(assessCryptoProject({...valid(),organisation:'   '}).governanceComplete,false);});
test('deployment parameters reject zero and malformed addresses and unknown networks',()=>{assert.equal(validateCryptoParameters(valid()).valid,true);assert.equal(isRecipient('0x'+'0'.repeat(40)),false);assert.equal(isRecipient('0x123'),false);assert.equal(validateCryptoParameters({...valid(),network:'unknown'}).valid,false);assert.equal(validateCryptoParameters({...valid(),recipient:valid().recipient+'f'}).valid,false);});
test('local, testnet and production states are recalculated from required references',()=>{
 const project=valid();assert.equal(assessCryptoProject(project,'2026-10-18').status,'documentation');project.evidence=evidence();assert.equal(assessCryptoProject(project,'2026-10-18').status,'local-preparation');assert.equal(assessCryptoProject({...project,network:'sepolia'},'2026-10-18').status,'testnet-review');assert.equal(assessCryptoProject({...project,network:'mainnet'},'2026-10-18').status,'production-review');
 delete project.evidence.legal;assert.equal(assessCryptoProject({...project,network:'mainnet'},'2026-10-18').status,'documentation');assert.equal(assessCryptoProject({...project,network:'sepolia'},'2026-10-18').status,'testnet-review');
});
test('future or impossible review dates and identical reviewers do not complete a dossier',()=>{
 const project={...valid(),evidence:evidence()};project.evidence.design.date='2026-10-19';assert.equal(assessCryptoProject(project,'2026-10-18').complete,false);project.evidence.design.date='2026-02-30';assert.equal(assessCryptoProject(project,'2026-10-18').complete,false);project.evidence.design.date='2026-10-17';assert.equal(assessCryptoProject({...project,reviewer:'PRÉPARATION'},'2026-10-18').governanceComplete,false);
});
test('manifest keeps prototype and simulation units separate and never serializes a deployment',()=>{
 const manifest=createCryptoManifest({...valid(),network:'mainnet',evidence:evidence()},'2026-10-18');assert.equal(manifest.contract.symbol,'T3B');assert.equal(manifest.contract.decimals,18);assert.equal(manifest.simulation.symbol,'3BT démo');assert.equal(manifest.simulation.decimals,2);assert.equal(manifest.simulation.linkedToPrototype,false);assert.equal(manifest.network.chainId,1);assert.equal(manifest.network.contractAddress,null);assert.equal(manifest.execution.broadcast,false);assert.equal(manifest.execution.signed,false);assert.equal(manifest.parameters.supplyBaseUnits,'1000000000000000000001');assert.doesNotThrow(()=>JSON.stringify(manifest));
});
test('import rejects secrets, altered precision, unknown formats and oversized inputs',()=>{
 const exported=JSON.parse(exportCryptoProject(valid()));assert.equal(importCryptoProject(JSON.stringify(exported)).supplyTokens,valid().supplyTokens);
 for(const value of [{...exported,format:'other'},{...exported,private_key:'not-a-key'},{...exported,contract:{symbol:'T3B',decimals:2}},{...exported,project:{...exported.project,recipient:valid().recipient+'x'}}])assert.throws(()=>importCryptoProject(JSON.stringify(value)));
 assert.throws(()=>importCryptoProject(' '.repeat(30001)));assert.throws(()=>importCryptoProject('{bad'));
});
test('import never trusts claimed launch status or precomputed constructor arguments',()=>{const manifest=JSON.parse(exportCryptoProject(valid()));manifest.network.deployed=true;manifest.network.contractAddress='untrusted';manifest.parameters.supplyBaseUnits='2';const current=createCryptoManifest(importCryptoProject(JSON.stringify(manifest)));assert.equal(current.network.deployed,false);assert.equal(current.network.contractAddress,null);assert.equal(current.parameters.supplyBaseUnits,'1000000000000000000001');});
test('storage is recoverable, quota-safe and refuses stale tab overwrites',()=>{
 const storage=memory(),first=loadCryptoProject(storage),second=loadCryptoProject(storage);const saved=saveCryptoProject(valid(),first.raw,storage);assert.equal(saved.saved,true);const stale=saveCryptoProject({...valid(),title:'Stale draft'},second.raw,storage);assert.equal(stale.conflict,true);assert.equal(stale.project.title,'Projet T3B');storage.setItem(CRYPTO_PROJECT_KEY,'{bad');const broken=loadCryptoProject(storage);assert.ok(broken.warning);assert.equal(saveCryptoProject(valid(),broken.raw,storage).saved,true);assert.equal(storage.getItem(CRYPTO_PROJECT_KEY+'_recovery'),'{bad');const denied={getItem(){throw Error('denied');}};assert.ok(loadCryptoProject(denied).warning);assert.equal(saveCryptoProject(valid(),null,denied).saved,false);
});
test('a write injected between the initial read and commit is detected before saving',()=>{
 const storage=memory(),base=valid(),original=JSON.stringify(base),remote={...base,title:'Titre modifié dans B'};storage.setItem(CRYPTO_PROJECT_KEY,original);const read=storage.getItem;let reads=0;
 storage.getItem=key=>{if(key===CRYPTO_PROJECT_KEY&&++reads===2)storage.setItem(key,JSON.stringify(remote));return read(key);};
 const result=saveCryptoProject({...base,purpose:'Finalité saisie dans A'},original,storage);assert.equal(result.saved,false);assert.equal(result.conflict,true);assert.equal(JSON.parse(storage.getItem(CRYPTO_PROJECT_KEY)).title,remote.title);
});
test('Web Locks serialize independent field edits and conflicting fields are never overwritten',async()=>{
 const storage=memory(),base=valid();storage.setItem(CRYPTO_PROJECT_KEY,JSON.stringify(base));let queue=Promise.resolve();const calls=[];const locks={request(key,fn){calls.push(key);const next=queue.then(fn);queue=next.catch(()=>{});return next;}};
 const a=createCryptoProjectSession({storage,locks}),b=createCryptoProjectSession({storage,locks});const results=await Promise.all([a.commit({baseline:base,next:{...base,title:'Titre de B'}}),b.commit({baseline:base,next:{...base,purpose:'Finalité de A'}})]);
 assert.ok(results.every(result=>result.saved));assert.equal(loadCryptoProject(storage).project.title,'Titre de B');assert.equal(loadCryptoProject(storage).project.purpose,'Finalité de A');assert.deepEqual(calls,[CRYPTO_PROJECT_KEY,CRYPTO_PROJECT_KEY]);
 const conflict=await b.commit({baseline:base,next:{...base,title:'Autre titre obsolète'}});assert.equal(conflict.saved,false);assert.equal(conflict.conflict,true);assert.equal(loadCryptoProject(storage).project.title,'Titre de B');
});
test('a failed queued write cannot turn later dependent drafts into a partial successful save',async()=>{
 const storage=memory(),base=valid();storage.setItem(CRYPTO_PROJECT_KEY,JSON.stringify(base));let attempts=0;storage.setItem=()=>{attempts++;throw Error('QuotaExceeded');};const session=createCryptoProjectSession({storage,locks:null}),first={...base,title:'Brouillon non sauvegardé'},second={...first,purpose:'Suite du brouillon'};
 const results=await Promise.all([session.commit({baseline:base,next:first}),session.commit({baseline:first,next:second})]);assert.ok(results.every(result=>!result.saved));assert.equal(attempts,1);assert.deepEqual(loadCryptoProject(storage).project,base);assert.deepEqual(session.getState(),base);
});
test('published prototype proof hashes match the delivered contract and artifact',()=>{
 const root=new URL('../crypto-prototype/',import.meta.url),proof=JSON.parse(readFileSync(new URL('build/verification-report.json',root),'utf8'));const hash=value=>createHash('sha256').update(value).digest('hex');
 assert.equal(proof.status,'passed');assert.equal(proof.erc20EvmTests,12);assert.equal(proof.deploymentPreparationTests,6);assert.equal(proof.failed,0);assert.equal(proof.compiler.warnings.length,0);assert.equal(hash(readFileSync(new URL('contracts/ThreeBTokenPrototype.sol',root))),proof.compiler.sha256.entry);assert.equal(hash(readFileSync(new URL('build/ThreeBTokenPrototype.json',root))),proof.compiler.sha256.artifact);
 const artifact=JSON.parse(readFileSync(new URL('build/ThreeBTokenPrototype.json',root),'utf8'));assert.equal(artifact.abi.some(item=>item.type==='function'&&['mint','pause','owner','upgradeTo'].includes(item.name)),false);
});
