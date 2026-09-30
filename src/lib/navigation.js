export const PAGE_HASHES = {
  intro: "", home: "accueil", passport: "passeport", loyalty: "cartes", member: "membre",
  manga: "manga", world3b: "monde-3b", city3b: "ma-ville", nosbloc: "nosbloc", arena: "arene", games: "jeux", religion: "religion", guide: "guide", community: "communaute",
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
  const requestToken = params.get("passport_request");
  const passportRequest = /^[0-9a-f]{64}$/.test(requestToken || "") ? requestToken : null;
  const scannedCard=params.get('passport_card');
  const cardReference=/^[0-9a-f]{64}$/.test(scannedCard||'')?scannedCard:null;
  const authReturn = params.get("reset") === "1" || params.get("auth") === "confirmed";
  const page = authReturn ? "member"
    : passportRequest || cardReference ? "passport"
    : ["success", "cancel"].includes(checkout) ? "shop"
    : location.hash === "#musique" ? "religion" : Object.entries(PAGE_HASHES).find(([, hash]) => `#${hash}` === location.hash)?.[0] || "intro";

  return { page, search, ...(passportRequest ? { requestToken: passportRequest } : {}),...(cardReference?{cardReference}:{}) };
}

function cleanTransientParams(url) {
  url.searchParams.delete("checkout");
  url.searchParams.delete("session_id");
  url.searchParams.delete("auth");
  url.searchParams.delete("reset");
  url.searchParams.delete("passport_request");
  url.searchParams.delete("passport_card");
  url.searchParams.delete("page");
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
