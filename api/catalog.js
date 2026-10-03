import { createShop } from "../server/shop.js";
import { handleSportLive } from "../server/sport-live.js";
import { createCommandIntegrations } from "../server/command-integrations.js";
import { createDigitalStore } from "../server/digital-store.js";

export default {
  fetch: request => {
    const url = new URL(request.url);
    const route = url.searchParams.get("__3b_route");
    if (route === "sport-live") return handleSportLive(request);
    if (route === "command-integrations") return createCommandIntegrations().handle(request);
    if (route === "digital-store-catalog") return createDigitalStore().catalog(request);
    if (route === "digital-store-checkout") return createDigitalStore().checkout(request);
    if (route === "digital-store-status") return createDigitalStore().status(request);
    if (route === "digital-store-spend") return createDigitalStore().spend(request);
    return createShop().catalog(request);
  },
};
