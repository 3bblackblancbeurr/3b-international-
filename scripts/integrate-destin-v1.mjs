import fs from 'node:fs';
import assert from 'node:assert/strict';

// One-off integration helper: exact anchors, no unrelated rewrites. The delivery
// workflow commits the resulting source diff only after the tests and build pass.
function edit(path,marker,patches){
  let source=fs.readFileSync(path,'utf8');
  if(source.includes(marker)){console.log('Already integrated:',path);return;}
  for(const [before,after] of patches){
    assert.equal(source.split(before).length,2,`Expected exactly one integration anchor in ${path}: ${before.slice(0,70)}`);
    source=source.replace(before,after);
  }
  fs.writeFileSync(path,source);console.log('Integrated:',path);
}
edit('src/App.jsx','const DestinPage = lazy(',[
  ['const ShopPage = lazy(() => import("./shop/ShopPage.jsx"));','const ShopPage = lazy(() => import("./shop/ShopPage.jsx"));\nconst DestinPage = lazy(() => import("./destin/DestinPage.jsx"));'],
  ['  {\n    id: "manga",','  {\n    id: "destin",\n    label: "3B DESTIN",\n    icon: "◇",\n    description: "Tu ne regardes pas l’histoire. Tu la décides.",\n  },\n  {\n    id: "manga",'],
  ['      {page === "loyalty" && <LoyaltyPage goTo={goTo} member={member} />}','      {page === "destin" && <DestinPage key={loyalty.user?.id || "guest"} goTo={goTo} />}\n      {page === "loyalty" && <LoyaltyPage goTo={goTo} member={member} />}'],
  ['      <CompanionLayer goTo={goTo} page={page} secretPhase={secret.phase} memberRegistered={member.isRegistered} />\n\n      {!','      {page !== "destin" && <CompanionLayer goTo={goTo} page={page} secretPhase={secret.phase} memberRegistered={member.isRegistered} />}\n\n      {!']
]);
edit('src/lib/navigation.js','destin: "destin"',[
  ['  manga: "manga",','  destin: "destin", manga: "manga",']
]);
edit('src/components/AppNavigation.jsx','destin: Film',[
  [' X, Fingerprint }',' X, Fingerprint, Film }'],
  ['const ICONS = { home: Home,','const ICONS = { destin: Film, home: Home,'],
  ['{ title: "Univers 3B", ids: ["world3b", "secret"] }','{ title: "Univers 3B", ids: ["world3b", "destin", "secret"] }']
]);
console.log('3B DESTIN is connected to the menu, home directory and #destin route.');
