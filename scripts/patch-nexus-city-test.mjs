import fs from 'node:fs';

const file='tests/nexus-cinema.test.js';
let source=fs.readFileSync(file,'utf8');
const oldBlock=`test('passport destination is either the legacy journey or the intentional City 3B replacement', () => {
  const source=readFileSync(new URL('../src/components/PassportNexus.jsx',import.meta.url),'utf8');
  if (source.includes('city3bRequest')) {
    assert.match(source,/CRÉE TA VILLE/);
    assert.match(source,/Fonder ma ville/);
    assert.match(source,/nexus_city_place_v2|call\\('place'/);
    assert.match(source,/Collection permanente/);
    assert.match(source,/Découvrir les villes 3B/);
    assert.doesNotMatch(source,/localStorage\\.clear|sessionStorage\\.clear/);
    return;
  }
  assert.match(source,/useNexusJourney\\(\\{ open, onClose, goTo \\}\\)/);
  assert.match(source,/journey\\.travel\\('ORIGINE'\\)/);
  assert.match(source,/setArrivalCode\\(active\\.code\\)/);
  assert.match(source,/journey\\.travel\\(code\\)/);
  assert.match(source,/NexusCountryArrival/);
  assert.match(source,/originEnabled=\\{journey\\.originEnabled\\}/);
  assert.match(source,/Voir le sanctuaire en 3D/);
  assert.doesNotMatch(source,/localStorage\\.clear|sessionStorage\\.clear/);
});`;
const newBlock=`test('Passport opens the active City 3B gateway and permanent server-backed city', () => {
  const entry=readFileSync(new URL('../src/components/PassportNexus.jsx',import.meta.url),'utf8');
  const gateway=readFileSync(new URL('../src/components/NexusCityGateway.jsx',import.meta.url),'utf8');
  const city=readFileSync(new URL('../src/components/City3BPortal.jsx',import.meta.url),'utf8');
  const source=gateway+'\\n'+city;
  assert.match(entry,/NexusCityGateway/);
  assert.match(gateway,/City3BPortal/);
  assert.match(source,/city3bRequest/);
  assert.match(source,/CRÉE TA VILLE/);
  assert.match(source,/Fonder ma ville/);
  assert.match(source,/call\\('place'/);
  assert.match(source,/Collection permanente/);
  assert.match(source,/Découvrir les villes 3B/);
  assert.doesNotMatch(source,/localStorage\\.clear|sessionStorage\\.clear/);
});`;
if(!source.includes(oldBlock))throw new Error('Ancien contrat Passport/Nexus introuvable');
source=source.replace(oldBlock,newBlock);
fs.writeFileSync(file,source);
console.log('Test Nexus aligné avec la Ville 3B active.');
