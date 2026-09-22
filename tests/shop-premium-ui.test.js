import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = path => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("Boutique 3B exposes premium full-screen product presentation", async () => {
  const [jsx, css, landing] = await Promise.all([
    read("src/shop/ShopPage.jsx"),
    read("src/shop/shop.css"),
    read("public/boutique.html"),
  ]);

  assert.match(jsx, /shop-lightbox/);
  assert.match(jsx, /Voir en grand/);
  assert.match(jsx, /Glisse à gauche ou à droite/);
  assert.match(css, /object-fit:\s*contain/);
  assert.match(css, /72svh/);
  assert.match(css, /shop-lightbox-stage/);
  assert.match(landing, /Voir le produit/);
  assert.match(landing, /pull-3b-noir\.webp/);
  assert.match(landing, /pull-3b-blanc\.webp/);
});

test("Public journey keeps Nexus only as the City 3B gateway", async () => {
  const [discover, world, nav, worldCard] = await Promise.all([
    read("public/decouvrir-3b.html"),
    read("public/monde-du-3b.html"),
    read("src/components/AppNavigation.jsx"),
    read("src/components/WorldPortalCard.jsx"),
  ]);

  assert.doesNotMatch(discover, /accès au parcours vers le Nexus/i);
  assert.match(discover, /Nexus sert uniquement de portail vers la cité personnelle/i);
  assert.match(world, /Nexus n’est pas le hub du Monde/i);
  assert.match(nav, /title:\s*"À venir"/);
  assert.match(worldCard, /<small>MONDE<\/small>/);
  assert.doesNotMatch(worldCard, /<small>NEXUS<\/small>/);
});

test("PWA manifest points to a dedicated maskable asset", async () => {
  const manifest = JSON.parse(await read("public/manifest.webmanifest"));
  const maskable = manifest.icons.filter(icon => icon.purpose === "maskable");
  assert.equal(maskable.length, 1);
  assert.equal(maskable[0].src, "/icons/3b-maskable-512.png");
  assert.equal(maskable[0].sizes, "512x512");
});


test("Public sitemap stays valid and includes priority 3B pages", async () => {
  const sitemap = await read("public/sitemap.xml");
  assert.doesNotMatch(sitemap, /\\n/);
  for (const path of ["/decouvrir-3b.html", "/monde-du-3b.html", "/boutique.html", "/install-android.html", "/install-iphone.html"]) {
    assert.ok(sitemap.includes(path), `Missing ${path} in sitemap`);
  }
});


test("Android install page exposes PWA metadata and Samsung instructions", async () => {
  const android = await read("public/install-android.html");
  assert.match(android, /rel="manifest" href="\/manifest\.webmanifest"/);
  assert.match(android, /Samsung Internet/);
  assert.match(android, /Ouvrir 3B maintenant/);
  assert.match(android, /decouvrir-3b\.html/);
});
