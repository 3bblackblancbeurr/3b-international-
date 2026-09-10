import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {memberCardSvg} from '../shared/member-card.js';
import {TIERS} from '../shared/loyalty.js';
const root=path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const dest=process.argv[2];
if(!dest)throw Error('Indique un dossier de destination.');
await fs.mkdir(dest,{recursive:true});
for(const tier of TIERS){
 const artwork=await fs.readFile(path.join(root,'public/loyalty-art',tier.id+'.webp'));
 await fs.writeFile(path.join(dest,'carte-3b-'+tier.id+'.svg'),memberCardSvg(null,tier,{artworkDataUrl:'data:image/webp;base64,'+artwork.toString('base64')}));
 await fs.copyFile(path.join(root,'public/loyalty-art',tier.id+'.webp'),path.join(dest,tier.id+'.webp'));
}
await fs.copyFile(path.join(root,'docs/loyalty-art-prompts.json'),path.join(dest,'prompts.json'));
console.log('Cinq cartes illustrées autonomes exportées.');
