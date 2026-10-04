import test from 'node:test';
import assert from 'node:assert/strict';
import {
  COMPANION_PERSONALITIES, DEFAULT_LIVING_PREFS, sanitizeLivingPrefs,
  companionReply, companionQuestion, companionSceneLine,
} from '../src/companion/companion-personality.js';

const ids = ['bienveillant', 'taquin', 'calme', 'audacieux', 'curieux', 'energique'];

test('living preferences stay separate from native permissions and voice stays explicit opt-in', () => {
  for (const value of [undefined, null, [], false, 'taquin', {}]) {
    assert.deepEqual(sanitizeLivingPrefs(value), DEFAULT_LIVING_PREFS);
  }
  assert.deepEqual(sanitizeLivingPrefs({ personality: '__proto__', voiceEnabled: 'true', initiative: false, androidOverlayEnabled: true }), {
    ...DEFAULT_LIVING_PREFS, initiative: false,
  });
  assert.equal(sanitizeLivingPrefs({ personality: 'Provocateur' }).personality, 'audacieux');
  assert.equal(sanitizeLivingPrefs({ personality: 'Gentil' }).personality, 'bienveillant');
  assert.equal(sanitizeLivingPrefs({ personality: 'Énergique' }).personality, 'energique');
  assert.equal(sanitizeLivingPrefs({ voiceEnabled: true }).voiceEnabled, true);
  assert.equal(sanitizeLivingPrefs({ voiceStyle: 'calme' }).voiceStyle, 'calme');
  assert.equal(sanitizeLivingPrefs({ voiceStyle: 'unknown' }).voiceStyle, 'grave');
  assert.equal(sanitizeLivingPrefs({ voiceId: 'Samsung Français' }).voiceId, 'Samsung Français');
  assert.equal(sanitizeLivingPrefs({ voiceId: '\u0000bad' }).voiceId, 'auto');
  assert.equal(sanitizeLivingPrefs({ voiceId: 'a'.repeat(400) }).voiceId.length, 180);
});

test('six personalities have distinct reactions to the same request and use design tokens', () => {
  assert.deepEqual(COMPANION_PERSONALITIES.map(item => item.id), ids);
  assert.equal(COMPANION_PERSONALITIES.find(item => item.id === 'audacieux').label, 'Provocateur');
  for (const item of COMPANION_PERSONALITIES) {
    assert.match(item.color, /^var\(--3b-/);
    assert.ok(item.energy > 0 && item.energy <= 1);
  }
  for (const text of ['Bonjour', 'Danse pour moi', 'Fais du breakdance', 'Sors un objet de ta poche', 'Encourage-moi', 'Raconte une blague', 'Je suis triste', 'Qui es-tu ?']) {
    const messages = ids.map(personality => companionReply({ text, personality }).message);
    assert.equal(new Set(messages).size, 6, text);
  }
});

test('every supported movement resolves to a real canonical action, including French accents', () => {
  const requests = {
    dance: 'Je voudrais que tu danses', breakdance: 'Fais du breakdance', walk: 'Promène-toi',
    pocket: 'Sors un truc de ta poche', hologram: 'Un hologramme, s’il te plaît',
    hang: 'Accroche-toi à une lettre', fall: 'Tombe puis rebondis', highfive: 'Tope là !',
    focus: 'Concentre-toi', rest: 'Fais une pause', sleep: 'Dors un peu', cheer: 'Encourage-moi',
  };
  for (const [action, text] of Object.entries(requests)) {
    for (const personality of ids) {
      const result = companionReply({ text, personality });
      assert.equal(result.action, action, `${personality}: ${text}`);
      assert.equal(result.pose, action);
      assert.ok(result.message.length > 8);
    }
  }
});

test('negative requests and mood input are not mistaken for dance commands', () => {
  for (const text of ['Ne danse pas', 'Ne me parle plus', 'Stop', 'Arrête de danser', 'Laisse-moi tranquille']) {
    assert.equal(companionReply({ text }).action, 'rest', text);
  }
  assert.equal(companionReply({ text: 'Je suis triste, pas envie de danser' }).action, undefined);
  assert.equal(companionReply({ text: 'Je suis fatigué' }).pose, 'rest');
  assert.ok(companionReply({ text: 'Je suis triste' }).choices.some(choice => choice.text === 'Encourage-moi'));
});

test('explicit silence, quiet presence and movement stops produce distinct actionable controls', () => {
  for (const text of ['Silence', 'Tais-toi', 'Coupe ta voix', 'Arrête de parler', 'Ne me parle plus']) {
    assert.equal(companionReply({ text }).control, 'mute', text);
    assert.equal(companionReply({ text }).action, 'rest');
  }
  for (const text of ['Laisse-moi tranquille', 'Ne bouge plus', 'Arrête tout', 'Désactive tes initiatives']) {
    assert.equal(companionReply({ text }).control, 'quiet', text);
    assert.equal(companionReply({ text }).action, 'rest');
  }
  for (const text of ['Arrête de danser', 'Ne marche pas', 'Ne danse plus', 'Stop']) {
    assert.equal(companionReply({ text }).control, 'stop', text);
    assert.equal(companionReply({ text }).action, 'rest');
  }
  for (const text of ['Une pause', 'Repose-toi', 'Un moment calme']) {
    assert.equal(companionReply({ text }).control, undefined, text);
    assert.equal(companionReply({ text }).action, 'rest');
  }
});

test('scene and reply variants avoid the recent utterance even if the caller reuses a turn', () => {
  for (const personality of ids) {
    for (const kind of ['hello', 'dance', 'pocket', 'hang', 'fall', 'rest', 'sleep', 'focus', 'cheer']) {
      const first = companionSceneLine(kind, personality, 0);
      const second = companionSceneLine(kind, personality, 0, [first]);
      assert.notEqual(first, second, `${personality}:${kind}`);
      assert.notEqual(companionSceneLine(kind, personality, 0, [first, second]), second);
    }
    const first = companionReply({ text: 'Danse', personality, turn: 0 });
    assert.notEqual(companionReply({ text: 'Danse', personality, turn: 0, recent: [first] }).message, first.message);
  }
  assert.equal(companionSceneLine('celebrate', 'taquin', 1), companionSceneLine('cheer', 'taquin', 1));
  assert.equal(companionSceneLine('sit', 'calme'), companionSceneLine('rest', 'calme'));
  assert.ok(companionSceneLine('__proto__', null, NaN));
});

test('all proactive question choices have intentional continuations instead of fallback answers', () => {
  for (const personality of ids) {
    const questions = Array.from({ length: 4 }, (_, turn) => companionQuestion(personality, turn));
    assert.equal(new Set(questions.map(question => question.questionId)).size, 4);
    for (const [turn, question] of questions.entries()) {
      assert.equal(question.pose, 'curious');
      assert.equal(question.choices.length, 3);
      for (const choice of question.choices) {
        assert.ok(choice.label && choice.text);
        const response = companionReply({ text: choice.text, personality, turn: turn + 1 });
        assert.ok(response.message);
        assert.notEqual(response.message, companionReply({ text: 'Explain tensor calculus', personality, turn: turn + 1 }).message);
        if (choice.action) assert.equal(response.action, choice.action);
      }
    }
  }
  assert.match(companionReply({ text: 'Pour ta devinette des villes : une carte.' }).message, /Oui : une carte/);
  assert.match(companionReply({ text: 'Pour ta devinette des villes : un rêve.' }).message, /réponse.*carte/);
  assert.match(companionReply({ text: 'Un indice pour ta devinette des villes' }).message, /Indice/);
});

test('short typed answers continue the recent question and never swallow a fresh action request', () => {
  for (const personality of ids) {
    const riddle = companionQuestion(personality, 1).message;
    assert.match(companionReply({ text: 'Un rêve', personality, recent: [riddle] }).message, /réponse.*carte/);
    assert.match(companionReply({ text: 'Un atlas', personality, recent: [riddle] }).message, /Oui : une carte/);
    assert.equal(companionReply({ text: 'Danse pour moi', personality, recent: [riddle] }).action, 'dance');
    const imagined = companionQuestion(personality, 3).message;
    assert.match(companionReply({ text: 'Un jardin', personality, recent: [riddle, imagined] }).message, /Un jardin/);
    const mood = companionQuestion(personality, 0).message;
    assert.equal(companionReply({ text: 'Du mouvement', personality, recent: [mood] }).action, 'dance');
    assert.equal(companionReply({ text: 'Un sourire', personality, recent: [mood] }).pose, 'hello');
  }
  assert.equal(companionReply({ text: 'Parle-moi' }).pose, 'hello');
  assert.match(companionReply({ text: 'J’ai une question sur mon Passeport' }).message, /3B MA VILLE/);
});

test('secret guidance uses actual context and never invents opening times or rewards', () => {
  for (const secretPhase of ['open', 'attempt']) {
    const result = companionReply({ text: 'À quelle heure ouvre le Secret ?', secretPhase, page: 'home' });
    assert.match(result.message, /Secret est ouvert maintenant/);
    assert.ok(result.choices.some(choice => choice.page === 'secret'));
  }
  for (const secretPhase of ['closed', 'waiting', undefined]) {
    const result = companionReply({ text: 'Le Secret ouvre à quelle heure ?', secretPhase, page: 'secret' });
    assert.match(result.message, /ne peux pas deviner/);
    assert.doesNotMatch(result.message, /est ouvert maintenant|\d{1,2}[:h]\d{2}/);
    assert.ok(result.choices.every(choice => choice.page !== 'secret'));
  }
});

test('navigation choices respect the current page and membership without pretending to read account data', () => {
  for (const page of ['home', 'passport', 'world3b', 'member', 'shop', 'guide', 'secret']) {
    const result = companionReply({ text: 'Que faire sur cette page ?', page, memberRegistered: true });
    assert.ok(result.choices.every(choice => choice.page !== page));
    assert.equal(new Set(result.choices.map(choice => choice.page)).size, result.choices.length);
  }
  const guest = companionReply({ text: 'Comment accéder à mon compte ?', memberRegistered: false });
  assert.ok(guest.choices.some(choice => choice.label === 'Connexion / inscription'));
  const member = companionReply({ text: 'Combien de Coins ai-je ?', memberRegistered: true });
  assert.match(member.message, /pas accès/);
  assert.doesNotMatch(member.message, /\d+ Coins/);
  assert.match(companionReply({ text: 'Où est mon passeport ?' }).message, /3B MA VILLE/);
});

test('voice replies tell users where to select available voices without silently changing preferences', () => {
  for (const text of ['Je veux une voix grave', 'Change de voix', 'Une voix féminine']) {
    const result = companionReply({ text });
    assert.match(result.message, /réglages/);
    assert.match(result.message, /voix de ton appareil/);
    assert.equal(result.action, undefined);
  }
});

test('time uses the passed clock and gracefully handles an invalid clock', () => {
  const now = new Date(2026, 9, 4, 23, 15);
  for (const personality of ids) {
    assert.match(companionReply({ text: 'Quelle heure est-il ?', personality, now }).message, /23:15/);
  }
  assert.match(companionReply({ text: 'Quelle heure ?', now: 'invalid' }).message, /ne peux pas lire l’heure/);
});

test('unknown text stays bounded, candid and does not echo markup or fabricate external knowledge', () => {
  for (const personality of ids) {
    const result = companionReply({ text: '<script>untrusted</script>'.repeat(500), personality });
    assert.equal(result.action, undefined);
    assert.ok(result.message.length < 400);
    assert.doesNotMatch(result.message, /script|untrusted|OpenAI|GPT|recherche effectuée/);
    assert.ok(result.choices.every(choice => choice.label && (choice.text || choice.action || choice.page)));
  }
  assert.ok(companionReply(null).message);
  assert.equal(companionReply({ text: 'Qu’est-ce que tu peux faire ?' }).pose, 'hello');
  assert.equal(companionReply({ text: 'Bonjour mon compagnon' }).pose, 'hello');
});
