import { createPwaQuickKitCommerce } from "../server/pwa-quickkit-commerce.js";

export default {
  fetch: request => {
    const commerce = createPwaQuickKitCommerce();
    if (request.method === "GET") return commerce.availability(request);
    if (request.method === "POST") return commerce.checkout(request);
    return Response.json({ error: "Méthode non autorisée." }, {
      status: 405,
      headers: { Allow: "GET, POST", "Cache-Control": "no-store" },
    });
  },
};
