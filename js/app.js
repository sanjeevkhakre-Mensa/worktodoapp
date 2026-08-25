/* ============================================================
   WorkFlow — App shell, router, sidebar/topbar wiring, auth boot
   ============================================================ */

const ROUTES = {
  dashboard: { render: renderDashboard, label: "Dashboard", icon: "dashboard" },
  tasks: { render: () => renderTasksPage(), label: "My Tasks", icon: "tasks" },
  today: { render: () => renderTasksPage("today"), label: "Today", icon: "today" },
  upcoming: { render: () => renderTasksPage("upcoming"), label: "Upcoming", icon: "upcoming" },
  calendar: { render: renderCalendarPage, label: "Calendar", icon: "calendar" },
  completed: { render: () => renderTasksPage("completed"), label: "Completed", icon: "completed" },
  projects: { render: renderProjectsPage, label: "Projects", icon: "projects" },
  team: { render: renderTeamPage, label: "Team Tasks", icon: "team" },
  reports: { render: renderReportsPage, label: "Reports", icon: "reports" },
  settings: { render: renderSettingsPage, label: "Settings", icon: "settings" },
};

const NAV_MAIN = ["dashboard", "tasks", "today", "upcoming", "calendar", "completed", "projects", "team", "reports"];
const NAV_MOBILE = ["dashboard", "tasks", "calendar", "team", "reports"];

let currentRoute = "dashboard";
let currentPreset = null;
let pollTimer = null;

function navigate(route, preset) {
  currentRoute = ROUTES[route] ? route : "dashboard";
  currentPreset = preset || null;
  window.location.hash = "#/" + currentRoute;
  closeMobileSidebar();
  renderApp();
  window.scrollTo(0, 0);
}

function rerenderCurrentPage(skipTopScroll) {
  const contentEl = document.getElementById("pageContent");
  if (!contentEl) return;
  const routeDef = ROUTES[currentRoute];
  contentEl.innerHTML = routeDef.render(currentPreset);
  currentPreset = null;
  renderSidebarActive();
  if (!skipTopScroll) window.scrollTo(0, 0);
}

function renderApp() {
  const root = document.getElementById("app");
  root.innerHTML = `
    <div class="app-shell">
      ${sidebarHtml()}
      <div class="main-col">
        ${topbarHtml()}
        <div class="content" id="pageContent"></div>
      </div>
    </div>
    ${mobileBottomNavHtml()}
  `;
  document.getElementById("pageContent").innerHTML = ROUTES[currentRoute].render(currentPreset);
  currentPreset = null;
  renderThemeIcon();
}

function sidebarHtml() {
  const u = getUser(currentUserId());
  const tasks = Store.getTasks();
  const counts = {
    tasks: tasks.filter((t) => computeEffectiveStatus(t) !== "Completed").length,
    today: tasks.filter((t) => t.dueDate === todayYmd()).length,
    upcoming: tasks.filter((t) => t.status !== "Completed" && t.dueDate > todayYmd()).length,
  };

  return `
    <aside class="sidebar" id="sidebar">
      <div class="brand">
        <div class="brand-mark">W</div>
        <div class="brand-text">WorkFlow<small>Task Management</small></div>
      </div>
      <div class="sidebar-scroll">
        <div class="nav-section-label">Workspace</div>
        ${NAV_MAIN.map((key) => navLinkHtml(key, counts)).join("")}
      </div>
      <div class="sidebar-footer">
        <div class="nav-link ${currentRoute === "settings" ? "active" : ""}" onclick="navigate('settings')">${icon("settings")} Settings</div>
        <div class="sidebar-user" onclick="navigate('settings')">
          ${initialsAvatar(u.id)}
          <div class="meta">
            <div class="name">${escapeHtml(u.name)}</div>
            <div class="role">${escapeHtml(u.role)}</div>
          </div>
        </div>
      </div>
    </aside>
  `;
}

function navLinkHtml(key, counts) {
  const r = ROUTES[key];
  const active = currentRoute === key;
  const count = counts[key];
  return `<div class="nav-link ${active ? "active" : ""}" onclick="navigate('${key}')">${icon(r.icon)} ${r.label} ${count ? `<span class="count">${count}</span>` : ""}</div>`;
}

function renderSidebarActive() {
  const sidebar = document.getElementById("sidebar");
  if (!sidebar) return;
  sidebar.outerHTML = sidebarHtml();
  document.querySelectorAll(".mobile-bottom-nav a").forEach((a) => {
    a.classList.toggle("active", a.dataset.route === currentRoute);
  });
}

function topbarHtml() {
  const u = getUser(currentUserId());
  return `
    <div class="topbar">
      <div class="hamburger" onclick="toggleMobileSidebar()">${icon("menu")}</div>
      <div class="topbar-search">
        ${icon("search")}
        <input type="text" placeholder="Search tasks..." onkeydown="if(event.key==='Enter') handleTopSearch(this.value)" />
      </div>
      <div class="topbar-actions">
        <div class="icon-btn" id="themeToggleBtn" onclick="toggleTheme()"><span id="themeToggleIcon"></span></div>
        <div class="icon-btn" data-tooltip="Notifications" onclick="toggleNotifPanel()">${icon("bell")}<span class="dot"></span></div>
        ${initialsAvatar(u.id)}
      </div>
    </div>
  `;
}

function handleTopSearch(val) {
  TasksPageState.search = val;
  TasksPageState.tab = "all";
  navigate("tasks");
}

function mobileBottomNavHtml() {
  return `
    <nav class="mobile-bottom-nav">
      ${NAV_MOBILE.map(
        (key) =>
          `<a data-route="${key}" class="${currentRoute === key ? "active" : ""}" onclick="navigate('${key}')">${icon(ROUTES[key].icon)}<span>${ROUTES[key].label}</span></a>`
      ).join("")}
    </nav>`;
}

function toggleMobileSidebar() {
  document.getElementById("sidebar").classList.toggle("open");
}
function closeMobileSidebar() {
  const sb = document.getElementById("sidebar");
  if (sb) sb.classList.remove("open");
}

function toggleNotifPanel() {
  showToast("You're all caught up — no new notifications.");
}

/* ---------- Auth / login screen ---------- */

async function showLoginScreen(message) {
  if (pollTimer) { clearInterval(pollTimer); pollTimer = null; }
  applyTheme();
  const root = document.getElementById("app");
  root.innerHTML = `
    <div style="min-height:100vh;display:flex;align-items:center;justify-content:center;padding:20px">
      <div class="card" style="width:100%;max-width:380px;box-shadow:var(--shadow-lg)">
        <div class="card-body pad">
          <div style="display:flex;align-items:center;gap:10px;margin-bottom:20px">
            <div class="brand-mark" style="width:36px;height:36px;border-radius:10px;background:linear-gradient(135deg,var(--primary),#6a8dff);display:flex;align-items:center;justify-content:center;color:#fff;font-weight:700;font-size:16px">W</div>
            <div style="font-weight:700;font-size:18px;letter-spacing:-0.01em">WorkFlow</div>
          </div>
          ${message ? `<div style="background:var(--amber-tint);color:var(--amber);font-size:12.5px;font-weight:600;padding:9px 12px;border-radius:8px;margin-bottom:16px">${escapeHtml(message)}</div>` : ""}
          <div id="loginError" style="display:none;background:var(--red-tint);color:var(--red);font-size:12.5px;font-weight:600;padding:9px 12px;border-radius:8px;margin-bottom:16px"></div>
          <p style="font-size:12px;font-weight:600;color:var(--ink-muted);margin-bottom:10px">Who's this?</p>
          <div id="loginUserList" style="display:flex;flex-direction:column;gap:6px;max-height:340px;overflow-y:auto">
            <div style="text-align:center;padding:20px;color:var(--ink-faint);font-size:12.5px">Loading team…</div>
          </div>
        </div>
      </div>
    </div>
  `;

  try {
    const users = await apiGetLoginUsers();
    const listEl = document.getElementById("loginUserList");
    if (!listEl) return; // user already moved past this screen
    listEl.innerHTML = users
      .map(
        (u) => `
      <div class="nav-link" style="border:1px solid var(--border);padding:9px 12px" onclick="handleLoginPick('${u.id}')">
        <div class="avatar sm" style="background:${u.color}">${initials(u.name)}</div>
        <div style="flex:1;min-width:0">
          <div style="font-weight:600;font-size:13.5px;color:var(--ink)">${escapeHtml(u.name)}</div>
          <div style="font-size:11px;color:var(--ink-muted)">${escapeHtml(u.role)}</div>
        </div>
      </div>`
      )
      .join("");
  } catch (e) {
    const listEl = document.getElementById("loginUserList");
    if (listEl) {
      listEl.innerHTML = `<div style="text-align:center;padding:16px;color:var(--red);font-size:12.5px">${escapeHtml(e.message || "Couldn't load the team list")}</div>`;
    }
  }
}

async function handleLoginPick(userId) {
  const errEl = document.getElementById("loginError");
  errEl.style.display = "none";
  try {
    const { token } = await apiLogin(userId);
    setToken(token);
    await boot();
  } catch (e) {
    errEl.textContent = e.message || "Login failed";
    errEl.style.display = "block";
  }
}

/* ---------- Boot / init ---------- */

function initFromHash() {
  const hash = window.location.hash.replace("#/", "");
  if (ROUTES[hash]) currentRoute = hash;
}

async function boot() {
  try {
    await Store.refreshState();
  } catch (e) {
    showLoginScreen();
    return;
  }
  applyTheme();
  initFromHash();
  renderApp();
  startPolling();
}

function startPolling() {
  if (pollTimer) clearInterval(pollTimer);
  pollTimer = setInterval(async () => {
    const busy = document.getElementById("taskModalOverlay") || document.getElementById("drawerOverlay");
    if (busy) return;
    try {
      const before = JSON.stringify(Store.state.tasks) + JSON.stringify(Store.state.users);
      await Store.refreshState();
      const after = JSON.stringify(Store.state.tasks) + JSON.stringify(Store.state.users);
      if (before !== after) rerenderCurrentPage(true);
    } catch (e) {
      /* transient network hiccup — next tick will retry */
    }
  }, 8000);
}

window.addEventListener("DOMContentLoaded", () => {
  if (getToken()) {
    boot();
  } else {
    showLoginScreen();
  }
});

window.addEventListener("hashchange", () => {
  if (!getToken()) return;
  const hash = window.location.hash.replace("#/", "");
  if (ROUTES[hash] && hash !== currentRoute) {
    currentRoute = hash;
    renderApp();
  }
});
