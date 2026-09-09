// Local adapter for the exact Web Request handlers deployed by Vercel.
// No payment mock or product fixture is enabled here.
import { createServer } from "node:http";
import { createShop } from "../server/shop.js";
const routes = { "/api/catalog": "catalog", "/api/checkout": "checkout",
  "/api/order-status": "status", "/api/stripe-webhook": "webhook" };
const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url, "http://localhost:3001");
    const name = routes[url.pathname];
    if (!name) { res.writeHead(404); res.end(); return; }
    const request = new Request(url, { method: req.method, headers: req.headers,
      ...(!["GET", "HEAD"].includes(req.method) ? { body: req, duplex: "half" } : {}) });
    const response = await createShop()[name](request);
    res.writeHead(response.status, Object.fromEntries(response.headers));
    res.end(Buffer.from(await response.arrayBuffer()));
  } catch { res.writeHead(500); res.end("Local server error"); }
});
server.listen(3001, "127.0.0.1", () => console.log("3B API listening on http://127.0.0.1:3001"));
