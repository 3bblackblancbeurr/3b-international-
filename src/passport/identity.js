export const PASSPORT_COUNTRIES = Object.freeze({
  France: Object.freeze({ code: 'FR', flag: '🇫🇷', value: 'Justice' }),
  Algérie: Object.freeze({ code: 'DZ', flag: '🇩🇿', value: 'Loyauté' }),
  Espagne: Object.freeze({ code: 'ES', flag: '🇪🇸', value: 'Passion' }),
  Maroc: Object.freeze({ code: 'MA', flag: '🇲🇦', value: 'Noblesse' }),
  Italie: Object.freeze({ code: 'IT', flag: '🇮🇹', value: 'Espoir' }),
  Tunisie: Object.freeze({ code: 'TN', flag: '🇹🇳', value: 'Courage' }),
  Turquie: Object.freeze({ code: 'TR', flag: '🇹🇷', value: 'Foi' }),
  Estonie: Object.freeze({ code: 'EE', flag: '🇪🇪', value: 'Sagesse' }),
});

const cleanText = (value, max) => String(value ?? '').trim().slice(0, max);
const safeNumber = value => {
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? number : 0;
};
const PUBLIC_PASSPORT_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const publicPassportId = value => {
  const id = cleanText(value, 36);
  return PUBLIC_PASSPORT_UUID.test(id) ? id.toUpperCase() : '';
};

export function passportFromProfile(profile, user = null) {
  if (!profile || typeof profile !== 'object' || !profile.user_id) return null;
  if (user?.id && profile.user_id !== user.id) return null;

  if (!Object.hasOwn(PASSPORT_COUNTRIES, profile.country)) return null;
  const country = profile.country;
  const countryMeta = PASSPORT_COUNTRIES[country];
  const userId = cleanText(profile.user_id, 64);
  const opaquePublicId = publicPassportId(profile.passport_public_id);
  const name = cleanText(profile.name || profile.handle || 'Membre 3B', 80);
  const handle = cleanText(profile.handle, 24);
  const version = Number(profile.passport_version);

  return Object.freeze({
    userId,
    passportPublicId: opaquePublicId || null,
    passportId: opaquePublicId ? `3B-PASS-${opaquePublicId}` : '3B-PASS-EN-ATTENTE',
    memberId: opaquePublicId ? `3B-MEM-${opaquePublicId}` : '3B-MEM-EN-ATTENTE',
    passportIssuedAt: profile.passport_issued_at || null,
    passportVersion: Number.isInteger(version) && version > 0 ? version : null,
    passportState: cleanText(profile.passport_state, 16) || null,
    name,
    handle,
    country,
    countryCode: countryMeta.code,
    flag: countryMeta.flag,
    value: countryMeta.value,
    xp: safeNumber(profile.xp),
    points: safeNumber(profile.points),
    theme: cleanText(profile.theme, 32),
    createdAt: profile.created_at || null,
    public_badge_key: cleanText(profile.public_badge_key, 48),
    public_title: cleanText(profile.public_title, 80),
    public_verified: profile.public_verified === true,
  });
}

export function passportInitials(identity) {
  const label = cleanText(identity?.name || identity?.handle, 80)
    .replace(/[^\p{L}\p{N}\s._-]+/gu, ' ')
    .trim();
  if (!label) return '3B';

  const words = label.split(/\s+/).filter(Boolean);
  if (words.length === 1) {
    const token = words[0].replace(/[^\p{L}\p{N}]+/gu, '');
    if (!token) return '3B';
    if (token.length <= 4) return token.toLocaleUpperCase('fr-FR');
    return [...token].slice(0, 3).join('').toLocaleUpperCase('fr-FR');
  }

  return words
    .slice(0, 2)
    .map(word => [...word.replace(/[^\p{L}\p{N}]+/gu, '')][0] || '')
    .join('')
    .slice(0, 4)
    .toLocaleUpperCase('fr-FR') || '3B';
}
