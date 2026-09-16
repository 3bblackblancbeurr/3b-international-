import { createShopOrders } from "../server/shop-orders.js";
export default { fetch: request => createShopOrders().mine(request) };
