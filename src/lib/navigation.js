export const PAGE_HASHES = {
  intro: "", home: "accueil", passport: "passeport", loyalty: "cartes", member: "membre",
  manga: "manga", world3b: "monde-3b", arena: "arene", games: "jeux", religion: "religion", guide: "guide", community: "communaute",
  secret: "secret", sport: "sport", ia: "ia", "ia-textile": "ia-textile", "ia-trio": "mode-3-ia",
  notifications: "notifications", owner: "centre-3b", control: "commande", shop: "boutique",
};

export function readLocation(location = window.location) {
  const search = location.search || "";
  const params = new URLSearchParams(search);
  const checkout = params.get("checkout");
  const authReturn = params.get("reset") === "1" || params.get("auth") === "confirmed";
  const page = authReturn ? "member"
    : ["success", "cancel"].includes(checkout) ? "shop"
    : location.hash === "#musique" ? "religion" : Object.entries(PAGE_HASHES).find(([, hash]) => `#${hash}` === location.hash)?.[0] || "intro";
  return { page, search };
}

export function navigateTo(page) {
  const target = Object.hasOwn(PAGE_HASHES, page) ? page : "home";
  const url = new URL(window.location.href);
  url.searchParams.delete("checkout");
  url.searchParams.delete("session_id");
  url.searchParams.delete("auth");
  url.searchParams.delete("reset");
  url.hash = PAGE_HASHES[target];
  if (url.href !== window.location.href) window.history.pushState(null, "", `${url.pathname}${url.search}${url.hash}`);
}
