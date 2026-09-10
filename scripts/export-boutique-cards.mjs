import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {SHOP_TIERS} from '../shared/loyalty.js';
import {boutiqueCardSvg,boutiquePrintHtml} from '../shared/boutique-card.js';
const root=path.dirname(path.dirname(fileURLToPath(import.meta.url))),dest=process.argv[2];if(!dest)throw Error('Indique un dossier de destination.');await fs.mkdir(dest,{recursive:true});
for(const tier of SHOP_TIERS){const artwork=await fs.readFile(path.join(root,'public/loyalty-art/boutique-'+tier.id+'.webp'));const profile={name:'APERÇU DE LA CARTE '+tier.name.toUpperCase(),points:tier.points};const svg=boutiqueCardSvg(profile,tier,{artworkDataUrl:'data:image/webp;base64,'+artwork.toString('base64')});await fs.writeFile(path.join(dest,'3b-boutique-'+tier.id+'.svg'),svg);await fs.writeFile(path.join(dest,'3b-boutique-'+tier.id+'-imprimer.html'),boutiquePrintHtml(svg,profile));}
await fs.copyFile(path.join(root,'docs/boutique-card-prompts.json'),path.join(dest,'prompts.json'));console.log('Quatre cartes boutique et leurs versions imprimables exportées.');
