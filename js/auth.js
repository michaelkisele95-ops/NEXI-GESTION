/* ============================================================
   AUTHENTIFICATION & GESTION DES ACCÈS — NEXI SUIVI
   ------------------------------------------------------------
   La liste de départ des comptes vit dans js/config.js (USERS).
   Pour permettre à l'administrateur d'ajouter ou de retirer des
   accès directement depuis le site (onglet "Gestion des accès"),
   sans toucher au code, deux registres sont conservés dans le
   navigateur :
     - nexi_custom_users   : comptes ajoutés depuis le panneau admin
     - nexi_removed_users  : identifiants de config.js désactivés
   La liste "effective" à un instant T = USERS (config.js) moins
   les identifiants retirés, plus les comptes personnalisés.

   Important : ce registre vit dans le navigateur de la personne
   qui gère les accès. Pour que les accès ajoutés/retirés soient
   visibles sur tous les appareils, il faut soit gérer les comptes
   depuis un seul poste "administration", soit reporter les
   changements dans js/config.js (voir le README).
   ============================================================ */

const NEXI_SESSION_KEY = "nexi_suivi_session";
const NEXI_CUSTOM_USERS_KEY = "nexi_custom_users";
const NEXI_REMOVED_USERS_KEY = "nexi_removed_users";

function nexiGetCustomUsers() {
  try {
    return JSON.parse(localStorage.getItem(NEXI_CUSTOM_USERS_KEY)) || [];
  } catch (e) {
    return [];
  }
}

function nexiGetRemovedUsers() {
  try {
    return JSON.parse(localStorage.getItem(NEXI_REMOVED_USERS_KEY)) || [];
  } catch (e) {
    return [];
  }
}

function nexiSaveCustomUsers(list) {
  localStorage.setItem(NEXI_CUSTOM_USERS_KEY, JSON.stringify(list));
}

function nexiSaveRemovedUsers(list) {
  localStorage.setItem(NEXI_REMOVED_USERS_KEY, JSON.stringify(list));
}

// Liste effective de tous les comptes (base + ajoutés - retirés).
function nexiGetAllUsers() {
  const removed = nexiGetRemovedUsers();
  const base = NEXI_CONFIG.USERS.filter((u) => !removed.includes(u.username));
  const custom = nexiGetCustomUsers();
  return [...base, ...custom];
}

function nexiIsBaseUser(username) {
  return NEXI_CONFIG.USERS.some((u) => u.username === username);
}

// Ajoute un compte personnalisé. Retourne {ok, error}.
function nexiAddUser(user) {
  const all = nexiGetAllUsers();
  if (all.some((u) => u.username.toLowerCase() === user.username.toLowerCase())) {
    return { ok: false, error: "Cet identifiant existe déjà." };
  }
  const custom = nexiGetCustomUsers();
  custom.push(user);
  nexiSaveCustomUsers(custom);
  return { ok: true };
}

// Retire un accès, qu'il soit d'origine (config.js) ou personnalisé.
function nexiRemoveUser(username) {
  if (nexiIsBaseUser(username)) {
    const removed = nexiGetRemovedUsers();
    if (!removed.includes(username)) {
      removed.push(username);
      nexiSaveRemovedUsers(removed);
    }
  } else {
    const custom = nexiGetCustomUsers().filter((u) => u.username !== username);
    nexiSaveCustomUsers(custom);
  }
}

// Réactive un accès d'origine précédemment retiré.
function nexiRestoreBaseUser(username) {
  const removed = nexiGetRemovedUsers().filter((u) => u !== username);
  nexiSaveRemovedUsers(removed);
}

/* ---------------- Connexion / session ---------------- */

function nexiFindUser(username, password) {
  return nexiGetAllUsers().find(
    (u) =>
      u.username.toLowerCase() === String(username).toLowerCase() &&
      u.password === password
  );
}

function nexiLogin(username, password) {
  const user = nexiFindUser(username, password);
  if (!user) return null;
  const session = {
    username: user.username,
    name: user.name,
    role: user.role,
    supervisor: user.supervisor || null,
    zone: user.zone || "",
  };
  localStorage.setItem(NEXI_SESSION_KEY, JSON.stringify(session));
  return session;
}

function nexiGetSession() {
  const raw = localStorage.getItem(NEXI_SESSION_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch (e) {
    return null;
  }
}

function nexiLogout() {
  localStorage.removeItem(NEXI_SESSION_KEY);
  window.location.href = "index.html";
}

function nexiRequireSession() {
  const session = nexiGetSession();
  if (!session) {
    window.location.href = "index.html";
    return null;
  }
  return session;
}
