/* ============================================================
   CONFIGURATION — NEXI SUIVI
   ============================================================
   1) GOOGLE_SCRIPT_URL : collez ici l'URL de votre Google Apps
      Script (voir apps-script/Code.gs et le README) pour activer
      la synchronisation automatique vers un Google Sheet partagé.

   2) USERS : la liste de départ des comptes. Une fois le site en
      ligne, l'administrateur peut aussi ajouter ou retirer des
      accès directement depuis l'onglet "Gestion des accès" du
      panneau admin, sans toucher au code (voir README, section
      "Deux façons de gérer les accès").

   3) Trois rôles existent, avec des pouvoirs croissants :
      - "ambassadeur" : voit et enregistre uniquement ses propres
        activités.
      - "superviseur"  : voit ses propres activités + celles des
        ambassadeurs qui lui sont rattachés (champ "supervisor").
      - "admin"        : voit tout, gère les accès, exporte tout,
        accède au panneau de vue d'ensemble complet.
   ============================================================ */

const NEXI_CONFIG = {
  GOOGLE_SCRIPT_URL: "https://script.google.com/macros/s/AKfycby1pcgnjR9GumW4snlX4-dZZ8IoGkabxhSoqMxHS1zQaPO8NA8GiPOhuQDcad-rsbnS/exec",

  BRAND: {
    name: "NEXI ACADEMY",
    tagline: "Teach yourself.",
    subtitle: "Suivi des ambassadeurs et des activités terrain",
  },

  // Zones / villes proposées (modifiable librement).
  ZONES: ["Lubumbashi", "Kolwezi", "Likasi", "Kinshasa", "Autre"],

  // Types d'activité proposés dans le formulaire.
  ACTIVITY_TYPES: [
    "Recrutement de foyer",
    "Suivi hebdomadaire",
    "Test envoyé",
    "Commission perçue",
    "Autre activité terrain",
  ],

  USERS: [
    {
      username: "michaelkisele95@gmail.com",
      password: "NexiAdmin2026!",
      name: "Michael Kisele",
      role: "admin",
      supervisor: null,
      zone: "Direction",
    },
    {
      username: "junior",
      password: "nexiSuperviseur26",
      name: "Junior KISIMBA",
      role: "superviseur",
      supervisor: null,
      zone: "Lubumbashi",
    },
    {
      username: "anas",
      password: "nexiAmbassadeur1",
      name: "Anas Kayembe",
      role: "ambassadeur",
      supervisor: "coordinateur",
      zone: "Lubumbashi",
    },
    {
      username: "beniciel",
      password: "nexiAmbassadeur2",
      name: "Beniciel Kalubi",
      role: "ambassadeur",
      supervisor: "coordinateur",
      zone: "Lubumbashi",
    },
    {
      username: "fleur",
      password: "nexiAmbassadeur3",
      name: "Fleurville BUKASA",
      role: "ambassadeur",
      supervisor: "coordinateur",
      zone: "Lubumbashi",
      },
    {
      username: "clem",
      password: "nexiAmbassadeur4",
      name: "Clémence KAZADI",
      role: "ambassadeur",
      supervisor: "coordinateur",
      zone: "Lubumbashi",
     },
    {
      username: "romain",
      password: "nexiAmbassadeur5",
      name: "Romain MWENYI",
      role: "ambassadeur",
      supervisor: "coordinateur",
      zone: "Lubumbashi",
     },
    {
      username: "kevin",
      password: "nexiAmbassadeur6",
      name: "Kevin NTUMBA",
      role: "ambassadeur",
      supervisor: "coordinateur",
      zone: "Lubumbashi",
     },
     {
      username: "ilda",
      password: "nexiAmbassadeur7",
      name: "Ilda NUMBI",
      role: "ambassadeur",
      supervisor: "coordinateur",
      zone: "Lubumbashi",
    },
    {
      username: "ruphin",
      password: "nexiAmbassadeur8",
      name: "Ruphin KASONGO",
      role: "ambassadeur",
      supervisor: "coordinateur",
      zone: "Lubumbashi",
    },
    {
      username: "jean-marc",
      password: "nexiAmbassadeur9",
      name: "Jean-marc MWAMBA",
      role: "ambassadeur",
      supervisor: "coordinateur",
      zone: "Lubumbashi",
    },
    {
      username: "neige",
      password: "nexiAmbassadeur10",
      name: "Neige NGUNDA",
      role: "ambassadeur",
      supervisor: "coordinateur",
      zone: "Lubumbashi",
    },
    },
  ],
};
