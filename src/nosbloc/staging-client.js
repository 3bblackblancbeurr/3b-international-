import { authClient, PUBLIC_KEY, SUPABASE_URL } from "../loyalty/client.js";

export const NOSBLOC_STAGING_SYNC_ENABLED = String(import.meta.env.VITE_NOSBLOC_STAGING_SYNC || "").toLowerCase() === "true";
export const NOSBLOC_STAGING_URL = String(import.meta.env.VITE_NOSBLOC_STAGING_URL || `${SUPABASE_URL}/functions/v1/nosbloc-staging`);

export async function nosblocStagingRequest(action, body = {}, expectedUser) {
  if (!NOSBLOC_STAGING_SYNC_ENABLED) {
    const error = new Error("La synchronisation Nosbloc staging est désactivée.");
    error.code = "NOSBLOC_STAGING_DISABLED";
    throw error;
  }
  const { data: { session } } = await authClient.auth.getSession();
  if (!session) throw new Error("Connecte-toi à ton compte 3B.");
  if (expectedUser && session.user.id !== expectedUser) throw new Error("La session a changé. Reconnecte-toi.");
  const response = await fetch(NOSBLOC_STAGING_URL, {
    method: "POST",
    headers: { apikey: PUBLIC_KEY, Authorization: `Bearer ${session.access_token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ action, ...body }),
    signal: AbortSignal.timeout(20000),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || "Nosbloc staging momentanément indisponible.");
  return data;
}
