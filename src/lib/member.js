export const STORAGE_MEMBER_KEY = "3b_member_master_clean_v2";
export const STORAGE_OPTIONS_KEY = "3b_options_master_clean_v1";
export const MEMBER_COUNTRIES = ["France", "Italie", "Estonie", "Turquie", "Algérie", "Tunisie", "Maroc", "Espagne"];
export const DEFAULT_OPTIONS = { matrix: true, animations: true, premiumGlow: true, reducedMotion: false };
export const OPTION_LABELS = {
  matrix: "Effet Matrix bleu", animations: "Animations", premiumGlow: "Reflets lumineux", reducedMotion: "Réduire les mouvements",
};

export function createTestMember() {
  return { name: "", email: "", isRegistered: false, status: "Non inscrit", level: "Découverte", points: 0,
    memberId: "", passportId: "", country: "France", originCountry: "France", city: "", createdAt: "" };
}

export function normalizeMember(value) {
  const member = createTestMember();
  if (!value || typeof value !== "object" || Array.isArray(value)) return member;
  for (const key of Object.keys(member)) {
    if (typeof member[key] === "string" && typeof value[key] === "string") member[key] = value[key].slice(0, 254);
  }
  member.originCountry = MEMBER_COUNTRIES.includes(member.originCountry) ? member.originCountry : "France";
  member.country = MEMBER_COUNTRIES.includes(member.country) ? member.country : member.originCountry;
  member.points = Number.isSafeInteger(value.points) && value.points >= 0 ? value.points : 0;
  member.isRegistered = value.isRegistered === true && !!member.memberId && !!member.passportId;
  if (!member.isRegistered) member.status = "Non inscrit";
  return member;
}

export function normalizeOptions(value) {
  return Object.fromEntries(Object.entries(DEFAULT_OPTIONS).map(([key, fallback]) =>
    [key, typeof value?.[key] === "boolean" ? value[key] : fallback]));
}

export function validateMember(member) {
  const name = typeof member?.name === "string" ? member.name.trim() : "";
  const email = typeof member?.email === "string" ? member.email.trim() : "";
  if (name.length < 2 || name.length > 80) return "Indique un nom affiché de 2 à 80 caractères.";
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return "Indique une adresse e-mail valide.";
  if (!MEMBER_COUNTRIES.includes(member.originCountry)) return "Choisis l’un des huit pays 3B.";
  return "";
}

export function createRegisteredMember(value) {
  const error = validateMember(value);
  if (error) throw new Error(error);
  const member = normalizeMember(value);
  if (member.isRegistered) return member;
  const id = crypto.randomUUID().replaceAll("-", "").toUpperCase();
  return { ...member, name: member.name.trim(), email: member.email.trim(), isRegistered: true,
    status: "Membre 3B", level: "Découverte", memberId: `3B-MEM-${id}`, passportId: `3B-PASS-${id}`,
    country: member.originCountry, city: member.city || "Non renseignée", createdAt: new Date().toLocaleDateString("fr-FR") };
}

export function loadJsonStorage(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; }
}

export function saveJsonStorage(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); return true; } catch { return false; }
}
