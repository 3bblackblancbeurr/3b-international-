import {companionContextActions} from './companion-application.js';
export function companionGuidance({ page, secretPhase, memberRegistered }) {
  const secretOpen = ['open', 'attempt'].includes(secretPhase);
  const copy = {
    home: memberRegistered ? 'On explore où aujourd’hui ?' : 'Ton passeport est le point de départ.',
    passport: 'Ton identité, au même endroit.',
    member: 'Ton compte, tes cartes et tes avantages.',
    community:'Un lien, une idée, une action à préparer ensemble.',
    news:'Les informations restent lisibles dans 3B, avec leurs sources.',
    association:'D’une intention solidaire à une action structurée.',
    religion:'L’arbre pour explorer, le schéma pour comprendre les liens.',
    shop: 'Retrouve ta fidélité dans ton espace membre.',
    world3b: 'Huit portes. Avance à ton rythme.',
    secret: secretOpen ? 'Le signal est ouvert. À toi de jouer.' : 'Le prochain signal arrive. Garde un œil sur l’heure.',
    guide: 'Un repère, puis l’aventure continue.',
  };
  const candidates = secretOpen
    ? [{ page: 'secret', label: 'Le Secret est ouvert', hint: 'Rejoindre le signal' }, { page: 'member', label: memberRegistered ? 'Mon espace membre' : 'Connexion / inscription', hint: 'Passeport & avantages' }]
    : [{ page: 'world3b', label: 'Explorer le Monde', hint: 'Les huit Portes' }, { page: 'member', label: memberRegistered ? 'Mon espace membre' : 'Connexion / inscription', hint: 'Passeport & avantages' }, { page: 'guide', label: 'Un coup de main', hint: 'Le guide 3B' }];
  return { message: copy[page] || 'Je reste à tes côtés.', actions: (['community','news','admin','finance','health','religion','association','travel'].includes(page)?companionContextActions(page):candidates).filter(action => action.page !== page).slice(0, 2) };
}

export function companionTouch(kind) {
  return ({
    hello: { pose: 'hello', message: 'Salut toi. Prêt pour la suite ?', duration: 2800 },
    curious: { pose: 'curious', message: 'On ouvre une nouvelle porte ?', duration: 2800 },
    rest: { pose: 'rest', message: 'Une petite pause. Je reste ici.', duration: 3200 },
  })[kind] || null;
}

export function companionGaze(clientX, clientY, rect) {
  if (!rect || ![clientX, clientY, rect.left, rect.top, rect.width, rect.height].every(Number.isFinite)) return { x: 0, y: 0 };
  return { x: Math.max(-5, Math.min(5, (clientX - rect.left - rect.width / 2) / 90)), y: Math.max(-3, Math.min(3, (clientY - rect.top - rect.height / 2) / 120)) };
}
