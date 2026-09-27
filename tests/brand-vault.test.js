import test from"node:test";
import assert from"node:assert/strict";
import{existsSync,readFileSync}from"node:fs";
const manifest=JSON.parse(readFileSync("brand/master/brand-manifest.json","utf8"));
test("brand vault forbids generated official identity",()=>{assert.equal(manifest.policy.generatedIdentityAllowed,false);assert.equal(manifest.policy.officialAssetsMustBeLocked,true)});
test("nine official logo slots are explicit",()=>assert.deepEqual(manifest.requiredOfficialLogos.map(x=>x.id),["fr","ma","tn","tr","dz","es","it","ee","international"]));
test("currently locked assets exist",()=>{for(const asset of manifest.lockedAssets)assert.equal(existsSync(asset.path),true,asset.path)});
test("bootstrap remains honest until official source files exist",()=>{if(manifest.status==="bootstrap")assert.ok(manifest.requiredOfficialLogos.some(x=>x.status==="missing-from-repository"))});

test("locked assets carry a real SHA-256",()=>{for(const asset of manifest.lockedAssets.filter(x=>x.status==="locked"))assert.match(asset.sha256,/^[0-9a-f]{64}$/i)});
