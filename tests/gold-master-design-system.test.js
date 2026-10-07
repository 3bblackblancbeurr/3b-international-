import test from"node:test";
import assert from"node:assert/strict";
import{readFileSync,readdirSync}from"node:fs";
import{goldMasterTokens}from"../src/design-system/tokens.js";
const css=readFileSync("src/styles/gold-master.css","utf8");
const tokens=readFileSync("src/design-system/tokens.js","utf8");
const components=readFileSync("src/design-system/index.jsx","utf8");
const main=readFileSync("src/main.jsx","utf8");
test("Gold Master canonical colors agree between UI and scene materials",()=>{
 const names={obsidian:"obsidian",carbon:"carbon",champagne:"champagne",champagneHighlight:"champagne-highlight",champagneDeep:"champagne-deep",goldInk:"gold-ink",matrix:"matrix",success:"success",warning:"warning",danger:"danger",text:"text"};
 for(const [name,token] of Object.entries(names)){
  const actual=css.match(new RegExp(`--3b-${token}:([^;]+);`))?.[1];
  assert.equal(actual,goldMasterTokens.colors[name],token);
 }
});
test("transparent gold effects use the same pigments as solid gold",()=>{
 for(const token of ["champagne","champagne-highlight","champagne-deep"]){
  const hex=css.match(new RegExp(`--3b-${token}:#([0-9a-f]{6});`,"i"))[1];
  const rgb=css.match(new RegExp(`--3b-${token}-rgb:([^;]+);`))[1].split(",").map(Number);
  assert.deepEqual(rgb,[0,2,4].map(i=>parseInt(hex.slice(i,i+2),16)),token);
 }
});
const luminance=hex=>{
 const channels=[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16)/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4);
 return channels[0]*.2126+channels[1]*.7152+channels[2]*.0722;
};
const contrast=(a,b)=>{const values=[luminance(a),luminance(b)].sort((x,y)=>y-x);return(values[0]+.05)/(values[1]+.05)};
test("gold labels remain readable on both dark application surfaces",()=>{
 const c=goldMasterTokens.colors;
 for(const foreground of [c.champagne,c.champagneHighlight])for(const background of [c.obsidian,c.carbon]){
  assert.ok(contrast(foreground,background)>=7,`${foreground} on ${background}`);
 }
});
test("dark button text stays legible across every gold material stop",()=>{
 const c=goldMasterTokens.colors;
 for(const background of [c.champagneDeep,c.champagne,c.champagneHighlight]){
  assert.ok(contrast(c.goldInk,background)>=4.5,`${c.goldInk} on ${background}`);
 }
});
test("local gold aliases cannot replace the shared application palette",()=>{
 for(const path of readdirSync("src",{recursive:true}).map(path=>path.replaceAll("\\","/")).filter(path=>path.endsWith(".css")&&path!=="styles/gold-master.css")){
  const source=readFileSync(`src/${path}`,"utf8");
  for(const definition of source.matchAll(/--(?:gold[\w-]*|3b-champagne[\w-]*)\s*:\s*([^;}]+)/g)){
   assert.match(definition[1],/^var\(--3b-/,`${path}: ${definition[0]}`);
  }
 }
});
test("spacing, radii and motion contracts exist",()=>{for(const v of["4px","8px","12px","16px","24px","32px","48px","64px"])assert.ok(css.includes(v));for(const v of["160ms","250ms","380ms"])assert.ok(css.includes(v));for(const v of["control:8","field:12","card:16","hero:24"])assert.ok(tokens.includes(v))});
test("shared component primitives exist",()=>{for(const name of["Button","Card","Modal","Toast","Tabs","VideoPlayer","Avatar","Badge","Progress","Stat"])assert.match(components,new RegExp(`export function ${name}\\b`))});
test("runtime imports Gold Master layer",()=>assert.ok(main.includes("styles/gold-master.css")));
test("reduced motion is supported",()=>assert.ok(css.includes("prefers-reduced-motion")));

test("shared primitives expose explicit Gold Master states",()=>{assert.ok(components.includes('state = "normal"'));assert.ok(components.includes("data-state"));assert.ok(components.includes("getStateClass"))});


test("shared Tabs support keyboard navigation",()=>{for(const marker of["ArrowRight","ArrowLeft","Home","End","tabIndex={active ? 0 : -1}"])assert.ok(components.includes(marker),marker)});
test("Modal traps and restores keyboard focus",()=>{for(const marker of["dialogRef","previousActiveElement","event.key !== \"Tab\"","tabIndex={-1}"])assert.ok(components.includes(marker),marker)});
