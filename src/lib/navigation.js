export const PAGE_HASHES = {
  intro: "", home: "accueil", passport: "passeport", loyalty: "cartes", member: "membre",
  manga: "manga", world3b: "monde-3b", games: "jeux", music: "musique", community: "communaute",
  secret: "secret", sport: "sport", ia: "ia", "ia-textile": "ia-textile", "ia-trio": "mode-3-ia", shop: "boutique",
};

export function readLocation(location = window.location) {
  const search = location.search || "";
  const params = new URLSearchParams(search);
  const checkout = params.get("checkout");
  const page = ["success", "cancel"].includes(checkout) ? "shop"
    : Object.entries(PAGE_HASHES).find(([, hash]) => `#${hash}` === location.hash)?.[0] || "intro";
  return { page, search };
}

export function navigateTo(page) {
  const target = Object.hasOwn(PAGE_HASHES, page) ? page : "home";
  const url = new URL(window.location.href);
  url.searchParams.delete("checkout");
  url.searchParams.delete("session_id");
  url.hash = PAGE_HASHES[target];
  if (url.href !== window.location.href) window.history.pushState(null, "", `${url.pathname}${url.search}${url.hash}`);
}
