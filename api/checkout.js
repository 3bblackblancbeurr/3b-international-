import { createShop } from "../server/shop.js";
export default { fetch: request => createShop().checkout(request) };
