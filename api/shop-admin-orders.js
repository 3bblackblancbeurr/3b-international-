import { createShopOrders } from "../server/shop-orders.js";
import { notifyClientBySession } from "../server/shop-notification-hooks.js";

export default {
  fetch: async request => {
    const copy = request.method === "POST" ? request.clone() : null;
    const response = await createShopOrders().admin(request);
    if (!response.ok || !copy) return response;
    try {
      const body = await copy.json();
      const event = body?.action === "accept" ? "seller_accepted" : body?.action === "ship" ? "shipped" : "";
      if (event && body?.sessionId) await notifyClientBySession(body.sessionId, event);
    } catch { /* Order state is authoritative even when email delivery is unavailable. */ }
    return response;
  },
};
