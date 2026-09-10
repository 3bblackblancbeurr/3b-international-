import {garmentFamily} from '../../shared/studio.js';
export function shapeFor(garment){
 const family=garmentFamily(garment);
 if(/Jupe/.test(garment))return {kind:'skirt',path:'M163 125H257L321 381Q210 404 99 381Z'};
 if(['Short','Bermuda','Maillot de bain','Sous-vêtement'].includes(garment))return {kind:'pants',path:'M132 143H288L306 326H223L210 235L197 326H114Z'};
 if(family==='Bas')return {kind:'pants',path:'M130 100H290L307 392H222L210 224L198 392H113Z'};
 if(family==='Maroquinerie')return {kind:'bag',path:/Portefeuille|Porte-cartes|Pochette|Trousse/.test(garment)?'M88 184Q88 166 108 166H312Q332 166 332 184V323Q332 341 312 341H108Q88 341 88 323Z':'M105 170Q105 145 135 145H285Q315 145 315 175L330 355Q330 380 303 380H117Q90 380 90 355Z'};
 if(garment==='Robe')return {kind:'dress',path:'M160 92L180 85Q210 105 240 85L260 92L275 172L252 210L305 392H115L168 210L145 172Z'};
 if(family==='Vestes & manteaux'||garment==='Peignoir')return {kind:'coat',path:'M152 80L181 69Q210 88 239 69L268 80L334 275L289 297L263 196L284 407H136L157 196L131 297L86 275Z'};
 if(family==='Tenues complètes'||garment==='Pyjama')return {kind:'set',path:'M159 75L185 68Q210 91 235 68L261 75L310 121L281 166L253 147L263 239H157L167 147L139 166L110 121ZM158 258H262L274 410H220L210 327L200 410H146Z'};
 if(garment==='Ceinture')return {kind:'belt',path:'M70 220Q210 245 340 220V270Q210 295 70 270Z'};
 if(['Casquette','Bob','Bonnet'].includes(garment))return {kind:'cap',path:garment==='Bonnet'?'M110 281V211Q110 107 210 107Q310 107 310 211V281Z':'M105 235Q105 100 230 145Q300 180 300 250L353 275Q250 322 80 278Z'};
 if(family==='Chaussures')return {kind:'shoe',path:garment==='Bottes'?'M110 100H244V263L329 295Q355 310 345 345H95V290L112 259Z':'M96 230L142 209L194 260L238 241L275 278L330 290Q350 295 347 332H90Q80 288 96 230Z'};
 if(['Écharpe','Foulard','Cravate'].includes(garment))return {kind:'scarf',path:'M151 91H263L241 187L280 378L227 401L196 213L172 380L120 365L169 178Z'};
 if(garment==='Chaussettes')return {kind:'sock',path:'M141 100H258V290L315 329Q342 365 304 390H139Q95 358 136 311Z'};
 if(garment==='Gants')return {kind:'glove',path:'M139 348L120 219Q111 177 131 178L158 217V129Q159 103 177 118L185 182V107Q190 82 207 107L215 179V115Q228 94 237 123L245 191V153Q257 130 269 160L270 271L251 350Z'};
 if(garment==='Bikini'||garment==='Brassière')return {kind:'top',path:'M159 104L177 108L181 166Q210 145 239 166L243 108L261 104L277 244H143Z'};
 return {kind:'top',path:'M140 100L177 84Q210 112 243 84L280 100L344 155L299 217L274 198L282 383H138L146 198L121 217L76 155Z'};
}

