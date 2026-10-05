// Server-derived status only. No portrait, document, email or subject identifier.
// This does not enrol a user or manufacture a verified-person binding.
export const DESTIN_IDENTITY_ACTIONS = new Set(['start','resume','checkpoint','choose','finish','claim','vote']);
const messages = Object.freeze({
  account_required: 'Connecte-toi à ton compte 3B pour retrouver ton Passeport.',
  email_required: 'Confirme ton adresse e-mail depuis ton compte 3B.',
  passport_required: 'Active ton Passeport 3B. Aucun second Passeport n’est nécessaire.',
  identity_required: 'Ton Passeport est reconnu, mais ton identité civile n’est pas encore vérifiée. Consulte Mon Passeport ; aucune pièce d’identité ne doit être envoyée dans DESTIN.',
  person_binding_required: 'Ton identité est vérifiée, mais le contrôle d’unicité de ton Passeport n’est pas encore disponible. Le parcours reste fermé pour protéger les choix définitifs.',
  unavailable: 'Le contrôle sécurisé du Passeport est momentanément indisponible. Aucun nouveau choix n’a été enregistré.',
  ready: 'Ton Passeport vérifié est relié à 3B DESTIN.'
});
export function normalisePassportAccess(value) {
  const data = value && typeof value === 'object' && !Array.isArray(value) ? value : {};
  const checks = {
    emailConfirmed: data.emailConfirmed === true,
    passportActive: data.passportActive === true,
    identityVerified: data.identityVerified === true,
    personBound: data.personBound === true
  };
  const allowed = data.allowed === true && data.code === 'ready' && Object.values(checks).every(Boolean);
  const candidate = typeof data.code === 'string' && Object.hasOwn(messages,data.code) ? data.code : 'unavailable';
  const code = allowed ? 'ready' : candidate === 'ready' ? 'unavailable' : candidate;
  return {allowed,...checks,code,message:messages[code],next:allowed ? null : 'passport'};
}
export async function getDestinPassportAccess(db,userId) {
  if (typeof userId !== 'string' || !userId) return normalisePassportAccess({code:'account_required'});
  const {data,error} = await db.rpc('passport_destin_access_server_v1',{p_user:userId});
  if (error) throw new Error('Passport identity access service unavailable');
  return normalisePassportAccess(data);
}
