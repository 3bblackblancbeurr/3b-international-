export class InventoryError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}

// Reservations are durable: only Stripe's confirmed expiration releases stock.
// A transport timeout may have created a session, so it must never free stock.
export function createInventory({env, fetcher}) {
  const enforced = /^(sk|rk)_live_/.test(env.STRIPE_SECRET_KEY || '') || env.SHOP_INVENTORY_ENFORCED === 'true';
  async function rpc(name, body) {
    let url;
    try { url = new URL('/rest/v1/rpc/' + name, env.SUPABASE_URL); } catch { throw new InventoryError(503, 'Le stock est temporairement indisponible.'); }
    if (url.protocol !== 'https:' || !env.SUPABASE_SERVICE_ROLE_KEY) throw new InventoryError(503, 'Le stock est temporairement indisponible.');
    const response = await fetcher(url, {method:'POST', signal:AbortSignal.timeout(10000), headers:{
      apikey:env.SUPABASE_SERVICE_ROLE_KEY, Authorization:'Bearer ' + env.SUPABASE_SERVICE_ROLE_KEY, 'Content-Type':'application/json',
    }, body:JSON.stringify(body)});
    if (!response.ok) throw new InventoryError(503, 'Le stock est temporairement indisponible. Ne repaie pas ; réessaie la vérification.');
    return response.json();
  }
  return {
    enforced,
    async reserve(token, livemode, lines) {
      if (!enforced) return;
      const ok = await rpc('shop_reserve_inventory', {p_token:token, p_livemode:livemode, p_items:lines});
      if (ok !== true) throw new InventoryError(409, 'La quantité demandée n’est plus disponible. Actualise ton panier.');
    },
    async commit(session) {
      if (!enforced) return;
      const token = session.metadata?.inventory_token;
      // Legacy Stripe sessions predate reservations; all new enforced checkouts carry a token.
      if (!token) return;
      if (!/^[a-f0-9]{64}$/.test(token || '')) throw new InventoryError(503, 'La réservation de cette commande doit être vérifiée.');
      if (await rpc('shop_commit_inventory', {p_token:token, p_livemode:session.livemode, p_session_id:session.id}) !== true)
        throw new InventoryError(503, 'La réservation de cette commande doit être vérifiée.');
    },
    async release(session) {
      if (!enforced || session.status !== 'expired') return;
      const token = session.metadata?.inventory_token;
      if (!/^[a-f0-9]{64}$/.test(token || '')) return;
      await rpc('shop_release_inventory', {p_token:token, p_livemode:session.livemode});
    },
  };
}
