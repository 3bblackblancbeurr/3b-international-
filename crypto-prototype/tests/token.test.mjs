import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import http from 'node:http';
import https from 'node:https';
import net from 'node:net';
import {Common,Hardfork,Mainnet} from '@ethereumjs/common';
import {createAddressFromString,hexToBytes,bytesToHex} from '@ethereumjs/util';
import {createVM} from '@ethereumjs/vm';
import {Interface,AbiCoder,concat,MaxUint256,ZeroAddress} from 'ethers';

const denyNetwork=()=>{throw Error('Network use is forbidden in this local EVM test suite.');};
globalThis.fetch=denyNetwork;http.request=denyNetwork;http.get=denyNetwork;https.request=denyNetwork;https.get=denyNetwork;net.connect=denyNetwork;net.createConnection=denyNetwork;net.Socket.prototype.connect=denyNetwork;
const artifact=JSON.parse(readFileSync(new URL('../build/ThreeBTokenPrototype.json',import.meta.url),'utf8'));
const iface=new Interface(artifact.abi),coder=AbiCoder.defaultAbiCoder();
// Deterministic labels only: no private keys, wallet, provider or signed transaction.
const caller='0x1000000000000000000000000000000000000001',recipient='0x2000000000000000000000000000000000000002',other='0x3000000000000000000000000000000000000003',spender='0x4000000000000000000000000000000000000004';
const address=createAddressFromString;
async function deploy(supply=123456789n,to=recipient){
 const vm=await createVM({common:new Common({chain:Mainnet,hardfork:Hardfork.Cancun})});
 const result=await vm.evm.runCall({caller:address(caller),data:hexToBytes(concat([artifact.bytecode,coder.encode(['address','uint256'],[to,supply])])),gasLimit:10000000n});
 return {vm,result,contract:result.createdAddress,supply};
}
async function invoke(ctx,name,args=[],from=recipient){
 return ctx.vm.evm.runCall({caller:address(from),to:ctx.contract,data:hexToBytes(iface.encodeFunctionData(name,args)),gasLimit:1000000n});
}
async function value(ctx,name,args=[]){const result=await invoke(ctx,name,args);assert.equal(result.execResult.exceptionError,undefined);return iface.decodeFunctionResult(name,bytesToHex(result.execResult.returnValue))[0];}
function success(result){assert.equal(result.execResult.exceptionError,undefined,result.execResult.exceptionError?.error);return result;}
function reverted(result,error){assert.ok(result.execResult.exceptionError);if(error)assert.equal(iface.parseError(bytesToHex(result.execResult.returnValue)).name,error);}
function events(result){return (result.execResult.logs||[]).map(([,topics,data])=>iface.parseLog({topics:topics.map(bytesToHex),data:bytesToHex(data)}));}

test('constructor assigns exact base units to its recipient, not its caller',async()=>{
 const ctx=await deploy();success(ctx.result);assert.ok(ctx.contract);
 assert.equal(await value(ctx,'name'),'3B Token Prototype');assert.equal(await value(ctx,'symbol'),'T3B');assert.equal(await value(ctx,'decimals'),18n);
 assert.equal(await value(ctx,'totalSupply'),ctx.supply);assert.equal(await value(ctx,'balanceOf',[recipient]),ctx.supply);assert.equal(await value(ctx,'balanceOf',[caller]),0n);
});
test('constructor emits the standard supply Transfer event',async()=>{
 const ctx=await deploy(),logs=events(success(ctx.result));assert.equal(logs.length,1);assert.equal(logs[0].name,'Transfer');assert.equal(logs[0].args[0],ZeroAddress);assert.equal(logs[0].args[1].toLowerCase(),recipient);assert.equal(logs[0].args[2],ctx.supply);
});
test('normal and zero-value transfers preserve supply and exact balances without a tax',async()=>{
 const ctx=await deploy();const result=success(await invoke(ctx,'transfer',[other,123n]));assert.equal(iface.decodeFunctionResult('transfer',bytesToHex(result.execResult.returnValue))[0],true);
 assert.equal(await value(ctx,'balanceOf',[recipient]),ctx.supply-123n);assert.equal(await value(ctx,'balanceOf',[other]),123n);assert.equal(await value(ctx,'totalSupply'),ctx.supply);
 const log=events(result)[0];assert.equal(log.name,'Transfer');assert.equal(log.args[2],123n);
 success(await invoke(ctx,'transfer',[other,0n]));assert.equal(await value(ctx,'totalSupply'),ctx.supply);
});
test('approve and transferFrom consume the exact allowance',async()=>{
 const ctx=await deploy();const approval=success(await invoke(ctx,'approve',[spender,100n]));assert.equal(events(approval)[0].name,'Approval');assert.equal(await value(ctx,'allowance',[recipient,spender]),100n);
 success(await invoke(ctx,'transferFrom',[recipient,other,40n],spender));assert.equal(await value(ctx,'allowance',[recipient,spender]),60n);assert.equal(await value(ctx,'balanceOf',[other]),40n);assert.equal(await value(ctx,'totalSupply'),ctx.supply);
});
test('insufficient balance reverts without changing balances or supply',async()=>{
 const ctx=await deploy();reverted(await invoke(ctx,'transfer',[other,ctx.supply+1n]),'ERC20InsufficientBalance');assert.equal(await value(ctx,'balanceOf',[recipient]),ctx.supply);assert.equal(await value(ctx,'balanceOf',[other]),0n);assert.equal(await value(ctx,'totalSupply'),ctx.supply);
});
test('insufficient allowance reverts without transferring',async()=>{
 const ctx=await deploy();success(await invoke(ctx,'approve',[spender,5n]));reverted(await invoke(ctx,'transferFrom',[recipient,other,6n],spender),'ERC20InsufficientAllowance');assert.equal(await value(ctx,'allowance',[recipient,spender]),5n);assert.equal(await value(ctx,'balanceOf',[other]),0n);
});
test('zero recipient is rejected during construction and transfers',async()=>{
 const rejected=await deploy(1n,ZeroAddress);reverted(rejected.result,'ERC20InvalidReceiver');
 const ctx=await deploy();reverted(await invoke(ctx,'transfer',[ZeroAddress,1n]),'ERC20InvalidReceiver');assert.equal(await value(ctx,'totalSupply'),ctx.supply);
});
test('supply is a parameter: zero is accepted, and no commercial default is embedded',async()=>{
 const ctx=await deploy(0n);success(ctx.result);assert.equal(await value(ctx,'totalSupply'),0n);reverted(await invoke(ctx,'transfer',[other,1n]),'ERC20InsufficientBalance');
});
test('maximum uint256 supply is accepted exactly with no implicit decimal scaling',async()=>{
 const ctx=await deploy(MaxUint256);success(ctx.result);assert.equal(await value(ctx,'totalSupply'),MaxUint256);success(await invoke(ctx,'transfer',[other,MaxUint256]));assert.equal(await value(ctx,'balanceOf',[recipient]),0n);assert.equal(await value(ctx,'balanceOf',[other]),MaxUint256);assert.equal(await value(ctx,'totalSupply'),MaxUint256);
});
test('only the nine standard ERC-20 metadata and transfer functions are exposed',()=>{
 const functions=artifact.abi.filter(item=>item.type==='function').map(item=>item.name).sort();assert.deepEqual(functions,['allowance','approve','balanceOf','decimals','name','symbol','totalSupply','transfer','transferFrom'].sort());
 assert.equal(artifact.abi.filter(item=>item.type==='constructor').length,1);assert.equal(artifact.abi.some(item=>item.type==='fallback'||item.type==='receive'),false);
});
test('mint, burn, admin, upgrade, pause and tax selectors are not callable',async()=>{
 const ctx=await deploy();
 for(const [signature,args] of [['mint(address,uint256)',[other,1n]],['burn(uint256)',[1n]],['transferOwnership(address)',[other]],['upgradeTo(address)',[other]],['pause()',[]],['setTax(uint256)',[1n]]]){
  const foreign=new Interface(['function '+signature]),data=foreign.encodeFunctionData(signature,args),result=await ctx.vm.evm.runCall({caller:address(recipient),to:ctx.contract,data:hexToBytes(data),gasLimit:1000000n});reverted(result);
 }
 assert.equal(await value(ctx,'totalSupply'),ctx.supply);
});
test('a sequence of transfers conserves total supply and the sum of holder balances',async()=>{
 const ctx=await deploy(100000n),holders=[recipient,other,spender];success(await invoke(ctx,'transfer',[other,30000n]));success(await invoke(ctx,'transfer',[spender,20000n]));
 for(let index=0;index<24;index++){
  const from=holders[index%3],to=holders[(index+1)%3],amount=BigInt((index+1)*17);success(await invoke(ctx,'transfer',[to,amount],from));
  const balances=await Promise.all(holders.map(holder=>value(ctx,'balanceOf',[holder])));assert.equal(balances.reduce((sum,balance)=>sum+balance,0n),ctx.supply);assert.equal(await value(ctx,'totalSupply'),ctx.supply);
 }
});
