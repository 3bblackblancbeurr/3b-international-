import { createPwaQuickKitCommerce } from "../server/pwa-quickkit-commerce.js";
import pwaAuditRoute from "../server/pwa-audit-route.js";

// One function for the two related PWA operations (Hobby limit).
// Each operation preserves its own original method and security checks.
export default {
  fetch: request => {
    const route = new URL(request.url).searchParams.get("__3b_route");
    if (route === "pwa-audit") return pwaAuditRoute.fetch(request);
    return createPwaQuickKitCommerce().status(request);
  }
};
