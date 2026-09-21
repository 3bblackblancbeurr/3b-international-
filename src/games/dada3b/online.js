import { authClient, PUBLIC_KEY, SUPABASE_URL } from '../../loyalty/client.js';

export const DADA3B_URL = SUPABASE_URL + '/functions/v1/dada3b';

export async function dadaRequest(action, body = {}) {
  const { data: { session } } = await authClient.auth.getSession();
  if (!session) throw Error('Connecte-toi à ton compte 3B pour jouer en ligne.');

  const response = await fetch(DADA3B_URL, {
    method: 'POST',
    headers: {
      apikey: PUBLIC_KEY,
      Authorization: 'Bearer ' + session.access_token,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ action, ...body }),
    signal: AbortSignal.timeout(15000),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw Error(data.error || 'Serveur DADA 3B momentanément indisponible.');
  return data;
}

export async function subscribeDadaRoom(roomId, onRoom, onStatus = () => {}) {
  const { data: { session } } = await authClient.auth.getSession();
  if (!session) throw Error('Compte 3B requis pour le temps réel.');

  await authClient.realtime.setAuth(session.access_token);
  let refreshTimer = null;
  let closed = false;

  const refresh = () => {
    clearTimeout(refreshTimer);
    refreshTimer = setTimeout(async () => {
      if (closed) return;
      try {
        const data = await dadaRequest('status', { room: roomId });
        if (!closed) onRoom(data.room, data.serverTime);
      } catch (error) {
        if (!closed) onStatus(error.message || 'Synchronisation interrompue.');
      }
    }, 60);
  };

  const channel = authClient
    .channel('dada:room:' + roomId, { config: { private: true } })
    .on('broadcast', { event: 'INSERT' }, refresh)
    .on('broadcast', { event: 'UPDATE' }, refresh)
    .on('broadcast', { event: 'DELETE' }, refresh)
    .subscribe((status) => {
      onStatus(status === 'SUBSCRIBED' ? 'Temps réel connecté.' : 'Temps réel · ' + status);
    });

  return () => {
    closed = true;
    clearTimeout(refreshTimer);
    authClient.removeChannel(channel);
  };
}
