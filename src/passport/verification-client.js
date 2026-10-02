import { authClient, SUPABASE_URL, PUBLIC_KEY } from '../loyalty/client.js';
import { PassportVerificationError } from './verification-contract.js';

// Never use an on-device member profile or a publishable key as authentication.
export async function passportRequest(service, body, expectedUser, signal) {
  if (!['passport-identity', 'passport-idv', 'passport-recognition'].includes(service)) throw new PassportVerificationError('Service de présentation inconnu.');
  if (typeof navigator !== 'undefined' && navigator.onLine === false) throw new PassportVerificationError('Connexion Internet requise. Reconnecte-toi puis réessaie.');
  const { data: { session }, error } = await authClient.auth.getSession();
  if (error || !session?.access_token || !session?.user?.id || !expectedUser || session.user.id !== expectedUser) {
    throw new PassportVerificationError('Ta session doit être vérifiée. Reconnecte-toi à ton compte 3B.', 401);
  }
  let response;
  try {
    const timeout = AbortSignal.timeout(20000);
    response = await fetch(SUPABASE_URL + '/functions/v1/' + service, {
      method: 'POST',
      headers: { apikey: PUBLIC_KEY, Authorization: 'Bearer ' + session.access_token, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: signal ? AbortSignal.any([signal, timeout]) : timeout,
      cache: 'no-store', referrerPolicy: 'no-referrer',
    });
  } catch (error) {
    if (signal?.aborted) throw error;
    throw new PassportVerificationError('Le service ne répond pas. Vérifie ta connexion puis réessaie.', 503);
  }
  const result = await response.json().catch(() => null);
  const { data: { session: current }, error: sessionError } = await authClient.auth.getSession();
  if (sessionError || current?.user?.id !== expectedUser) throw new PassportVerificationError('La session a changé. Reconnecte-toi à ton compte 3B.', 401);
  if (!response.ok) {
    const fallback = response.status === 401 ? 'Ta session a expiré. Reconnecte-toi.' : response.status >= 500 ? 'Ce service n’est pas disponible actuellement. Réessaie plus tard.' : 'La demande a été refusée par le serveur.';
    throw new PassportVerificationError(typeof result?.error === 'string' ? result.error : fallback, response.status);
  }
  if (!result || typeof result !== 'object' || Array.isArray(result)) throw new PassportVerificationError('Réponse serveur incomplète. Réessaie.', 503);
  return result;
}
