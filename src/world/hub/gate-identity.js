/** Labels and placement from the user's sole city reference; story values remain canonical. */
export const REFERENCE_GATE_SECTORS=Object.freeze([7,2,0,1,4,3,5,6]);
export const REFERENCE_GATE_TITLES=Object.freeze({france:'Culture',italie:'Élégance',estonie:'Innovation',turquie:'Résilience',algerie:'Loyauté',tunisie:'Ambition',maroc:'Créativité',espagne:'Passion'});
export function paintGateFlag(ctx,id){
 const w=360,h=240;ctx.clearRect(0,0,w,h);
 const rect=(color,x=0,y=0,width=w,height=h)=>{ctx.fillStyle=color;ctx.fillRect(x,y,width,height);};
 function star(x,y,r,color,outline=false){ctx.beginPath();const count=outline?5:10;for(let i=0;i<count;i++){const a=-Math.PI/2+(outline?i*4*Math.PI/5:i*Math.PI/5),radius=outline||i%2===0?r:r*.4,px=x+Math.cos(a)*radius,py=y+Math.sin(a)*radius;i?ctx.lineTo(px,py):ctx.moveTo(px,py);}ctx.closePath();if(outline){ctx.strokeStyle=color;ctx.lineWidth=8;ctx.stroke();}else{ctx.fillStyle=color;ctx.fill();}}
 function crescent(x,y,r,color){ctx.fillStyle=color;ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.moveTo(x+r*.32+r*.81,y);ctx.arc(x+r*.32,y,r*.81,0,Math.PI*2);ctx.fill('evenodd');}
 if(id==='france'||id==='italie'){rect(id==='france'?'#002654':'#009246',0,0,120,h);rect('#fff',120,0,120,h);rect(id==='france'?'#ed2939':'#ce2b37',240,0,120,h);} // gold-master-allow: official national flag pigments; reviewed in docs/FINALISATION_3B_20261004.md.
 if(id==='estonie'){rect('#4891d9',0,0,w,80);rect('#111',0,80,w,80);rect('#fff',0,160,w,80);} // gold-master-allow: official national flag pigments; reviewed in docs/FINALISATION_3B_20261004.md.
 if(id==='espagne'){rect('#aa151b');rect('#f1bf00',0,60,w,120);} // gold-master-allow: official national flag pigments; reviewed in docs/FINALISATION_3B_20261004.md.
 if(id==='maroc'){rect('#c1272d');star(180,120,58,'#006233',true);} // gold-master-allow: official national flag pigments; reviewed in docs/FINALISATION_3B_20261004.md.
 if(id==='turquie'){rect('#e30a17');crescent(137,120,67,'#fff','#e30a17');star(213,120,33,'#fff');} // gold-master-allow: official national flag pigments; reviewed in docs/FINALISATION_3B_20261004.md.
 if(id==='tunisie'){rect('#e70013');ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(180,120,78,0,Math.PI*2);ctx.fill();crescent(171,120,52,'#e70013','#fff');star(211,120,28,'#e70013');} // gold-master-allow: official national flag pigments; reviewed in docs/FINALISATION_3B_20261004.md.
 if(id==='algerie'){rect('#006233',0,0,180,h);rect('#fff',180,0,180,h);crescent(180,120,64,'#d21034','#fff');star(211,120,30,'#d21034');} // gold-master-allow: official national flag pigments; reviewed in docs/FINALISATION_3B_20261004.md.
}
