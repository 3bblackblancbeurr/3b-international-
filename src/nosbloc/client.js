import {authClient, PUBLIC_KEY, SUPABASE_URL} from "../loyalty/client.js";

export const NOSBLOC_API_URL = SUPABASE_URL + "/functions/v1/nosbloc-api";

export async function nosblocRequest(action, body = {}, expectedUser) {
  const {data:{session}} = await authClient.auth.getSession();
  if (expectedUser && session?.user?.id !== expectedUser) throw Error("La session a changé. Reconnecte-toi.");
  if (!session) throw Error("Connecte-toi à ton compte 3B.");

  const response = await fetch(NOSBLOC_API_URL, {
    method: "POST",
    headers: {
      apikey: PUBLIC_KEY,
      Authorization: "Bearer " + session.access_token,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({action, ...body}),
    signal: AbortSignal.timeout(15000),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(data.error || "Nosbloc Cloud est momentanément indisponible.");
    error.status = response.status;
    throw error;
  }
  return data;
}

export async function nosblocCloudAvailable(expectedUser) {
  try {
    const result = await nosblocRequest("health", {}, expectedUser);
    return result?.ready === true;
  } catch {
    return false;
  }
}
