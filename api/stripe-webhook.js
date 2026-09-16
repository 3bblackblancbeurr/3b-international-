import { createShop } from "../server/shop.js";
import { notifySellerBySession } from "../server/shop-notification-hooks.js";

export default {
  fetch: async request => {
    const copy = request.clone();
    const response = await createShop().webhook(request);
    if (!response.ok) return response;
    try {
      const event = JSON.parse(await copy.text());
      if (["checkout.session.completed", "checkout.session.async_payment_succeeded"].includes(event?.type)) {
        const sessionId = event?.data?.object?.id;
        if (sessionId) await notifySellerBySession(sessionId);
      }
    } catch { /* Notification is best-effort; payment recording remains authoritative. */ }
    return response;
  },
};
