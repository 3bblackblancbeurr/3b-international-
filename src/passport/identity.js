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
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function publicPassportNumber(publicId) {
  const value = cleanText(publicId, 64).toLowerCase();
  if (!UUID.test(value)) return '3B-PASS-PENDING';
  return '3B-PASS-' + value.replaceAll('-', '').slice(0, 16).toUpperCase();
}

export function publicMemberNumber(publicId) {
  const value = cleanText(publicId, 64).toLowerCase();
  if (!UUID.test(value)) return '3B-MEM-PENDING';
  return '3B-MEM-' + value.replaceAll('-', '').slice(0, 12).toUpperCase();
}

export function passportFromProfile(profile, user = null) {
  if (!profile || typeof profile !== 'object' || !profile.user_id) return null;
  if (user?.id && profile.user_id !== user.id) return null;
  if (!Object.hasOwn(PASSPORT_COUNTRIES, profile.country)) return null;

  const country = profile.country;
  const countryMeta = PASSPORT_COUNTRIES[country];
  const userId = cleanText(profile.user_id, 64);
  const publicId = UUID.test(cleanText(profile.passport_public_id, 64))
    ? cleanText(profile.passport_public_id, 64).toLowerCase()
    : null;
  const name = cleanText(profile.name || profile.handle || 'Membre 3B', 80);
  const handle = cleanText(profile.handle, 24);
  const passportState = ['active','suspended','revoked'].includes(profile.passport_state)
    ? profile.passport_state
    : 'active';
  const passportVersion = Math.max(2, Math.min(20, Number(profile.passport_version) || 2));

  return Object.freeze({
    userId,
    passportPublicId: publicId,
    passportId: publicPassportNumber(publicId),
    memberId: publicMemberNumber(publicId),
    passportState,
    passportVersion,
    passportIssuedAt: profile.passport_issued_at || profile.created_at || null,
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
