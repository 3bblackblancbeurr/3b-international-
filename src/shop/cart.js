export const CART_KEY = "3b_shop_cart_v1";
export const PENDING_KEY = "3b_shop_pending_v1";

export function sanitizeCart(value) {
  if (!Array.isArray(value)) return [];
  const rows = new Map();
  let total = 0;
  for (const row of value.slice(0, 20)) {
    if (!row || !/^price_[A-Za-z0-9]+$/.test(row.priceId || "") || !Number.isInteger(row.quantity) || row.quantity < 1) continue;
    const quantity = Math.min(row.quantity, 5 - (rows.get(row.priceId) || 0), 20 - total);
    if (quantity <= 0) continue;
    rows.set(row.priceId, (rows.get(row.priceId) || 0) + quantity);
    total += quantity;
  }
  return [...rows].map(([priceId, quantity]) => ({ priceId, quantity }));
}

export function readStored(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; }
}
export function writeStored(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); return true; } catch { return false; }
}

export function subtractPurchased(cart, purchased) {
  const quantities = new Map(sanitizeCart(purchased).map(row => [row.priceId, row.quantity]));
  return cart.map(row => ({ ...row, quantity: Math.max(0, row.quantity - (quantities.get(row.priceId) || 0)) }))
    .filter(row => row.quantity > 0);
}

export function shopAtLocation() {
  return window.location.hash === "#boutique";
}
