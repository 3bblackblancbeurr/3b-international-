import { createRevenueFunnel } from "../server/revenue-funnel.js";
export default { fetch: request => createRevenueFunnel()(request) };
