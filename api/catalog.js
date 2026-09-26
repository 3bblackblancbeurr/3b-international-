import { createShop } from "../server/shop.js";
import { handleSportLive } from "../server/sport-live.js";
import { createCommandIntegrations } from "../server/command-integrations.js";

export default {
  fetch: request => {
    const url = new URL(request.url);
    const route = url.searchParams.get("__3b_route");
    if (route === "sport-live") return handleSportLive(request);
    if (route === "command-integrations") return createCommandIntegrations().handle(request);
    return createShop().catalog(request);
  },
};
