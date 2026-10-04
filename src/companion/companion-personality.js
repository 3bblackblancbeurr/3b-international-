/** Local, deterministic character dialogue. No remote assistant, account access or reward writes. */
export const COMPANION_PERSONALITIES = Object.freeze([
  Object.freeze({ id: 'bienveillant', label: 'Gentil', description: 'Chaleureux, encourageant et attentif à ton rythme.', color: 'var(--3b-champagne)', energy: 0.5 }),
  Object.freeze({ id: 'taquin', label: 'Taquin', description: 'Malicieux, joueur et toujours prêt à improviser.', color: 'var(--3b-champagne-highlight)', energy: 0.8 }),
  Object.freeze({ id: 'calme', label: 'Calme', description: 'Des gestes posés, une présence douce et peu de paroles.', color: 'var(--3b-matrix)', energy: 0.25 }),
  Object.freeze({ id: 'audacieux', label: 'Provocateur', description: 'Du panache, des défis et de la répartie, toujours avec respect.', color: 'var(--3b-champagne)', energy: 0.9 }),
  Object.freeze({ id: 'curieux', label: 'Curieux', description: 'Explore, observe et te pose des questions inattendues.', color: 'var(--3b-matrix)', energy: 0.65 }),
  Object.freeze({ id: 'energique', label: 'Énergique', description: 'Danses, enthousiasme et petites célébrations.', color: 'var(--3b-champagne-highlight)', energy: 1 }),
]);

export const DEFAULT_LIVING_PREFS = Object.freeze({
  personality: 'bienveillant', voiceEnabled: false, voiceId: 'auto', voiceStyle: 'grave', initiative: true,
});

const PERSONALITY_ALIASES = Object.freeze({ gentil: 'bienveillant', provocateur: 'audacieux', 'énergique': 'energique' });
const VOICE_STYLES = new Set(['grave', 'naturelle', 'lumineuse', 'calme']);

function personalityId(value) {
  const id = typeof value === 'string' ? value.toLowerCase().trim() : '';
  const alias = Object.hasOwn(PERSONALITY_ALIASES, id) ? PERSONALITY_ALIASES[id] : id;
  return COMPANION_PERSONALITIES.some(personality => personality.id === alias) ? alias : DEFAULT_LIVING_PREFS.personality;
}

export function sanitizeLivingPrefs(value = {}) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) value = {};
  // IDs identify browser voices; they are never interpolated into URLs or filesystem paths.
  const voiceId = typeof value.voiceId === 'string' ? value.voiceId.trim().slice(0, 180) : '';
  return {
    personality: personalityId(value.personality),
    voiceEnabled: value.voiceEnabled === true,
    voiceId: voiceId && !/[\u0000-\u001f\u007f]/.test(voiceId) ? voiceId : 'auto',
    voiceStyle: VOICE_STYLES.has(value.voiceStyle) ? value.voiceStyle : 'grave',
    initiative: value.initiative !== false,
  };
}

const IDS = COMPANION_PERSONALITIES.map(item => item.id);
function bank(...groups) { return Object.fromEntries(IDS.map((id, index) => [id, groups[index]])); }

const LINES = {
  hello: bank(
    ['Content de te retrouver. On fait quelque chose ensemble ?', 'Bonjour ! Je suis là. Tu choisis le rythme.', 'Un petit salut pour toi. Qu’est-ce qui te ferait plaisir ?'],
    ['Ah, te voilà ! J’essayais justement d’avoir l’air sage.', 'Salut ! Mes bonnes idées sont prêtes. Les bêtises aussi.', 'Je t’ai gardé une place. Pas mon meilleur pas de danse.'],
    ['Bonjour. On prend notre temps.', 'Heureux de te retrouver. Par quoi veux-tu commencer ?', 'Je suis là. Une chose à la fois.'],
    ['Te voilà. On donne un peu de caractère à cette journée ?', 'Salut ! Une idée, un défi, et on se lance.', 'Prêt ? J’ai du répondant et deux pieds qui demandent à bouger.'],
    ['Salut ! Qu’est-ce qu’on pourrait découvrir aujourd’hui ?', 'Te revoilà. Une envie, une question, un endroit à explorer ?', 'Bonjour ! Si on commençait par une idée inattendue ?'],
    ['Salut ! On danse, on explore ou on se lance un défi ?', 'Te voilà ! J’ai de l’énergie à partager.', 'Allez, nouvelle visite, nouvelle aventure ! Tu choisis ?'],
  ),
  dance: bank(
    ['Une petite danse pour toi. Tu peux juste profiter.', 'Je te prépare quelques pas. On garde le sourire.'],
    ['Attention, talent approximatif et confiance absolue.', 'Si mes pieds partent chacun de leur côté, c’est la chorégraphie.'],
    ['Quelques pas, tout doucement.', 'Je suis le rythme. Rien ne presse.'],
    ['Tu voulais du mouvement ? Regarde bien.', 'Place libre. J’entre en scène.'],
    ['Et si je mélangeais ces deux pas ? On essaie.', 'J’explore une nouvelle chorégraphie. Observation en cours.'],
    ['C’est parti ! Les pieds, les bras, tout le monde participe !', 'Le rythme monte. À moi la piste !'],
  ),
  breakdance: bank(
    ['Un petit tour au sol, et je reviens vers toi.', 'Je tente une figure. Tu m’encourages ?'],
    ['J’ai prévenu mes genoux. Ils ne m’ont pas répondu.', 'Si je tourne trop longtemps, appelle ça un style.'],
    ['Un appui. Une rotation. On reste souple.', 'Je prends mon élan, puis je tourne.'],
    ['Défi reçu. On passe au niveau acrobatique.', 'La piste est petite. L’ambition, beaucoup moins.'],
    ['Voyons ce que donne une rotation avec cet appui.', 'Changement de perspective : le monde vu du sol.'],
    ['Au sol, on tourne, et on repart !', 'Breakdance ! Prépare les applaudissements !'],
  ),
  walk: bank(
    ['Je fais quelques pas. Je reste tout près.', 'Une petite promenade, ça te dit ?'],
    ['Inspection de l’application. Je cherche où cacher mes bêtises.', 'Je vais voir là-bas si j’y suis.'],
    ['Quelques pas tranquilles.', 'Je me promène, à mon rythme.'],
    ['Je prends le terrain. Garde un œil sur moi.', 'Un peu d’allure. On avance.'],
    ['Tiens, qu’y a-t-il de ce côté ?', 'J’explore un autre angle.'],
    ['En marche ! J’ai les jambes qui s’impatientent.', 'Une petite traversée, et je reviens !'],
  ),
  pocket: bank(
    ['J’ai une petite surprise dans ma poche. Regarde.', 'Un objet de mon petit monde, juste pour le plaisir.'],
    ['Ma poche est mieux rangée que mes idées. Enfin, presque.', 'Qu’est-ce que j’ai là ? Promis, ce n’est pas une facture.'],
    ['Je te montre un petit objet.', 'Une surprise toute simple.'],
    ['Les mains vides ? Jamais. Regarde ce que je prépare.', 'J’ai toujours un petit effet en réserve.'],
    ['Tiens… qu’est-ce que cette poche peut bien contenir ?', 'On examine ma trouvaille ensemble ?'],
    ['Surprise ! Je te sors quelque chose !', 'Une poche, un geste… et voilà !'],
  ),
  hologram: bank(
    ['Je fais apparaître une petite lumière pour toi.', 'Un petit hologramme, comme une veilleuse du futur.'],
    ['Ma lampe de poche a pris beaucoup trop confiance.', 'Voilà mon idée lumineuse. Pour une fois, c’est littéral.'],
    ['Une lumière qui flotte. On regarde.', 'Je déploie un petit hologramme.'],
    ['Place à ma signature lumineuse.', 'Regarde cette main. C’est là que ça se passe.'],
    ['Et si on dessinait quelque chose avec de la lumière ?', 'Une projection dans la paume. J’aime cette idée.'],
    ['Lumière ! On allume la petite scène !', 'Hologramme en approche ! Regarde ma main !'],
  ),
  hang: bank(
    ['Je m’accroche ici un instant. Tu me vois ?', 'Un petit perchoir pour voir les choses autrement.'],
    ['La typographie avait besoin d’un acrobate.', 'Je suis officiellement un signe de ponctuation.'],
    ['Un appui, un équilibre.', 'Je me suspends un moment.'],
    ['Même les lettres deviennent mon terrain de jeu.', 'En hauteur aussi, j’ai de l’allure.'],
    ['Ce bord fait un perchoir intéressant.', 'Et si on regardait depuis cette lettre ?'],
    ['Hop, en hauteur ! Je tiens bon !', 'Accroché ! L’application a une nouvelle décoration !'],
  ),
  fall: bank(
    ['Oups ! Je me rattrape, tout va bien.', 'Un petit rebond, et je me remets sur mes pieds.'],
    ['Atterrissage artistique. Absolument prévu. Enfin… presque.', 'La gravité vient de gagner cette manche.'],
    ['Je redescends. Et je retrouve mon équilibre.', 'Un rebond. Me voilà posé.'],
    ['Même mes chutes ont du panache.', 'Au sol ? Oui. Vaincu ? Pas dans cette petite scène.'],
    ['Expérience terminée : la gravité fonctionne.', 'Intéressant… Il faudra revoir le dernier appui.'],
    ['Et hop, rebond ! On repart !', 'Oups ! Bien rattrapé, on garde le rythme !'],
  ),
  highfive: bank(
    ['Tope là. Content de partager ce moment avec toi.', 'Un petit geste d’équipe. Tope là !'],
    ['Tope là ! J’ai failli viser le bouton d’à côté.', 'Bien joué. Main droite, gauche… on va y arriver.'],
    ['Tope là. Tout simplement.', 'Un petit signe, ensemble.'],
    ['Tope là. Belle équipe.', 'Main levée. À toi de jouer.'],
    ['Un geste, et on se comprend. Tope là ?', 'Et si on scellait cette idée avec un tope là ?'],
    ['Tope là ! Équipe 3B !', 'Oui ! Main en l’air, on célèbre !'],
  ),
  focus: bank(
    ['Je me pose pour te laisser te concentrer.', 'Une chose à la fois. Je reste discret un moment.'],
    ['Je range mes bêtises. Au moins pour cette pause.', 'Mode sérieux. J’ai même préparé mon air concentré.'],
    ['Un peu de silence. Une seule intention.', 'Je me pose. Tu peux te concentrer.'],
    ['On vise juste. La suite attendra.', 'On choisit une chose, et on s’y tient.'],
    ['Quelle est la première petite étape ? On peut commencer par elle.', 'Je réfléchis tranquillement avec toi.'],
    ['On canalise l’énergie. Une chose à la fois !', 'Petite pause, objectif clair. Je me pose.'],
  ),
  rest: bank(
    ['On fait une petite pause. Tu reprends quand tu veux.', 'Je m’assieds un moment. Aucun besoin de se presser.'],
    ['Pause officielle. Mes chaussures l’ont demandée.', 'Je recharge mon stock de mauvaises idées.'],
    ['On ralentit.', 'Une pause. C’est très bien aussi.'],
    ['Savoir s’arrêter, c’est aussi avoir du style.', 'Pause maîtrisée. La suite attendra.'],
    ['C’est le bon moment pour laisser venir une idée.', 'Je m’assieds. Parfois, observer suffit.'],
    ['Pause ! Même les batteries d’enthousiasme se posent.', 'On souffle un peu. À ton rythme !'],
  ),
  sleep: bank(
    ['Je ferme les yeux un instant. Repose-toi si tu en as envie.', 'Je me mets au repos. Tu peux continuer tranquillement.'],
    ['Si je ronfle, c’est le ventilateur de mon imagination.', 'Petite sieste. Mes bêtises sont en veille.'],
    ['Je me repose. Tout doucement.', 'Un moment de sommeil pour mon petit personnage.'],
    ['Même les légendes font une sieste.', 'Je ferme un œil. Puis l’autre. Avec panache.'],
    ['Je pars rêver à une nouvelle idée.', 'Voyons ce que mon imagination invente pendant la sieste.'],
    ['Mode dodo ! L’énergie se met en réserve.', 'Je coupe les moteurs un petit moment.'],
  ),
  cheer: bank(
    ['Je t’envoie un peu de courage. Un petit pas compte aussi.', 'On peut célébrer ce petit moment ensemble.'],
    ['Applaudissements maison. C’est moi l’orchestre.', 'J’ai réservé la standing ovation. Pour nous deux.'],
    ['Un sourire. Un petit encouragement.', 'Je célèbre ce moment à ma façon.'],
    ['Un peu de fierté. Tu peux avancer à ta façon.', 'On relève la tête. Le prochain petit pas est à toi.'],
    ['Les petites avancées méritent aussi qu’on les remarque.', 'Qu’est-ce qui te ferait plaisir de célébrer aujourd’hui ?'],
    ['Allez ! Un petit pas, et on avance !', 'Célébration ! On partage un peu d’énergie !'],
  ),
  curious: bank(
    ['Une idée à partager, si tu en as envie.', 'Tu veux découvrir un petit détail avec moi ?'],
    ['J’ai une question. Elle est presque sérieuse.', 'Je réfléchis. Oui, ça m’arrive entre deux bêtises.'],
    ['Je regarde. Je prends le temps.', 'Une idée vient de passer.'],
    ['Une idée un peu folle mérite qu’on la regarde.', 'J’observe le terrain avant mon prochain numéro.'],
    ['Tiens… et si on essayait autrement ?', 'Chaque détail peut cacher une bonne question.'],
    ['Oh ! Nouvelle idée !', 'J’ai trouvé une piste à explorer !'],
  ),
  support: bank(
    ['Ça a l’air d’être un moment difficile. Tu veux un peu de calme, un encouragement ou une distraction ?', 'Pas besoin de faire semblant avec moi. On peut prendre ce moment doucement.'],
    ['Je range les taquineries un instant. On se pose, ou je te change les idées ?', 'Même mon humour sait faire une pause. Qu’est-ce qui te ferait du bien maintenant ?'],
    ['On peut ralentir. Tu préfères du silence ou quelques mots ?', 'Prends ce moment à ton rythme. Je peux proposer une pause.'],
    ['Pas de défi à relever maintenant. Tu as le droit de souffler.', 'On baisse la pression. Une pause ou un peu d’encouragement ?'],
    ['Tu préfères en dire un peu plus, ou penser à autre chose ?', 'Je ne peux pas tout comprendre, mais je peux t’offrir un petit moment plus doux.'],
    ['Je baisse le volume. On prend soin de ce moment, à ton rythme.', 'Aujourd’hui, pas besoin d’aller vite. Une pause, puis tu choisis.'],
  ),
  happy: bank(
    ['Ça fait plaisir à lire ! Tu veux qu’on célèbre avec une danse ?', 'Je partage ton sourire. Tope là ?'],
    ['Une bonne humeur pareille, ça mérite ma chorégraphie douteuse.', 'Bonne nouvelle pour mes chaussures : on va peut-être danser.'],
    ['C’est agréable. Profitons de ce petit moment.', 'Un beau moment à savourer.'],
    ['Voilà l’allure ! Une petite célébration ?', 'Cette énergie mérite une entrée en scène.'],
    ['Qu’est-ce qui t’a fait sourire aujourd’hui ?', 'J’aime cette ambiance. On en fait une petite danse ?'],
    ['Oui ! On célèbre ça !', 'Bonne humeur reçue ! Prêt pour une danse ?'],
  ),
  joke: bank(
    ['Pourquoi je n’ai jamais froid ? Parce que je garde toujours un petit lien chaleureux avec 3B.', 'J’ai voulu plier une carte du Monde 3B. Maintenant, j’ai surtout un origami imaginaire.'],
    ['J’ai essayé de ranger ma poche. J’ai trouvé une autre poche. Je vais bientôt payer un loyer.', 'Pourquoi je m’accroche aux lettres ? Parce qu’on m’a dit de soigner mon caractère.'],
    ['Mon passe-temps préféré ? Prendre le temps. Ça ne demande pas beaucoup de matériel.', 'J’ai mis mes idées au repos. Elles avaient déjà commencé sans moi.'],
    ['J’ai défié mon ombre à la course. Égalité. Elle connaît trop bien mon jeu.', 'J’ai demandé une entrée spectaculaire. La porte m’a répondu : « pousse ».'],
    ['Si une lettre tombe, est-ce qu’on appelle ça une chute de texte ?', 'J’ai interrogé ma poche sur ses secrets. Elle a dit qu’elle préférait garder ça pour elle.'],
    ['J’ai commandé des chaussures silencieuses. Elles ont fait un pas de danse en arrivant.', 'Mon réveil m’a dit de me lever. J’ai proposé un battle. Il a gagné au volume.'],
  ),
  unknown: bank(
    ['Je n’ai pas de réponse fiable à cette question. Je peux t’accompagner dans 3B, jouer une scène ou te proposer une petite question.', 'Pour ça, je préfère être honnête : mon dialogue reste limité à 3B et à nos petites interactions. On explore, on joue ou on discute de ton humeur ?'],
    ['Ma poche est pleine de surprises, pas de réponses à tout. Je sais te guider dans 3B, plaisanter et jouer une scène.', 'Là, tu dépasses mon petit répertoire. Je ne vais pas inventer. Une question sur 3B, une danse ou une blague ?'],
    ['Je ne sais pas répondre à cela. Je peux te guider dans 3B ou partager une petite interaction.', 'Je n’ai pas cette information. On peut rester sur 3B, une pause ou un petit jeu.'],
    ['J’ai du répondant, mais pas réponse à tout. Sur ce sujet, je préfère ne rien inventer.', 'Ce terrain dépasse mes capacités. En revanche, une scène, un défi ou une visite de 3B : je suis prêt.'],
    ['Bonne question. Je ne peux pas faire de recherche ; mon dialogue couvre 3B, les scènes et les petits jeux.', 'Je n’ai pas assez d’informations pour répondre. Tu veux explorer 3B ou essayer une devinette ?'],
    ['Je n’ai pas la réponse à tout ! Mon terrain, c’est 3B, les animations et nos petits échanges.', 'Je préfère te le dire : ça dépasse ce que je sais répondre ici. Une danse, un défi ou un repère dans 3B ?'],
  ),
};

function recentMessages(recent) {
  return Array.isArray(recent) ? recent.slice(-12).map(item => typeof item === 'string' ? item : item?.message).filter(item => typeof item === 'string') : [];
}

function pick(values, turn = 0, recent = []) {
  const index = Number.isFinite(turn) ? Math.abs(Math.trunc(turn)) % values.length : 0;
  const previous = recentMessages(recent);
  const ordered = values.map((_, offset) => values[(index + offset) % values.length]);
  return ordered.find(line => !previous.includes(line)) || ordered.find(line => line !== previous.at(-1)) || ordered[0];
}

const SCENE_ALIASES = Object.freeze({ idle: 'curious', think: 'focus', sit: 'rest', celebrate: 'cheer', wake: 'hello', stroll: 'walk', glance: 'curious', guardian: 'curious', notification: 'curious', reward: 'cheer', secret: 'curious', clock: 'pocket' });

export function companionSceneLine(kind, personality = 'bienveillant', turn = 0, recent = []) {
  const key = Object.hasOwn(SCENE_ALIASES, kind) ? SCENE_ALIASES[kind] : kind;
  const lines = Object.hasOwn(LINES, key) ? LINES[key] : LINES.curious;
  return pick(lines[personalityId(personality)], turn, recent);
}

const actionChoice = (label, action, text) => ({ label, action, ...(text ? { text } : {}) });
const TEXT_CHOICES = [
  { label: 'Une question', text: 'Pose-moi une question' },
  { label: 'Une danse', text: 'Danse pour moi', action: 'dance' },
  { label: 'Un repère', text: 'Que faire sur cette page ?' },
];

const QUESTION_LINES = [
  bank(
    ['De quoi as-tu envie maintenant : un peu de calme, un sourire ou du mouvement ?'], ['Alors, humeur sage, joyeuse ou « fais-moi rire » ?'],
    ['Comment veux-tu vivre ce moment ?'], ['On choisit notre énergie : pause, sourire ou entrée en scène ?'],
    ['Qu’est-ce qui changerait agréablement ta visite maintenant ?'], ['Tu choisis l’ambiance ! On souffle, on rit ou on danse ?'],
  ),
  bank(
    ['Une petite devinette ? J’ai des villes, des routes et des rivières, mais aucun habitant. Qui suis-je ?'], ['J’ai des villes, des routes, des rivières… et personne pour sortir les poubelles. Qui suis-je ?'],
    ['Devinette : des villes, des routes, des rivières, aucun habitant. Qui suis-je ?'], ['Petit défi : des villes, des routes, des rivières, mais aucun habitant. Tu trouves ?'],
    ['Comment réunir des villes, des routes et des rivières sans un seul habitant ?'], ['Défi éclair ! Villes, routes, rivières, zéro habitant. Qu’est-ce que c’est ?'],
  ),
  bank(
    ['Je te prépare une surprise. Tu préfères un objet de poche, une lumière ou une acrobatie ?'], ['Ma poche, ma lumière ou mes talents d’acrobate : qu’est-ce qu’on teste ?'],
    ['Une petite scène ? Choisis celle qui te plaît.'], ['Trois façons d’entrer en scène. Laquelle tu me lances ?'],
    ['Si tu pouvais essayer une de mes curiosités, laquelle choisirais-tu ?'], ['Surprise au choix ! Poche, hologramme ou breakdance ?'],
  ),
  bank(
    ['Si tu inventais un lieu dans 3B, ce serait plutôt un jardin, une grande place ou une scène ?'], ['On invente un quartier. Tu me donnes un jardin, une place ou une scène pour mes chaussures ?'],
    ['Imagine un lieu qui te ressemble : jardin, place ou scène ?'], ['Carte blanche. Quel lieu aurait ta signature : jardin, place ou scène ?'],
    ['Quel endroit pourrait rapprocher les gens : un jardin, une place ou une scène ?'], ['On imagine notre coin de 3B ! Un jardin, une place ou une scène ?'],
  ),
];

export function companionQuestion(personality = 'bienveillant', turn = 0) {
  const index = Number.isFinite(turn) ? Math.abs(Math.trunc(turn)) % QUESTION_LINES.length : 0;
  const choices = [
    [ { label: 'Du calme', text: 'Je veux un moment calme' }, { label: 'Un sourire', text: 'Raconte-moi une blague' }, { label: 'Du mouvement', text: 'Danse pour moi', action: 'dance' } ],
    [ { label: 'Une carte', text: 'Pour ta devinette des villes : une carte.' }, { label: 'Un rêve', text: 'Pour ta devinette des villes : un rêve.' }, { label: 'Un indice', text: 'Un indice pour ta devinette des villes' } ],
    [ actionChoice('La poche', 'pocket', 'Sors un objet de ta poche'), actionChoice('L’hologramme', 'hologram', 'Montre un hologramme'), actionChoice('L’acrobatie', 'breakdance', 'Fais du breakdance') ],
    [ { label: 'Un jardin', text: 'Mon lieu imaginaire : un jardin' }, { label: 'Une place', text: 'Mon lieu imaginaire : une place' }, { label: 'Une scène', text: 'Mon lieu imaginaire : une scène' } ],
  ][index];
  return { message: QUESTION_LINES[index][personalityId(personality)][0], pose: 'curious', choices, questionId: ['mood', 'map-riddle', 'scene', 'imaginary-place'][index] };
}

const PAGE_FACTS = Object.freeze({
  home: 'Depuis l’accueil, tu peux ouvrir le Passeport, le Secret, le Monde 3B ou la Boutique.',
  passport: 'Le Passeport rassemble ton identité 3B. Le bouton « 3B MA VILLE » te mène à ta ville.',
  world3b: 'Le Monde 3B te permet d’explorer la Cité des Huit Héritages. Tu gardes les commandes de ton personnage.',
  member: 'L’espace membre sert à te connecter et à retrouver ton compte. Je ne peux pas lire tes données privées.',
  shop: 'La Boutique présente les créations 3B. Consulte la fiche d’un article pour son prix et sa disponibilité.',
  guide: 'Le Guide rassemble les repères pour te retrouver dans l’application.',
});

const LEADS = bank(
  ['Je te montre le chemin.', 'On peut commencer par ici.'], ['Petite visite guidée. Je remets ma casquette sérieuse.', 'Pas besoin de suivre mes pas de danse pour se repérer.'],
  ['Voici le repère.', 'Prenons un point de départ.'], ['Un repère, et tu prends les commandes.', 'Choisissons une direction.'],
  ['Voici ce qu’on peut explorer.', 'Regardons les possibilités.'], ['On se repère, puis on y va !', 'Voilà les possibilités !'],
);

function pageReply({ destination, personality, page, secretPhase, memberRegistered, turn, recent }) {
  const target = destination || (Object.hasOwn(PAGE_FACTS, page) || page === 'secret' ? page : 'home');
  const secretOpen = ['open', 'attempt'].includes(secretPhase);
  let fact = target === 'secret'
    ? secretOpen ? 'Le Secret est ouvert maintenant. Ouvre sa page pour voir l’état de ta tentative.' : 'Consulte la page du Secret pour son état et son prochain horaire. Je ne peux pas deviner l’heure d’ouverture.'
    : PAGE_FACTS[target] || PAGE_FACTS.home;
  if (target === 'member' && memberRegistered) fact = 'Tu es déjà inscrit. Ton espace membre permet de retrouver ton compte ; je n’ai pas accès à ses informations privées.';
  const candidates = [
    ...(secretOpen && target !== 'secret' ? [{ label: 'Secret ouvert', page: 'secret' }] : []),
    ...(target !== page ? [{ label: ({ home: 'Accueil', passport: 'Mon Passeport', world3b: 'Explorer le Monde', secret: 'Ouvrir le Secret', member: memberRegistered ? 'Mon espace membre' : 'Connexion / inscription', shop: 'Voir la Boutique', guide: 'Ouvrir le Guide' })[target], page: target }] : []),
    { label: memberRegistered ? 'Mon Passeport' : 'Connexion / inscription', page: memberRegistered ? 'passport' : 'member' },
    { label: 'Explorer le Monde', page: 'world3b' },
  ];
  const seen = new Set([page]);
  const choices = candidates.filter(item => { if (seen.has(item.page)) return false; seen.add(item.page); return true; }).slice(0, 3);
  return { message: `${pick(LEADS[personality], turn, recent)} ${fact}`, pose: 'curious', choices };
}

function normalize(text) {
  return typeof text === 'string' ? text.slice(0, 480).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[’'\-]/g, ' ').replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim() : '';
}

/** Bounded intents intentionally return only local scenes and known navigation choices. */
export function companionReply(options = {}) {
  if (!options || typeof options !== 'object') options = {};
  const { text, page = 'home', secretPhase, memberRegistered = false, turn = 0, now = new Date(), recent = [] } = options;
  const personality = personalityId(options.personality);
  const input = normalize(text);
  const lastQuestion = recentMessages(recent).slice().reverse().map(message => QUESTION_LINES.findIndex(group => Object.values(group).some(lines => lines.includes(message)))).find(index => index >= 0);
  const say = (kind, extra = {}) => ({ message: companionSceneLine(kind, personality, turn, recent), pose: kind, ...extra });
  const act = action => say(action, { action });
  const help = destination => pageReply({ destination, personality, page, secretPhase, memberRegistered, turn, recent });

  // These are explicit user controls, handled by the layer before any speech or scene.
  // Ordinary requests for a pause remain temporary scenes and do not change preferences.
  if (/\b(?:silence|tais toi|(?:coupe|eteins|desactive|arrete) (?:ta |la |ton )?(?:voix|son)|arrete de (?:me )?parler|ne (?:me )?parle (?:pas|plus))\b/.test(input)) return { ...act('rest'), control: 'mute' };
  if (/\b(?:laisse moi tranquille|arrete tout|ne (?:te )?bouge (?:pas|plus)|reste tranquille|ne fais plus rien|ne (?:me )?pose (?:pas|plus) de questions|pas d initiatives?|desactive (?:tes |les )?initiatives)\b/.test(input)) return { ...act('rest'), control: 'quiet' };
  if (/\b(?:stop|arrete)\b/.test(input) || /\b(?:ne|n)\b.*\b(?:pas|plus)\b/.test(input) && /\b(?:danse|danser|marche|marcher|bouge|bouger|parle|parler|questions?)\b/.test(input)) return { ...act('rest'), control: 'stop' };

  if (/devinette des villes/.test(input) || /^(?:une|la) carte$/.test(input) || lastQuestion === 1 && /^(?:(?:un|une|la|le|l) )?(?:carte|reve|plan|atlas)$/.test(input)) {
    if (/indice/.test(input)) return { message: 'Indice : tu peux la plier, ou l’ouvrir pour préparer un trajet. Elle représente des lieux.', pose: 'curious', choices: [{ label: 'Une carte ?', text: 'Pour ta devinette des villes : une carte.' }] };
    if (/\b(?:carte|plan|atlas)\b/.test(input)) return { ...say('cheer'), message: `${companionSceneLine('cheer', personality, turn, recent)} Oui : une carte ! Elle représente ces lieux sans les habiter.`, action: 'highfive', choices: [{ label: 'Une autre question', text: 'Pose-moi une autre question' }] };
    return { message: 'Un rêve, c’est une jolie idée. La réponse que j’avais en tête est « une carte » : elle montre ces lieux sans habitants.', pose: 'curious', choices: [{ label: 'Une autre question', text: 'Pose-moi une autre question' }] };
  }
  if (/mon lieu imaginaire/.test(input) || lastQuestion === 3 && /^(?:un|une|le|la) (?:jardin|place|scene)$/.test(input)) {
    const place = /jardin/.test(input) ? 'Un jardin : des chemins, de l’ombre et un endroit pour se retrouver.' : /scene/.test(input) ? 'Une scène : un endroit pour partager une voix, une danse ou une histoire.' : 'Une place : des passages qui se croisent et un lieu ouvert aux rencontres.';
    return { message: `${pick(LEADS[personality], turn, recent)} ${place} C’est notre petite idée, pas une construction enregistrée.`, pose: 'curious', choices: [{ label: 'Voir le Monde 3B', page: 'world3b' }, { label: 'Une autre question', text: 'Pose-moi une autre question' }] };
  }
  if (/\b(?:voix|vocale|vocal|parle moi|parler)\b/.test(input) && /\b(?:grave|profonde|feminine|masculine|changer|differente|style|choisir|voix)\b/.test(input)) {
    return { message: 'Tu peux activer ma voix dans mes réglages, choisir une voix disponible et essayer un style grave, naturel, lumineux ou calme. Le choix dépend des voix de ton appareil.', pose: 'curious', choices: [{ label: 'Dis bonjour', text: 'Bonjour' }] };
  }
  if (/\b(?:fatigue|epuise|triste|deprime|seul|angoisse|stresse|malheureux|difficile|ca ne va pas|ca va pas|pas bien|mauvaise journee)\b/.test(input)) return say('support', { pose: 'rest', choices: [{ label: 'Un encouragement', text: 'Encourage-moi' }, { label: 'Une pause', text: 'Fais une pause', action: 'rest' }, { label: 'Une distraction', text: 'Raconte-moi une blague' }] });
  if (/\b(?:heureux|heureuse|content|contente|super journee|bonne humeur|ca va bien|joyeux|joyeuse)\b/.test(input)) return say('happy', { pose: 'hello', choices: [actionChoice('Danser', 'dance', 'Danse pour moi'), actionChoice('Tope là', 'highfive', 'Tope là')] });
  if (/\b(?:breakdance|break dance|hip hop|moonwalk|acrobatie|figure au sol)\b/.test(input)) return act('breakdance');
  if (/\b(?:danse|danser|danses|dance|choregraphie|bouge)\b/.test(input) || lastQuestion === 0 && /^(?:du |un peu de )?mouvement$/.test(input)) return act('dance');
  if (/\b(?:hologramme|hologram|projection|lumiere|futuriste)\b/.test(input)) return act('hologram');
  if (/\b(?:poche|surprise|sors un objet|objet)\b/.test(input)) return act('pocket');
  if (/\b(?:accroche|accrocher|suspends|suspendre|lettre|lettres|grimpe|perchoir)\b/.test(input)) return act('hang');
  if (/\b(?:tombe|tomber|chute|rebond|saute)\b/.test(input)) return act('fall');
  if (/\b(?:tope la|tape la|high five|highfive|check)\b/.test(input)) return act('highfive');
  if (/\b(?:marche|marcher|promene|promenade|balade|deplace toi)\b/.test(input)) return act('walk');
  if (/\b(?:dors|dormir|dodo|sommeil|sieste|bonne nuit)\b/.test(input)) return act('sleep');
  if (/\b(?:focus|concentre|concentrer|concentration|reflechis|reflechir|travaille)\b/.test(input)) return act('focus');
  if (/\b(?:pause|repos|repose|assis|assieds|calme|ralentis|souffler|respire)\b/.test(input)) return act('rest');
  if (/\b(?:encourage|encourager|courage|motive|motivation|celebre|celebrer|bravo|applaudis|applaudir)\b/.test(input)) return act('cheer');
  if (/\b(?:blague|drole|humour|rire|rigole)\b/.test(input) || lastQuestion === 0 && /^(?:un )?sourire$/.test(input)) return say('joke', { pose: 'hello', choices: [{ label: 'Encore une', text: 'Une autre blague' }, actionChoice('Une danse', 'dance', 'Danse pour moi')] });
  if (/\b(?:devinette|defi|challenge|interroge|demande moi)\b/.test(input) || /\b(?:pose|poser|propose|proposer|donne|donner)(?: moi)? (?:une |une autre |des |ta |la |quelques )?questions?\b/.test(input) || /^(?:une |une autre )?questions?$/.test(input)) {
    const questionTurn = /\b(?:devinette|defi|challenge)\b/.test(input) ? 1 : turn;
    return companionQuestion(personality, questionTurn);
  }
  if (/\b(?:secret|signal|coffre)\b/.test(input)) return help('secret');
  if (/\b(?:heure|horloge)\b/.test(input)) {
    const date = now instanceof Date ? now : new Date(now);
    if (!Number.isFinite(date.getTime())) return { message: 'Je ne peux pas lire l’heure correctement. L’horloge de ton appareil reste le repère.', pose: 'curious' };
    const time = new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit' }).format(date);
    const timeLines = bank([`Il est ${time}, d’après ton appareil. On prend notre temps.`], [`${time} à l’horloge de ton appareil. L’heure parfaite pour une petite bêtise ?`], [`Il est ${time}, selon ton appareil.`], [`${time} sur ton appareil. À toi de décider de la suite.`], [`Ton appareil indique ${time}. Qu’as-tu envie de faire de ce moment ?`], [`Il est ${time} sur ton appareil ! On choisit la suite ?`]);
    return { message: timeLines[personality][0], pose: 'pocket' };
  }
  if (/\b(?:passeport|passport|identite|ma ville|ma carte)\b/.test(input)) return help('passport');
  if (/\b(?:monde|cite|royaume|royaumes|ka is|kais|hub)\b/.test(input)) return help('world3b');
  if (/\b(?:boutique|acheter|vetement|prix|shop)\b/.test(input)) return help('shop');
  if (/\b(?:compte|membre|connexion|inscription|inscrit|connecter|coins|xp|solde|inventaire|argent|recompense)\b/.test(input)) return help('member');
  if (/\b(?:accueil|home)\b/.test(input)) return help('home');
  if (/\b(?:guide|aide|aider|perdu|reperer|cette page|faire ici|on fait quoi|ou aller)\b/.test(input)) return help();
  if (/\b(?:capacite|capacites|peux tu faire|peux faire|sais faire|sais tu faire|tu sais faire|tu fais quoi|qui es tu|qui est tu|vivant|fonctionne|mode|personnalite)\b/.test(input)) {
    return { message: `${companionSceneLine('hello', personality, turn, recent)} Je peux marcher, danser, sortir un objet, montrer un hologramme, jouer avec un bord de l’application et discuter dans mon petit répertoire 3B. Tu choisis ma personnalité et mes initiatives.`, pose: 'hello', choices: TEXT_CHOICES.map(choice => ({ ...choice })) };
  }
  if (/\b(?:merci|sympa|gentil|t es cool|tu es cool)\b/.test(input)) return say('highfive', { pose: 'hello', choices: [actionChoice('Tope là', 'highfive', 'Tope là')] });
  if (!input || /^(?:salut|bonjour|bonsoir|coucou|hello|hey|yo)\b/.test(input) || /^(?:ca va|comment ca va|comment vas tu|comment tu vas)(?: toi)?$/.test(input) || /\b(?:dis moi bonjour|dis bonjour|parle moi|parlons|dis moi quelque chose)\b/.test(input)) return say('hello', { choices: TEXT_CHOICES.map(choice => ({ ...choice })) });
  if (/^(?:oui|ok|d accord|pourquoi pas|vas y|vasi)$/.test(input)) return { message: 'Tu choisis ce qui te plaît : une petite scène, une question ou un repère dans 3B.', pose: 'curious', choices: TEXT_CHOICES.map(choice => ({ ...choice })) };
  if (/^(?:non|pas maintenant|plus tard|non merci)$/.test(input)) return act('rest');
  return say('unknown', { pose: 'curious', choices: TEXT_CHOICES.map(choice => ({ ...choice })) });
}
