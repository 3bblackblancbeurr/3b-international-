/** Presentation only. No XP, combat result, unlock, or save writes belong here. */
const text = (value, fallback = '') => typeof value === 'string' && value.trim() ? value.trim() : fallback;
const LIMITS = {
  lumiere: 'Le soutien demande de choisir le bon moment pour te protéger. Il ne remplace ni le placement ni les attaques.',
  tempete: 'Ta puissance a une contrepartie réelle : ta vitalité est réduite. Une attaque mal préparée te laisse plus vulnérable.',
  nature: 'Ta résistance ne garantit pas la victoire. Anticipe les attaques et garde une issue pour te replier.',
  ombre: 'La mobilité ne signifie pas l’invulnérabilité. Utilise le déplacement pour éviter les attaques plutôt que les subir.',
};

/** Only pass an enabled weapon resolved from the actual gameplay catalog, never a marketing concept. */
export function characterSequence({avatar = {}, power = {}, gear = {}, weapon = null} = {}) {
  const name = text(avatar.name, 'Voyageur');
  const shots = [
    {id: 'identity', duration: 6500, camera: 'portrait', title: `${name}, ton voyage commence.`, line: 'Ton visage. Ton style. Tes choix. Le Monde 3B accueille un nouveau voyageur.', action: 'Idle'},
    {id: 'silhouette', duration: 6000, camera: 'full', title: 'Porte ton héritage.', line: 'Ton apparence et tes origines restent libres. Elles ne déterminent pas ta puissance.', action: 'Idle'},
  ];
  if (weapon?.enabled === true && text(weapon.name) && text(weapon.attack) && text(weapon.defense) && text(weapon.drawback)) {
    shots.push({id: 'weapon', duration: 9500, camera: 'equipment', title: text(weapon.name), line: `Attaque : ${weapon.attack} Défense : ${weapon.defense} Limite : ${weapon.drawback}`, action: 'Idle'});
  }
  shots.push(
    {id: 'power', duration: 8500, camera: 'power', title: `Ta voie : ${text(power.name, 'Lumière')}`, line: text(power.description, 'Consulte ta voie dans la personnalisation.'), action: 'Cast'},
    {id: 'tradeoff', duration: 8500, camera: 'portrait', title: 'La force demande de la maîtrise.', line: LIMITS[avatar.path] || LIMITS.lumiere, action: 'Idle'},
    {id: 'equipment', duration: 7500, camera: 'full', title: text(gear.name, 'Ton équipement de voyage'), line: `${text(gear.description, 'Prépare ton équipement dans la personnalisation.')} Ces choix d’aventure ne donnent pas d’avantage de puissance dans l’arène.`, action: 'Idle'},
    {id: 'departure', duration: 7500, camera: 'departure', title: 'Huit portes. Un héritage à défendre.', line: 'Explore les pays, rencontre leurs habitants et avance dans leur histoire. Ce n’est pas une marque, c’est un héritage.', action: 'Idle'},
  );
  return {id: 'character-reveal-v1', title: 'L’Éveil de l’Héritage', shots};
}

export function frameAt(sequence, elapsed) {
  if (!sequence?.shots?.length) return null;
  const total = sequence.shots.reduce((sum, shot) => sum + shot.duration, 0);
  const time = Math.max(0, Number.isFinite(elapsed) ? elapsed : 0);
  let start = 0;
  for (let index = 0; index < sequence.shots.length; index++) {
    const shot = sequence.shots[index];
    if (time < start + shot.duration || index === sequence.shots.length - 1) {
      return {...shot, index, count: sequence.shots.length, progress: Math.min(1, (time - start) / shot.duration), totalProgress: Math.min(1, time / total), total, done: time >= total};
    }
    start += shot.duration;
  }
  return null;
}
