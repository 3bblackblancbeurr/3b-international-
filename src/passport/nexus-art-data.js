// Art direction only. Gate rules and rewards are owned by nexus-flow/world-engine.
export const NEXUS_ART = Object.freeze({
  FR: { guardian: 'Céliane', title: 'La lumière du juste', color: '#86caff', material: 'Acier bleu · or champagne', atmosphere: 'Paris, au-delà du visible', description: 'Une flèche de lumière traverse la nuit. La Justice est le premier fragment de ton héritage.' },
  DZ: { guardian: 'Yliane', title: 'Le serment des origines', color: '#78d5b3', material: 'Pierre claire · jade', atmosphere: 'La mémoire des terres', description: 'Des terrasses de pierre aux lumières de l’oasis, la Loyauté garde vivant ce qui nous relie.' },
  ES: { guardian: 'Diego', title: 'La braise intérieure', color: '#ef9c7b', material: 'Cuivre patiné · ambre', atmosphere: 'L’horizon incandescent', description: 'Des flèches sculptées émergent de la braise. La Passion transforme chaque fragment en mouvement.' },
  MA: { guardian: 'Naël', title: 'Le souffle de l’Atlas', color: '#e7bc79', material: 'Bronze ciselé · zellige', atmosphere: 'Le secret des montagnes', description: 'Un seuil géométrique s’ouvre sur un horizon immense. La Noblesse se reconnaît dans les actes.' },
  IT: { guardian: 'Alessio', title: 'L’aube du renouveau', color: '#c1d6a1', material: 'Travertin · or pâle', atmosphere: 'La promesse de l’aube', description: 'Une arche veille sur la mémoire des pierres. L’Espoir fait renaître ce que l’Oubli a brisé.' },
  TN: { guardian: 'Soraya', title: 'Le seuil des marées', color: '#80d7de', material: 'Calcaire · céramique bleue', atmosphere: 'La lumière du rivage', description: 'Des terrasses blanches rencontrent la mer. Le Courage commence par un pas vers l’inconnu.' },
  TR: { guardian: 'Émir', title: 'La constellation des liens', color: '#c0acf0', material: 'Obsidienne · astrolabe d’or', atmosphere: 'Entre deux horizons', description: 'Sous une voûte de constellations, la Foi éclaire le chemin que les yeux ne voient pas encore.' },
  EE: { guardian: 'Eira', title: 'Le silence des aurores', color: '#a4def1', material: 'Cristal fumé · argent', atmosphere: 'L’écho du Nord', description: 'Les tours se dessinent sous les aurores. La Sagesse invite à écouter, comprendre, puis choisir.' },
});

export const GATE_PATHS = Object.freeze({
  FR: 'M79 317V151L99 115L160 42L221 115L241 151V317Z',
  DZ: 'M78 317V174C50 124 77 70 160 48C243 70 270 124 242 174V317Z',
  ES: 'M76 317V148Q61 122 93 103Q83 72 120 76Q134 40 160 50Q186 40 200 76Q237 72 227 103Q259 122 244 148V317Z',
  MA: 'M78 317V178C33 127 78 47 160 47C242 47 287 127 242 178V317Z',
  IT: 'M76 317V136A84 84 0 0 1 244 136V317Z',
  TN: 'M75 317V161C62 118 91 68 160 61C229 68 258 118 245 161V317Z',
  TR: 'M76 317V160C76 111 124 88 160 41C196 88 244 111 244 160V317Z',
  EE: 'M74 317V134L110 81L160 48L210 81L246 134V317Z',
  ORIGINE: 'M75 317V136L112 74L160 42L208 74L245 136V317Z',
});
