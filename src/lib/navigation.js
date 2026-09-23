export const PAGE_HASHES = {
  intro: "", home: "accueil", passport: "passeport", loyalty: "cartes", member: "membre",
  manga: "manga", world3b: "monde-3b", arena: "arene", games: "jeux", religion: "religion", guide: "guide", community: "communaute",
  secret: "secret", sport: "sport", ia: "ia", "ia-textile": "ia-textile", "ia-trio": "mode-3-ia", control: "commande", shop: "boutique",
};

const GAME_PATH = /^\/jeux\/([a-z0-9][a-z0-9-]{1,63})\/?$/;

export function readLocation(location = window.location) {
  const search = location.search || "";
  const gameMatch = GAME_PATH.exec(location.pathname || "");

  if (gameMatch) {
    return { page: "game", gameSlug: gameMatch[1], search };
  }

  const params = new URLSearchParams(search);
  const checkout = params.get("checkout");
  const authReturn = params.get("reset") === "1" || params.get("auth") === "confirmed";
  const page = authReturn ? "member"
    : ["success", "cancel"].includes(checkout) ? "shop"
    : location.hash === "#musique" ? "religion" : Object.entries(PAGE_HASHES).find(([, hash]) => `#${hash}` === location.hash)?.[0] || "intro";

  return { page, search };
}

function cleanTransientParams(url) {
  url.searchParams.delete("checkout");
  url.searchParams.delete("session_id");
  url.searchParams.delete("auth");
  url.searchParams.delete("reset");
}

export function getPageHref(page, location = window.location) {
  const target = Object.hasOwn(PAGE_HASHES, page) ? page : "home";
  const url = new URL(location.href);
  cleanTransientParams(url);
  if (url.pathname.startsWith("/jeux/")) url.pathname = "/";
  url.hash = PAGE_HASHES[target];
  return `${url.pathname}${url.search}${url.hash}`;
}

export function navigateTo(page) {
  const href = getPageHref(page);
  if (new URL(href, window.location.href).href !== window.location.href) {
    window.history.pushState(null, "", href);
  }
}

export function navigateToGame(slug) {
  const normalized = String(slug || "").trim().toLowerCase();
  if (!/^[a-z0-9][a-z0-9-]{1,63}$/.test(normalized)) {
    navigateTo("games");
    return;
  }

  const url = new URL(window.location.href);
  cleanTransientParams(url);
  url.pathname = `/jeux/${normalized}`;
  url.hash = "";
  if (url.href !== window.location.href) {
    window.history.pushState(null, "", `${url.pathname}${url.search}`);
  }
}
