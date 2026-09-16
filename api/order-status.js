import { createShop } from "../server/shop.js";
import { notifySellerBySession } from "../server/shop-notification-hooks.js";

export default {
  fetch: async request => {
    const response = await createShop().status(request);
    if (!response.ok) return response;
    try {
      const data = await response.clone().json();
      const sessionId = new URL(request.url).searchParams.get("session_id");
      if (data?.paid && sessionId) await notifySellerBySession(sessionId);
    } catch { /* The customer confirmation must never fail because an alert provider is unavailable. */ }
    return response;
  },
};
