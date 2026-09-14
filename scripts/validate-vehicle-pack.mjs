import {readFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {assetPackReadiness,validateVehicleAssetPack} from '../src/games/underground/vehicleAssetPack.js';

const args=process.argv.slice(2),strict=args.includes('--final'),file=args.find(x=>!x.startsWith('--'));
if(!file){console.error('Usage: node scripts/validate-vehicle-pack.mjs <pack.json> [--final]');process.exit(2);}
let value;
try{value=JSON.parse(await readFile(resolve(file),'utf8'));}catch(error){console.error('Unable to read vehicle pack:',error.message);process.exit(2);}
const validation=validateVehicleAssetPack(value,{requireArt:strict}),readiness=assetPackReadiness(value);
console.log(JSON.stringify({ok:validation.ok,strict,errors:validation.errors,warnings:validation.warnings,readiness},null,2));
if(!validation.ok)process.exit(1);
