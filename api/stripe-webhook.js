import { createShop } from "../server/shop.js";
export default { fetch: request => createShop().webhook(request) };
