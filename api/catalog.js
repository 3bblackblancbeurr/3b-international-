import { createShop } from "../server/shop.js";
import { handleSportLive } from "../server/sport-live.js";

export default {
  fetch: request => {
    const url = new URL(request.url);
    if (url.searchParams.get("__3b_route") === "sport-live") return handleSportLive(request);
    return createShop().catalog(request);
  },
};
