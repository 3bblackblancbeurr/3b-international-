// Legacy presentation fixture only.
// Never use this file as an identity, authentication or wallet source of truth.
// Real passport identity must come from the authenticated member profile.

const passportData = {
  stats: {
    connectedCountries: 8,
    globalAccess: "APPLICATION 3B",
  },

  member: {
    name: "Membre 3B",
    email: "",
    status: "Exemple",
    joinDate: "",
    memberId: "3B-MEM-EXAMPLE",
    passNumber: "3B-PASS-EXAMPLE",
    originCountry: "France",
    residenceCountry: "",
    city: "",
    issueDate: "",
  },

  security: [
    { label: "Passeport numérique", value: "NON CONFIGURÉ" },
    { label: "Clé publique", value: "NON CONFIGURÉE" },
    { label: "Niveau de sécurité", value: "NON ÉVALUÉ" },
    { label: "Biométrie", value: "NON CONFIGURÉE" },
    { label: "Chiffrement", value: "NON CONFIGURÉ" },
    { label: "Intégrité des données", value: "NON ÉVALUÉE" },
  ],

  securityId: "",

  bonus: {
    title: "Patrimoine 3B",
    effect: "Exemple de présentation uniquement",
    detail: "Les bonus réels doivent venir de l'état serveur authentifié.",
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
