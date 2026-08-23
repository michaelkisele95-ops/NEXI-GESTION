/* ============================================================
   APP — NEXI SUIVI
   Gère : saisie d'activités, historique filtré selon la hiérarchie,
   vue d'ensemble (admin/superviseur), gestion des accès (admin),
   export CSV et synchronisation optionnelle vers Google Sheet.
   ============================================================ */

const NEXI_ENTRIES_KEY = "nexi_suivi_entries";

const session = nexiRequireSession();
if (session) initDashboard(session);

function initDashboard(session) {
  document.getElementById("user-name").textContent = session.name;
  const roleLabels = { admin: "Administrateur", superviseur: "Superviseur", ambassadeur: "Ambassadeur" };
  document.getElementById("user-role").textContent = roleLabels[session.role] || session.role;

  document.getElementById("logout-btn").addEventListener("click", nexiLogout);

  const isAdmin = session.role === "admin";
  const isSuperviseur = session.role === "superviseur";
  const canSeeApercu = isAdmin || isSuperviseur;

  // ---------------- Bannière de synchronisation ----------------
  const banner = document.getElementById("sync-banner");
  const syncText = document.getElementById("sync-text");
  if (NEXI_CONFIG.GOOGLE_SCRIPT_URL) {
    banner.classList.remove("off");
    banner.classList.add("ok");
    syncText.textContent = "Synchronisation Google Sheet activée — chaque activité enregistrée est envoyée à la feuille partagée.";
  }

  // ---------------- Onglets ----------------
  if (canSeeApercu) document.getElementById("tab-btn-apercu").style.display = "";
  if (isAdmin) document.getElementById("tab-btn-acces").style.display = "";

  document.querySelectorAll(".tab-btn").forEach((btn) => {
    btn.addEventListener("click", function () {
      document.querySelectorAll(".tab-btn").forEach((b) => b.classList.remove("active"));
      document.querySelectorAll(".tab-panel").forEach((p) => p.classList.remove("active"));
      this.classList.add("active");
      document.getElementById("tab-" + this.dataset.tab).classList.add("active");
      if (this.dataset.tab === "apercu") renderApercu();
      if (this.dataset.tab === "acces") renderUsers();
    });
  });

  // ---------------- Listes déroulantes (formulaire activité) ----------------
  const typeSelect = document.getElementById("entry-type");
  const filterType = document.getElementById("filter-type");
  NEXI_CONFIG.ACTIVITY_TYPES.forEach((t) => {
    typeSelect.appendChild(new Option(t, t));
    filterType.appendChild(new Option(t, t));
  });

  document.getElementById("entry-date").value = todayISO();

  // ---------------- Périmètre selon la hiérarchie ----------------
  function getScopeUsernames() {
    const all = nexiGetAllUsers();
    if (isAdmin) return null; // null = pas de restriction
    if (isSuperviseur) {
      const team = all.filter((u) => u.supervisor === session.username).map((u) => u.username);
      return [session.username, ...team];
    }
    return [session.username];
  }

  // Filtre "Membre" visible pour admin et superviseur
  if (isAdmin || isSuperviseur) {
    document.getElementById("filter-user-wrap").style.display = "";
    const filterUser = document.getElementById("filter-user");
    const scope = getScopeUsernames();
    const all = nexiGetAllUsers();
    const visibleUsers = scope ? all.filter((u) => scope.includes(u.username)) : all;
    visibleUsers.forEach((u) => filterUser.appendChild(new Option(u.name, u.username)));

    document.getElementById("history-title").textContent = isAdmin ? "Historique de l'équipe" : "Historique de mon équipe";
    document.getElementById("history-subtitle").textContent = isAdmin
      ? "Activités enregistrées par l'ensemble du réseau NEXI ACADEMY."
      : "Vos activités et celles des ambassadeurs qui vous sont rattachés.";
  }

  // ---------------- Soumission du formulaire d'activité ----------------
  document.getElementById("entry-form").addEventListener("submit", function (e) {
    e.preventDefault();
    const entry = {
      id: "e" + Date.now() + Math.random().toString(16).slice(2, 6),
      username: session.username,
      user: session.name,
      role: session.role,
      zone: session.zone || "",
      type: document.getElementById("entry-type").value,
      foyers: Number(document.getElementById("entry-foyers").value) || 0,
      amount: Number(document.getElementById("entry-amount").value) || 0,
      description: document.getElementById("entry-description").value.trim(),
      date: document.getElementById("entry-date").value,
      createdAt: new Date().toISOString(),
    };
    if (!entry.description) return;

    saveEntry(entry);
    syncEntryToSheet(entry);

    this.reset();
    document.getElementById("entry-date").value = todayISO();
    typeSelect.value = NEXI_CONFIG.ACTIVITY_TYPES[0];

    const note = document.getElementById("save-note");
    note.classList.add("visible");
    setTimeout(() => note.classList.remove("visible"), 2500);

    renderEntries();
    if (canSeeApercu) renderApercu();
  });

  // ---------------- Filtres ----------------
  ["filter-user", "filter-type", "filter-from", "filter-to"].forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.addEventListener("input", renderEntries);
  });

  document.getElementById("export-btn").addEventListener("click", exportCSV);

  renderEntries();
  if (canSeeApercu) renderApercu();
  if (isAdmin) initAccessTab();

  // ==============================================================
  function typeSlug(type) {
    if (type.includes("Recrutement")) return "type-recrutement";
    if (type.includes("Suivi")) return "type-suivi";
    if (type.includes("Test")) return "type-test";
    if (type.includes("Commission")) return "type-commission";
    return "type-autre";
  }

  function renderEntries() {
    const all = getEntries();
    const scope = getScopeUsernames();
    const scoped = scope ? all.filter((en) => scope.includes(en.username)) : all;

    const fUser = (isAdmin || isSuperviseur) ? document.getElementById("filter-user").value : "";
    const fType = document.getElementById("filter-type").value;
    const fFrom = document.getElementById("filter-from").value;
    const fTo = document.getElementById("filter-to").value;

    const filtered = scoped.filter((en) => {
      if (fUser && en.username !== fUser) return false;
      if (fType && en.type !== fType) return false;
      if (fFrom && en.date < fFrom) return false;
      if (fTo && en.date > fTo) return false;
      return true;
    });

    filtered.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));

    let totalFoyers = 0;
    let totalCommission = 0;
    filtered.forEach((en) => {
      totalFoyers += en.foyers || 0;
      totalCommission += en.amount || 0;
    });
    document.getElementById("stat-foyers").textContent = totalFoyers;
    document.getElementById("stat-commission").textContent = formatFC(totalCommission);
    document.getElementById("stat-count").textContent = filtered.length;
    document.getElementById("result-count").textContent = filtered.length + " résultat" + (filtered.length > 1 ? "s" : "");

    const body = document.getElementById("entries-body");
    const emptyState = document.getElementById("empty-state");
    body.innerHTML = "";

    if (filtered.length === 0) {
      emptyState.style.display = "";
    } else {
      emptyState.style.display = "none";
      filtered.forEach((en) => {
        const tr = document.createElement("tr");
        const canDelete = isAdmin || en.username === session.username || (isSuperviseur && (getScopeUsernames() || []).includes(en.username));
        tr.innerHTML = `
          <td>${formatDate(en.date)}</td>
          <td>${escapeHTML(en.user)}</td>
          <td><span class="badge ${typeSlug(en.type)}">${escapeHTML(en.type)}</span></td>
          <td>${escapeHTML(en.description)}</td>
          <td>${en.foyers ? en.foyers : "—"}</td>
          <td>${en.amount ? formatFC(en.amount) : "—"}</td>
          <td>${canDelete ? `<button class="row-delete" data-id="${en.id}">Supprimer</button>` : ""}</td>
        `;
        body.appendChild(tr);
      });

      body.querySelectorAll(".row-delete").forEach((btn) => {
        btn.addEventListener("click", function () {
          deleteEntry(this.dataset.id);
          renderEntries();
          if (canSeeApercu) renderApercu();
        });
      });
    }
  }

  function exportCSV() {
    const all = getEntries();
    const scope = getScopeUsernames();
    const scoped = scope ? all.filter((en) => scope.includes(en.username)) : all;
    const header = ["Date", "Membre", "Zone", "Type", "Description", "Foyers", "Montant (FC)"];
    const rows = scoped.map((en) => [en.date, en.user, en.zone || "", en.type, en.description.replace(/"/g, '""'), en.foyers || 0, en.amount || 0]);
    let csv = header.join(";") + "\n";
    rows.forEach((r) => { csv += r.map((v) => `"${v}"`).join(";") + "\n"; });
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "nexi-suivi-" + todayISO() + ".csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  // ==============================================================
  // VUE D'ENSEMBLE (admin / superviseur)
  // ==============================================================
  function renderApercu() {
    const all = getEntries();
    const scope = getScopeUsernames(); // null pour admin
    const allUsers = nexiGetAllUsers();

    const ambassadeurs = isAdmin
      ? allUsers.filter((u) => u.role === "ambassadeur")
      : allUsers.filter((u) => u.role === "ambassadeur" && u.supervisor === session.username);

    document.getElementById("apercu-title").textContent = isAdmin
      ? "Répartition par ambassadeur — tout le réseau"
      : "Répartition de mon équipe";

    const scopedEntries = scope ? all.filter((en) => scope.includes(en.username)) : all;

    let totalFoyers = 0;
    let totalCommission = 0;
    scopedEntries.forEach((en) => {
      totalFoyers += en.foyers || 0;
      totalCommission += en.amount || 0;
    });

    const weekStart = startOfWeekISO();
    const weekCount = scopedEntries.filter((en) => en.date >= weekStart).length;

    document.getElementById("apercu-stat-ambassadeurs").textContent = ambassadeurs.length;
    document.getElementById("apercu-stat-foyers").textContent = totalFoyers;
    document.getElementById("apercu-stat-commission").textContent = formatFC(totalCommission);
    document.getElementById("apercu-stat-semaine").textContent = weekCount;

    const ranking = ambassadeurs.map((amb) => {
      const own = all.filter((en) => en.username === amb.username);
      const foyers = own.reduce((s, en) => s + (en.foyers || 0), 0);
      const commission = own.reduce((s, en) => s + (en.amount || 0), 0);
      const lastDate = own.reduce((max, en) => (en.date > max ? en.date : max), "");
      return { name: amb.name, zone: amb.zone || "—", foyers, commission, count: own.length, lastDate };
    });
    ranking.sort((a, b) => b.foyers - a.foyers);

    const body = document.getElementById("ranking-body");
    const emptyState = document.getElementById("ranking-empty");
    body.innerHTML = "";

    if (ranking.length === 0) {
      emptyState.style.display = "";
    } else {
      emptyState.style.display = "none";
      ranking.forEach((r, idx) => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
          <td><span class="rank-badge">${idx + 1}</span>${escapeHTML(r.name)}</td>
          <td>${escapeHTML(r.zone)}</td>
          <td>${r.foyers}</td>
          <td>${formatFC(r.commission)}</td>
          <td>${r.count}</td>
          <td>${r.lastDate ? formatDate(r.lastDate) : "—"}</td>
        `;
        body.appendChild(tr);
      });
    }
  }

  // expose pour l'appel depuis le tab switcher
  window.renderApercu = renderApercu;

  // ==============================================================
  // GESTION DES ACCÈS (admin uniquement)
  // ==============================================================
  function initAccessTab() {
    const roleSelect = document.getElementById("new-role");
    const supervisorWrap = document.getElementById("new-supervisor-wrap");
    const supervisorSelect = document.getElementById("new-supervisor");
    const zoneSelect = document.getElementById("new-zone");

    NEXI_CONFIG.ZONES.forEach((z) => zoneSelect.appendChild(new Option(z, z)));

    function refreshSupervisorOptions() {
      supervisorSelect.innerHTML = "";
      supervisorSelect.appendChild(new Option("Aucun", ""));
      nexiGetAllUsers()
        .filter((u) => u.role === "superviseur")
        .forEach((u) => supervisorSelect.appendChild(new Option(u.name, u.username)));
    }
    refreshSupervisorOptions();

    function toggleSupervisorField() {
      supervisorWrap.style.display = roleSelect.value === "ambassadeur" ? "" : "none";
    }
    roleSelect.addEventListener("change", toggleSupervisorField);
    toggleSupervisorField();

    document.getElementById("user-form").addEventListener("submit", function (e) {
      e.preventDefault();
      const newUser = {
        username: document.getElementById("new-username").value.trim(),
        password: document.getElementById("new-password").value,
        name: document.getElementById("new-name").value.trim(),
        role: roleSelect.value,
        supervisor: roleSelect.value === "ambassadeur" ? (supervisorSelect.value || null) : null,
        zone: zoneSelect.value,
      };
      if (!newUser.username || !newUser.password || !newUser.name) return;

      const result = nexiAddUser(newUser);
      if (!result.ok) {
        alert(result.error);
        return;
      }
      this.reset();
      toggleSupervisorField();
      refreshSupervisorOptions();
      const note = document.getElementById("user-save-note");
      note.classList.add("visible");
      setTimeout(() => note.classList.remove("visible"), 2500);
      renderUsers();
    });

    window.nexiRefreshSupervisorOptions = refreshSupervisorOptions;
  }

  function renderUsers() {
    const all = nexiGetAllUsers();
    const removed = nexiGetRemovedUsers();
    const body = document.getElementById("users-body");
    body.innerHTML = "";

    const roleLabelsLocal = { admin: "Administrateur", superviseur: "Superviseur", ambassadeur: "Ambassadeur" };

    all.forEach((u) => {
      const supervisorUser = all.find((s) => s.username === u.supervisor);
      const tr = document.createElement("tr");
      const origin = nexiIsBaseUser(u.username) ? "Compte de base" : "Ajouté";
      tr.innerHTML = `
        <td>${escapeHTML(u.username)}</td>
        <td>${escapeHTML(u.name)}</td>
        <td><span class="badge role-${u.role}">${roleLabelsLocal[u.role] || u.role}</span></td>
        <td>${supervisorUser ? escapeHTML(supervisorUser.name) : "—"}</td>
        <td>${escapeHTML(u.zone || "—")}</td>
        <td>${origin}</td>
        <td>${u.username === session.username ? "" : `<button class="btn-danger" data-username="${escapeHTML(u.username)}">Retirer l'accès</button>`}</td>
      `;
      body.appendChild(tr);
    });

    body.querySelectorAll(".btn-danger").forEach((btn) => {
      btn.addEventListener("click", function () {
        if (!confirm("Retirer l'accès de ce compte ?")) return;
        nexiRemoveUser(this.dataset.username);
        renderUsers();
        if (window.nexiRefreshSupervisorOptions) window.nexiRefreshSupervisorOptions();
      });
    });

    // Comptes de base désactivés (réactivables)
    if (removed.length > 0) {
      const restoreSection = document.createElement("tr");
      restoreSection.innerHTML = `<td colspan="7" style="padding-top:18px; border-top:1px solid rgba(245,241,231,0.15);">
        <strong style="font-size:0.82rem;">Comptes de base désactivés :</strong>
      </td>`;
      body.appendChild(restoreSection);
      removed.forEach((username) => {
        const baseUser = NEXI_CONFIG.USERS.find((u) => u.username === username);
        if (!baseUser) return;
        const tr = document.createElement("tr");
        tr.innerHTML = `
          <td>${escapeHTML(baseUser.username)}</td>
          <td>${escapeHTML(baseUser.name)}</td>
          <td><span class="badge role-${baseUser.role}">${roleLabelsLocal[baseUser.role] || baseUser.role}</span></td>
          <td colspan="2" style="color:var(--texte-doux);">Accès désactivé</td>
          <td></td>
          <td><button class="btn-secondary restore-btn" data-username="${escapeHTML(baseUser.username)}" style="padding:6px 12px; font-size:0.78rem;">Réactiver</button></td>
        `;
        body.appendChild(tr);
      });
      body.querySelectorAll(".restore-btn").forEach((btn) => {
        btn.addEventListener("click", function () {
          nexiRestoreBaseUser(this.dataset.username);
          renderUsers();
          if (window.nexiRefreshSupervisorOptions) window.nexiRefreshSupervisorOptions();
        });
      });
    }
  }

  window.renderUsers = renderUsers;
}

/* ---------------- Stockage local des activités ---------------- */

function getEntries() {
  const raw = localStorage.getItem(NEXI_ENTRIES_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw);
  } catch (e) {
    return [];
  }
}

function saveEntry(entry) {
  const entries = getEntries();
  entries.push(entry);
  localStorage.setItem(NEXI_ENTRIES_KEY, JSON.stringify(entries));
}

function deleteEntry(id) {
  const entries = getEntries().filter((en) => en.id !== id);
  localStorage.setItem(NEXI_ENTRIES_KEY, JSON.stringify(entries));
}

/* ---------------- Synchro Google Sheet ---------------- */

function syncEntryToSheet(entry) {
  if (!NEXI_CONFIG.GOOGLE_SCRIPT_URL) return;
  fetch(NEXI_CONFIG.GOOGLE_SCRIPT_URL, {
    method: "POST",
    mode: "no-cors",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify(entry),
  }).catch(() => {
    // Échec silencieux : l'activité reste enregistrée localement.
  });
}

/* ---------------- Utilitaires ---------------- */

function todayISO() {
  const d = new Date();
  const offset = d.getTimezoneOffset();
  const local = new Date(d.getTime() - offset * 60000);
  return local.toISOString().slice(0, 10);
}

function startOfWeekISO() {
  const d = new Date();
  const day = d.getDay(); // 0 = dimanche
  const diff = day === 0 ? 6 : day - 1; // lundi = début de semaine
  d.setDate(d.getDate() - diff);
  const offset = d.getTimezoneOffset();
  const local = new Date(d.getTime() - offset * 60000);
  return local.toISOString().slice(0, 10);
}

function formatFC(n) {
  return Number(n || 0).toLocaleString("fr-FR") + " FC";
}

function formatDate(iso) {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

function escapeHTML(str) {
  const div = document.createElement("div");
  div.textContent = str == null ? "" : str;
  return div.innerHTML;
}
