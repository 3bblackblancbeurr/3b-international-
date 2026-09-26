const passportData = {
  stats: {
    connectedCountries: 8,
    globalAccess: "Compte 3B requis",
    contractVersion: 2,
  },

  member: {
    name: "",
    email: "",
    status: "Identité chargée depuis le serveur",
    joinDate: "",
    memberId: "",
    passNumber: "",
    originCountry: "",
    residenceCountry: "",
    city: "",
    issueDate: "",
  },

  security: [
    { label: "Identité", value: "SERVEUR 3B" },
    { label: "Identifiant public", value: "OPAQUE" },
    { label: "Compte interne", value: "NON EXPOSÉ" },
    { label: "Autorisations", value: "PAR PORTÉE" },
    { label: "QR", value: "TICKET TEMPORAIRE" },
    { label: "Accès protégé", value: "VALIDATION SERVEUR" },
  ],

  securityId: "",

  bonus: {
    title: "Progression 3B",
    effect: "Les récompenses sont calculées par les systèmes serveur.",
    detail:
      "Aucun bonus d’identité, de pays ou de sécurité n’est inventé côté client.",
  },

  countries: [
    { name: "France", position: { top: "30%", left: "22%" } },
    { name: "Espagne", position: { top: "46%", left: "15%" } },
    { name: "Italie", position: { top: "28%", left: "52%" } },
    { name: "Estonie", position: { top: "14%", left: "64%" } },
    { name: "Turquie", position: { top: "48%", left: "76%" } },
    { name: "Algérie", position: { top: "60%", left: "36%" } },
    { name: "Tunisie", position: { top: "58%", left: "58%" } },
    { name: "Maroc", position: { top: "70%", left: "10%" } },
  ],
};

export default passportData;
