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

export function passportFromProfile(profile, user = null) {
  if (!profile || typeof profile !== 'object' || !profile.user_id) return null;
  if (user?.id && profile.user_id !== user.id) return null;

  if (!Object.hasOwn(PASSPORT_COUNTRIES, profile.country)) return null;
  const country = profile.country;
  const countryMeta = PASSPORT_COUNTRIES[country];
  const userId = cleanText(profile.user_id, 64);
  const publicId = cleanText(profile.passport_public_id, 36).toLowerCase();
  if (!/^[a-f0-9]{8}-[a-f0-9]{4}-[1-5][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/.test(publicId)) return null;
  const shortPublicId = publicId.replace(/-/g, '').slice(0, 12).toUpperCase();
  const name = cleanText(profile.name || profile.handle || 'Membre 3B', 80);
  const handle = cleanText(profile.handle, 24);

  return Object.freeze({
    userId,
    publicId,
    passportId: `3B-PASS-${shortPublicId.slice(0,4)}-${shortPublicId.slice(4,8)}-${shortPublicId.slice(8,12)}`,
    memberId: `3B-MEM-${shortPublicId.slice(0,4)}-${shortPublicId.slice(4,8)}`,
    state: cleanText(profile.passport_state || 'active', 16),
    version: Math.max(2, Number(profile.passport_version) || 2),
    issuedAt: profile.passport_issued_at || null,
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
