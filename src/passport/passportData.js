const passportData = {
  stats: {
    connectedCountries: 8,
    globalAccess: "Selon les services 3B disponibles",
  },

  member: {
    name: "Membre 3B",
    email: "",
    status: "Passeport 3B",
    joinDate: "",
    memberId: "3B-MEM-EN-ATTENTE",
    passNumber: "3B-PASS-EN-ATTENTE",
    originCountry: "",
    residenceCountry: "",
    city: "",
    issueDate: "",
  },

  security: [
    { label: "Passeport", value: "ÉTAT SERVEUR" },
    { label: "Identité civile", value: "À VÉRIFIER" },
    { label: "QR de contrôle", value: "TEMPORAIRE · USAGE UNIQUE" },
    { label: "Biométrie", value: "NON STOCKÉE PAR 3B" },
    { label: "Passkey", value: "SELON CONFIGURATION DU COMPTE" },
    { label: "Autorisations", value: "CONTRÔLÉES CÔTÉ SERVEUR" },
  ],

  securityId: "",

  bonus: {
    title: "Héritage 3B",
    effect: "Selon la progression du membre",
    detail:
      "Les avantages de progression sont séparés de l’identité civile et ne constituent jamais une preuve d’identité.",
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
