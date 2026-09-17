import { authClient, PUBLIC_KEY, SUPABASE_URL } from "../loyalty/client.js";

const CLAIM_ENDPOINT = `${SUPABASE_URL}/functions/v1/secret3b-claim`;

export async function secretClaimRequest({ method = "GET", body, expectedUserId } = {}) {
  const { data: { session }, error: sessionError } = await authClient.auth.getSession();
  if (sessionError) throw new Error("Impossible de vérifier ta connexion 3B.");
  if (!session?.user) {
    const error = new Error("Connecte-toi à ton compte 3B pour réclamer ton lot.");
    error.status = 401;
    throw error;
  }
  if (expectedUserId && session.user.id !== expectedUserId) {
    const error = new Error("La session a changé. Reconnecte-toi avant de continuer.");
    error.status = 401;
    throw error;
  }

  const response = await fetch(CLAIM_ENDPOINT, {
    method,
    headers: {
      apikey: PUBLIC_KEY,
      Authorization: `Bearer ${session.access_token}`,
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
    signal: AbortSignal.timeout(15000),
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(payload.error || "La réclamation est momentanément indisponible.");
    error.status = response.status;
    throw error;
  }
  return payload;
}
