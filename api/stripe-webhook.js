import { createShop } from "../server/shop.js";
import { notifySellerBySession } from "../server/shop-notification-hooks.js";
import { createDigitalStore } from "../server/digital-store.js";

export default {
  fetch: async request => {
    const shopCopy = request.clone();
    const digitalCopy = request.clone();
    const notificationCopy = request.clone();

    const shopResponse = await createShop().webhook(shopCopy);
    if (!shopResponse.ok) return shopResponse;

    const digitalResponse = await createDigitalStore().webhook(digitalCopy);
    if (!digitalResponse.ok) return digitalResponse;

    try {
      const event = JSON.parse(await notificationCopy.text());
      if (["checkout.session.completed", "checkout.session.async_payment_succeeded"].includes(event?.type)) {
        const sessionId = event?.data?.object?.id;
        if (sessionId && event?.data?.object?.metadata?.integration !== "3b-digital-store-v1") {
          await notifySellerBySession(sessionId);
        }
      }
    } catch { /* Notifications are best-effort; payment recording remains authoritative. */ }

    return Response.json({received:true},{headers:{"Cache-Control":"no-store"}});
  },
};
