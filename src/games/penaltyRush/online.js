import { authClient, PUBLIC_KEY, SUPABASE_URL } from '../../loyalty/client.js';

const ENDPOINT = SUPABASE_URL + '/functions/v1/penalty-rush';
const ROOM_KEY = '3b_penalty_rush_room_v1';

export async function penaltyRequest(action, body = {}) {
  const { data: { session } } = await authClient.auth.getSession();
  if (!session) {
    throw Object.assign(new Error('Connecte-toi à ton compte 3B pour jouer à Penalty Rush.'), { status: 401 });
  }

  let response;
  try {
    response = await fetch(ENDPOINT, {
      method: 'POST',
      headers: {
        apikey: PUBLIC_KEY,
        Authorization: 'Bearer ' + session.access_token,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ action, ...body }),
      signal: AbortSignal.timeout(16000),
    });
  } catch (error) {
    throw Object.assign(new Error(
      error?.name === 'TimeoutError'
        ? 'Le serveur Penalty Rush met trop de temps à répondre.'
        : 'Connexion au serveur Penalty Rush interrompue.',
    ), { status: 0 });
  }

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw Object.assign(new Error(data.error || 'Action Penalty Rush refusée.'), { status: response.status });
  }
  return data;
}

export function rememberPenaltyRoom(roomId) {
  try {
    if (roomId) localStorage.setItem(ROOM_KEY, roomId);
    else localStorage.removeItem(ROOM_KEY);
  } catch {}
}

export function rememberedPenaltyRoom() {
  try {
    const id = localStorage.getItem(ROOM_KEY);
    return /^[a-f0-9-]{36}$/i.test(id || '') ? id : null;
  } catch {
    return null;
  }
}

export function subscribePenaltyRoom(roomId, onChange, onStatus) {
  if (!/^[a-f0-9-]{36}$/i.test(roomId || '')) return () => {};
  const channel = authClient
    .channel('penalty-rush-' + roomId)
    .on('postgres_changes', {
      event: 'UPDATE',
      schema: 'public',
      table: 'penalty_rooms',
      filter: 'id=eq.' + roomId,
    }, () => onChange?.())
    .subscribe((status) => onStatus?.(status));

  return () => {
    try { authClient.removeChannel(channel); } catch {}
  };
}
