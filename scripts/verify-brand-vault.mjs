import{createHash}from"node:crypto";
import{existsSync,readFileSync,writeFileSync}from"node:fs";
import path from"node:path";
const root=process.cwd();
const manifestPath=path.join(root,"brand/master/brand-manifest.json");
const manifest=JSON.parse(readFileSync(manifestPath,"utf8"));
const writeMode=process.argv.includes("--write");
let failures=0;
for(const asset of manifest.lockedAssets||[]){
 const absolute=path.join(root,asset.path);
 if(!existsSync(absolute)){console.error(`[brand-vault] missing locked asset: ${asset.path}`);failures++;continue}
 const sha256=createHash("sha256").update(readFileSync(absolute)).digest("hex");
 if(writeMode){asset.sha256=sha256;asset.status="locked"}
 else if(asset.status==="locked"&&!/^[0-9a-f]{64}$/i.test(asset.sha256||"")){console.error(`[brand-vault] locked asset lacks valid SHA-256: ${asset.path}`);failures++}
 else if(asset.sha256&&asset.sha256!==sha256){console.error(`[brand-vault] SHA-256 mismatch: ${asset.path}`);failures++}
}
const missing=(manifest.requiredOfficialLogos||[]).filter(entry=>!entry.path||!existsSync(path.join(root,entry.path)));
if(manifest.status==="enforced"&&missing.length){console.error("[brand-vault] missing official logos:",missing.map(x=>x.id).join(", "));failures++}
if(writeMode){writeFileSync(manifestPath,JSON.stringify(manifest,null,2)+"\n");console.log("[brand-vault] SHA-256 lock values refreshed.")}
else if(manifest.status==="bootstrap")console.log(`[brand-vault] bootstrap: ${missing.length} official logo slots pending.`);
if(failures)process.exit(1);
console.log("[brand-vault] verification passed.");
