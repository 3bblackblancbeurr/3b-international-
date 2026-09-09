import { createShop } from "../server/shop.js";
export default { fetch: request => createShop().status(request) };
