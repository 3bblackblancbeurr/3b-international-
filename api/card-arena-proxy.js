import { createCardArenaProxy } from "../server/card-arena-proxy.js";
export default { fetch: request => createCardArenaProxy()(request) };
