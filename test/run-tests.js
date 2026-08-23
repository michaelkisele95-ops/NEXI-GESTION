const { chromium } = require("playwright");

const BASE = "http://localhost:8134";
let failures = [];

function check(cond, msg) {
  if (!cond) {
    failures.push(msg);
    console.log("❌ " + msg);
  } else {
    console.log("✅ " + msg);
  }
}

async function login(page, username, password) {
  await page.goto(BASE + "/index.html");
  await page.fill("#username", username);
  await page.fill("#password", password);
  await page.click("button[type=submit]");
  await page.waitForURL("**/dashboard.html", { timeout: 5000 }).catch(() => {});
}

(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext();

  // ================= TEST 1 : login incorrect =================
  {
    const page = await context.newPage();
    await page.goto(BASE + "/index.html");
    await page.fill("#username", "inconnu");
    await page.fill("#password", "faux");
    await page.click("button[type=submit]");
    await page.waitForTimeout(300);
    const errVisible = await page.isVisible("#error-box.visible");
    check(errVisible, "Login incorrect affiche un message d'erreur");
    await page.close();
  }

  // ================= TEST 2 : login ambassadeur =================
  {
    const page = await context.newPage();
    page.on("pageerror", (err) => failures.push("JS error (ambassadeur): " + err.message));
    page.on("console", (msg) => { if (msg.type() === "error") failures.push("Console error (ambassadeur): " + msg.text()); });

    await login(page, "anas", "nexiAmbassadeur1");
    check(page.url().includes("dashboard.html"), "Ambassadeur : connexion réussie, redirection vers dashboard");

    const apercuVisible = await page.isVisible("#tab-btn-apercu");
    check(!apercuVisible, "Ambassadeur : onglet 'Vue d'ensemble' caché");
    const accesVisible = await page.isVisible("#tab-btn-acces");
    check(!accesVisible, "Ambassadeur : onglet 'Gestion des accès' caché");

    // Remplir et soumettre le formulaire d'activité
    await page.selectOption("#entry-type", "Recrutement de foyer");
    await page.fill("#entry-foyers", "3");
    await page.fill("#entry-amount", "15000");
    await page.fill("#entry-description", "Test automatisé : recrutement de 3 foyers au quartier Golf.");
    await page.click("#entry-form button[type=submit]");
    await page.waitForTimeout(300);

    const rowCount = await page.locator("#entries-body tr").count();
    check(rowCount >= 1, "Ambassadeur : l'activité soumise apparaît dans l'historique");

    const statFoyers = await page.textContent("#stat-foyers");
    check(statFoyers.trim() === "3", "Ambassadeur : le total 'Foyers recrutés' reflète la saisie (obtenu: " + statFoyers + ")");

    // Filtre "Membre" doit être absent pour un ambassadeur
    const filterUserVisible = await page.isVisible("#filter-user-wrap");
    check(!filterUserVisible, "Ambassadeur : filtre 'Membre' caché (pas de vue multi-utilisateurs)");

    // se déconnecter pour laisser la session propre au test suivant
    await page.click("#logout-btn");
    await page.waitForTimeout(200);
    await page.close();
  }

  // ================= TEST 3 : login superviseur =================
  {
    const page = await context.newPage();
    page.on("pageerror", (err) => failures.push("JS error (superviseur): " + err.message));

    await login(page, "coordinateur", "nexiSuperviseur26");
    check(page.url().includes("dashboard.html"), "Superviseur : connexion réussie");

    const apercuVisible = await page.isVisible("#tab-btn-apercu");
    check(apercuVisible, "Superviseur : onglet 'Vue d'ensemble' visible");
    const accesVisible = await page.isVisible("#tab-btn-acces");
    check(!accesVisible, "Superviseur : onglet 'Gestion des accès' caché");

    await page.click("[data-tab=apercu]");
    await page.waitForTimeout(200);
    const rankingRows = await page.locator("#ranking-body tr").count();
    check(rankingRows >= 1, "Superviseur : la répartition de l'équipe affiche au moins un ambassadeur (obtenu: " + rankingRows + " lignes)");

    // Le superviseur doit voir l'activité qu'Anas vient d'ajouter (Anas est sous coordinateur)
    await page.click("[data-tab=activite]");
    await page.waitForTimeout(200);
    const historyRows = await page.locator("#entries-body tr").count();
    check(historyRows >= 1, "Superviseur : voit l'historique de son équipe (obtenu: " + historyRows + " lignes)");

    await page.click("#logout-btn");
    await page.waitForTimeout(200);
    await page.close();
  }

  // ================= TEST 4 : login admin + gestion des accès =================
  {
    const page = await context.newPage();
    page.on("pageerror", (err) => failures.push("JS error (admin): " + err.message));

    await login(page, "michaelkisele95@gmail.com", "NexiAdmin2026!");
    check(page.url().includes("dashboard.html"), "Admin : connexion réussie");

    const apercuVisible = await page.isVisible("#tab-btn-apercu");
    const accesVisible = await page.isVisible("#tab-btn-acces");
    check(apercuVisible, "Admin : onglet 'Vue d'ensemble' visible");
    check(accesVisible, "Admin : onglet 'Gestion des accès' visible");

    // Vue d'ensemble doit inclure tous les ambassadeurs (anas, beniciel, clemence)
    await page.click("[data-tab=apercu]");
    await page.waitForTimeout(200);
    const rankingRows = await page.locator("#ranking-body tr").count();
    check(rankingRows === 3, "Admin : voit les 3 ambassadeurs dans la répartition (obtenu: " + rankingRows + ")");

    // Gestion des accès : ajouter un compte
    await page.click("[data-tab=acces]");
    await page.waitForTimeout(200);
    const usersRowsBefore = await page.locator("#users-body tr").count();

    await page.fill("#new-username", "test_playwright");
    await page.fill("#new-password", "motdepasse123");
    await page.fill("#new-name", "Compte Test Playwright");
    await page.selectOption("#new-role", "ambassadeur");
    await page.selectOption("#new-supervisor", "coordinateur");
    await page.selectOption("#new-zone", "Kolwezi");
    await page.click("#user-form button[type=submit]");
    await page.waitForTimeout(300);

    const usersRowsAfter = await page.locator("#users-body tr").count();
    check(usersRowsAfter > usersRowsBefore, "Admin : le nouveau compte apparaît dans la liste après ajout");

    const bodyText = await page.textContent("#users-body");
    check(bodyText.includes("test_playwright"), "Admin : l'identifiant du nouveau compte est bien affiché");
    check(bodyText.includes("Ajouté"), "Admin : le nouveau compte est marqué comme 'Ajouté' (pas 'Compte de base')");

    // Tenter d'ajouter un doublon → doit être refusé
    page.once("dialog", async (dialog) => {
      check(dialog.message().includes("existe déjà"), "Admin : message d'erreur clair sur identifiant en doublon");
      await dialog.accept();
    });
    await page.fill("#new-username", "test_playwright");
    await page.fill("#new-password", "autre");
    await page.fill("#new-name", "Doublon");
    await page.click("#user-form button[type=submit]");
    await page.waitForTimeout(300);

    await page.click("#logout-btn");
    await page.waitForTimeout(200);
    await page.close();
  }

  // ================= TEST 5 : nouveau compte peut se connecter =================
  {
    const page = await context.newPage();
    page.on("pageerror", (err) => failures.push("JS error (nouveau compte): " + err.message));
    await login(page, "test_playwright", "motdepasse123");
    check(page.url().includes("dashboard.html"), "Nouveau compte ajouté par l'admin peut se connecter (persistance localStorage)");
    await page.click("#logout-btn");
    await page.waitForTimeout(200);
    await page.close();
  }

  // ================= TEST 6 : retirer un accès =================
  {
    const page = await context.newPage();
    await login(page, "michaelkisele95@gmail.com", "NexiAdmin2026!");
    await page.click("[data-tab=acces]");
    await page.waitForTimeout(200);

    page.on("dialog", (dialog) => dialog.accept());
    const removeBtn = page.locator('.btn-danger[data-username="test_playwright"]');
    await removeBtn.click();
    await page.waitForTimeout(300);
    const bodyText = await page.textContent("#users-body");
    check(!bodyText.includes("test_playwright"), "Admin : le compte retiré n'apparaît plus dans la liste active");
    await page.click("#logout-btn");
    await page.waitForTimeout(200);
    await page.close();
  }

  // ================= TEST 7 : accès retiré ne peut plus se connecter =================
  {
    const page = await context.newPage();
    await page.goto(BASE + "/index.html");
    await page.fill("#username", "test_playwright");
    await page.fill("#password", "motdepasse123");
    await page.click("button[type=submit]");
    await page.waitForTimeout(400);
    const errVisible = await page.isVisible("#error-box.visible");
    check(errVisible, "Compte retiré : connexion refusée après suppression de l'accès");
    await page.close();
  }

  // ================= TEST 8 : retrait puis réactivation d'un compte de base =================
  {
    const page = await context.newPage();
    await login(page, "michaelkisele95@gmail.com", "NexiAdmin2026!");
    await page.click("[data-tab=acces]");
    await page.waitForTimeout(200);
    page.on("dialog", (dialog) => dialog.accept());
    const removeBtn = page.locator('.btn-danger[data-username="clemence"]');
    await removeBtn.click();
    await page.waitForTimeout(300);
    let bodyText = await page.textContent("#users-body");
    check(bodyText.includes("désactivés") && bodyText.includes("clemence"), "Admin : compte de base retiré apparaît dans 'Comptes désactivés'");

    const restoreBtn = page.locator('.restore-btn[data-username="clemence"]');
    await restoreBtn.click();
    await page.waitForTimeout(300);
    bodyText = await page.textContent("#users-body");
    const clemenceActive = await page.locator('.btn-danger[data-username="clemence"]').count();
    check(clemenceActive === 1, "Admin : compte de base réactivé redevient actif");
    await page.close();
  }

  // ================= TEST 9 : responsive mobile =================
  {
    const mobileContext = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const page = await mobileContext.newPage();
    page.on("pageerror", (err) => failures.push("JS error (mobile): " + err.message));
    await login(page, "anas", "nexiAmbassadeur1");
    await page.waitForTimeout(200);
    const headerVisible = await page.isVisible(".app-header");
    check(headerVisible, "Mobile (390px) : l'en-tête s'affiche sans erreur JS");
    await page.close();
    await mobileContext.close();
  }

  await context.close();
  await browser.close();

  console.log("\n============================");
  console.log(failures.length === 0 ? "✅ TOUS LES TESTS SONT PASSÉS" : `❌ ${failures.length} ÉCHEC(S)`);
  if (failures.length > 0) {
    console.log(failures.join("\n"));
    process.exit(1);
  }
})();
