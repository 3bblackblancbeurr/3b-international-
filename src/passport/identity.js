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

  const country = Object.hasOwn(PASSPORT_COUNTRIES, profile.country) ? profile.country : 'France';
  const countryMeta = PASSPORT_COUNTRIES[country];
  const userId = cleanText(profile.user_id, 64);
  const compactId = userId.replace(/-/g, '').toUpperCase();
  const name = cleanText(profile.name || profile.handle || 'Membre 3B', 80);
  const handle = cleanText(profile.handle, 24);

  return Object.freeze({
    userId,
    passportId: `3B-PASS-${compactId}`,
    memberId: `3B-MEM-${compactId}`,
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
  });
}

export function passportInitials(identity) {
  const words = cleanText(identity?.name, 80).split(/\s+/).filter(Boolean);
  if (!words.length) return '3B';
  return words.slice(0, 2).map(word => word[0]?.toLocaleUpperCase('fr-FR') || '').join('') || '3B';
}
