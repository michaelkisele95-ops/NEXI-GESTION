/**
 * NEXI GESTION — Google Apps Script
 * ------------------------------------------------------------
 * Reçoit les activités envoyées par le site (index.html /
 * dashboard.html) et les ajoute automatiquement dans une feuille
 * Google Sheets partagée entre administrateurs et superviseurs.
 *
 * INSTALLATION (voir aussi le README.md du projet) :
 * 1. Ouvrez ou créez un Google Sheet (ex. "NEXI SUIVI — Journal").
 * 2. Menu Extensions > Apps Script.
 * 3. Supprimez le code d'exemple et collez tout le contenu de ce fichier.
 * 4. Cliquez sur "Déployer" > "Nouveau déploiement".
 *    - Type : "Application web"
 *    - Exécuter en tant que : Moi
 *    - Qui a accès : Tout le monde
 * 5. Déployez, autorisez l'accès, puis copiez l'URL se terminant par /exec.
 * 6. Collez cette URL dans js/config.js -> GOOGLE_SCRIPT_URL.
 * 7. Partagez le Google Sheet (pas le script) avec les administrateurs
 *    et superviseurs qui doivent pouvoir consulter le journal.
 */

const SHEET_NAME = "Journal";

function doPost(e) {
  try {
    const sheet = getOrCreateSheet();
    const data = JSON.parse(e.postData.contents);

    sheet.appendRow([
      new Date(),               // Horodatage de réception
      data.date || "",          // Date de l'activité
      data.user || "",          // Nom de l'ambassadeur / membre
      data.role || "",          // Rôle (ambassadeur / superviseur / admin)
      data.zone || "",          // Zone
      data.type || "",          // Type d'activité
      data.description || "",   // Description
      data.foyers || 0,         // Nombre de foyers concernés
      data.amount || 0,         // Montant / commission en FC
    ]);

    return ContentService.createTextOutput(
      JSON.stringify({ status: "ok" })
    ).setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(
      JSON.stringify({ status: "error", message: String(err) })
    ).setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet() {
  return ContentService.createTextOutput(
    "Le service NEXI SUIVI fonctionne. Utilisez une requête POST pour envoyer une activité."
  );
}

function getOrCreateSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
  }
  if (sheet.getLastRow() === 0) {
    sheet
      .appendRow([
        "Horodatage",
        "Date de l'activité",
        "Membre",
        "Rôle",
        "Zone",
        "Type",
        "Description",
        "Foyers concernés",
        "Montant (FC)",
      ])
      .setFrozenRows(1);
  }
  return sheet;
}
