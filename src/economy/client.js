import { authClient, PUBLIC_KEY, SUPABASE_URL } from "../loyalty/client.js";

export async function marketRequest(action, body = {}, expectedUser) {
  const { data: { session } } = await authClient.auth.getSession();
  if (!session) throw new Error("Connecte-toi à ton compte 3B.");
  if (expectedUser && session.user.id !== expectedUser) {
    throw new Error("La session a changé. Reconnecte-toi.");
  }

  const response = await fetch(`${SUPABASE_URL}/functions/v1/marketplace-3b`, {
    method: "POST",
    headers: {
      apikey: PUBLIC_KEY,
      Authorization: `Bearer ${session.access_token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ action, ...body }),
    signal: AbortSignal.timeout(18000),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || "Le marché 3B est momentanément indisponible.");
  return data;
}
