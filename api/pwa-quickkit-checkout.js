import { createPwaQuickKitCommerce } from "../server/pwa-quickkit-commerce.js";
export default { fetch: request => createPwaQuickKitCommerce().checkout(request) };
