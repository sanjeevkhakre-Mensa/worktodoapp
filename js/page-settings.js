/* ============================================================
   WorkFlow — Settings page
   ============================================================ */

const MemberEditState = { editingId: null, adding: false };
let editingProfileName = false;

function renderSettingsPage() {
  const u = getUser(currentUserId());
  const dark = isDarkActive();

  return `
    <div class="page-header">
      <div>
        <h1>Settings</h1>
        <p class="sub">Manage your profile, team and preferences</p>
      </div>
    </div>

    <div class="stack" style="max-width:560px">
      <div class="card">
        <div class="card-header"><h3>Profile</h3></div>
        <div class="card-body pad" style="display:flex;align-items:center;justify-content:space-between;gap:16px">
          <div style="display:flex;align-items:center;gap:16px;flex:1;min-width:0">
            ${initialsAvatar(u.id, "lg")}
            ${
              editingProfileName
                ? `
              <div style="flex:1;min-width:0;display:flex;gap:8px;align-items:center">
                <input type="text" id="profileNameInput" value="${escapeHtml(u.name)}"
                  style="flex:1;min-width:0;padding:8px 12px;border-radius:8px;border:1px solid var(--primary);background:var(--surface);font-size:14px;outline:none"
                  onkeydown="if(event.key==='Enter'){saveProfileName()} else if(event.key==='Escape'){toggleProfileEdit()}" />
                <button class="btn btn-primary btn-sm" onclick="saveProfileName()">Save</button>
                <button class="btn btn-ghost btn-sm" onclick="toggleProfileEdit()">Cancel</button>
              </div>`
                : `
              <div style="min-width:0">
                <div style="display:flex;align-items:center;gap:6px">
                  <span style="font-weight:700;font-size:15px">${escapeHtml(u.name)}</span>
                  <span class="icon-btn xs" data-tooltip="Change your name" onclick="toggleProfileEdit()">${icon("edit")}</span>
                </div>
                <div style="color:var(--ink-muted);font-size:12.5px">${escapeHtml(u.role)} · @${escapeHtml(u.username || "")}</div>
              </div>`
            }
          </div>
          <button class="btn btn-secondary btn-sm" onclick="handleLogout()">Log out</button>
        </div>
      </div>

      <div class="card">
        <div class="card-header">
          <h3>Team Members</h3>
          <span class="link" onclick="toggleAddMember()">${MemberEditState.adding ? "Cancel" : "+ Add Member"}</span>
        </div>
        <div class="card-body pad">
          ${MemberEditState.adding ? addMemberFormHtml() : ""}
          ${getAllUsers().map(memberEditRowHtml).join("")}
          <div style="font-size:11.5px;color:var(--ink-muted);padding:8px 2px 0">
            There's no password — new members log in by picking their name from the login screen.
          </div>
        </div>
      </div>

      <div class="card">
        <div class="card-header"><h3>Appearance</h3></div>
        <div class="card-body pad" style="display:flex;align-items:center;justify-content:space-between">
          <div>
            <div style="font-weight:600;font-size:13.5px">Dark mode</div>
            <div style="color:var(--ink-muted);font-size:12px">Switch between light and dark theme</div>
          </div>
          <button class="btn btn-secondary btn-sm" onclick="toggleTheme(); rerenderCurrentPage()">${dark ? "Switch to Light" : "Switch to Dark"}</button>
        </div>
      </div>

      <div class="card">
        <div class="card-header"><h3>Data</h3></div>
        <div class="card-body pad" style="display:flex;align-items:center;justify-content:space-between">
          <div>
            <div style="font-weight:600;font-size:13.5px">Reset demo data</div>
            <div style="color:var(--ink-muted);font-size:12px">Restore the original sample tasks for everyone (team members are kept)</div>
          </div>
          <button class="btn btn-danger btn-sm" onclick="handleResetData()">Reset</button>
        </div>
      </div>
    </div>
  `;
}

async function handleResetData() {
  if (!confirm("This will restore the original sample tasks for the whole team and discard current tasks. Continue?")) return;
  try {
    await Store.reset();
    showToast("Demo data has been reset", "success");
    navigate("dashboard");
  } catch (e) {
    showToast(e.message || "Failed to reset data", "error");
  }
}

function handleLogout() {
  clearToken();
  showLoginScreen();
}

function toggleProfileEdit() {
  editingProfileName = !editingProfileName;
  rerenderCurrentPage(true);
  if (editingProfileName) {
    setTimeout(() => {
      const input = document.getElementById("profileNameInput");
      if (input) { input.focus(); input.select(); }
    }, 20);
  }
}

async function saveProfileName() {
  const input = document.getElementById("profileNameInput");
  const val = input.value.trim();
  if (!val) {
    showToast("Name cannot be empty", "error");
    return;
  }
  try {
    await Store.renameUser(currentUserId(), val);
    editingProfileName = false;
    showToast("Your name has been updated", "success");
    renderApp();
  } catch (e) {
    showToast(e.message || "Failed to update your name", "error");
  }
}

function memberEditRowHtml(u) {
  const editing = MemberEditState.editingId === u.id;
  return `
    <div style="display:flex;align-items:center;gap:12px;padding:9px 2px;border-bottom:1px solid var(--border)">
      ${initialsAvatar(u.id, "sm")}
      ${
        editing
          ? `
        <input type="text" id="editNameInput_${u.id}" value="${escapeHtml(u.name)}"
          style="flex:1;min-width:0;padding:7px 10px;border-radius:8px;border:1px solid var(--primary);background:var(--surface);font-size:13px;outline:none"
          onkeydown="if(event.key==='Enter'){saveMemberName('${u.id}')} else if(event.key==='Escape'){cancelMemberEdit()}" />
        <button class="btn btn-primary btn-sm" onclick="saveMemberName('${u.id}')">Save</button>
        <button class="btn btn-ghost btn-sm" onclick="cancelMemberEdit()">Cancel</button>`
          : `
        <div style="flex:1;min-width:0">
          <div style="font-weight:600;font-size:13px">${escapeHtml(u.name)}</div>
          <div style="font-size:11.5px;color:var(--ink-muted)">${escapeHtml(u.role)} · @${escapeHtml(u.username || "")}</div>
        </div>
        <div class="icon-btn xs" data-tooltip="Edit name" onclick="startMemberEdit('${u.id}')">${icon("edit")}</div>
        ${isCustomUser(u.id) ? `<div class="icon-btn xs" data-tooltip="Remove" onclick="handleDeleteMember('${u.id}')">${icon("trash")}</div>` : ""}`
      }
    </div>`;
}

function addMemberFormHtml() {
  return `
    <div style="display:flex;gap:8px;align-items:center;padding:9px 2px;border-bottom:1px solid var(--border)">
      <input type="text" id="newMemberName" placeholder="Full name"
        style="flex:1;min-width:0;padding:7px 10px;border-radius:8px;border:1px solid var(--primary);background:var(--surface);font-size:13px;outline:none" />
      <input type="text" id="newMemberRole" placeholder="Role (optional)"
        style="flex:1;min-width:0;padding:7px 10px;border-radius:8px;border:1px solid var(--border);background:var(--surface-2);font-size:13px;outline:none"
        onkeydown="if(event.key==='Enter'){addNewMember()}" />
      <button class="btn btn-primary btn-sm" onclick="addNewMember()">Add</button>
    </div>`;
}

function toggleAddMember() {
  MemberEditState.adding = !MemberEditState.adding;
  rerenderCurrentPage(true);
  if (MemberEditState.adding) {
    setTimeout(() => {
      const input = document.getElementById("newMemberName");
      if (input) input.focus();
    }, 20);
  }
}

async function addNewMember() {
  const nameInput = document.getElementById("newMemberName");
  const roleInput = document.getElementById("newMemberRole");
  const name = nameInput.value.trim();
  const role = roleInput.value.trim();
  if (!name) {
    showToast("Name is required", "error");
    nameInput.focus();
    return;
  }
  try {
    const result = await Store.addUser(name, role);
    MemberEditState.adding = false;
    showToast(`Added — ${result.user.name} can now log in by picking their name`, "success");
    renderApp();
  } catch (e) {
    showToast(e.message || "Failed to add team member", "error");
  }
}

async function handleDeleteMember(id) {
  const u = getUser(id);
  const assignedCount = Store.getTasks().filter((t) => t.assignee === id).length;
  const warn = assignedCount
    ? ` They are currently assigned to ${assignedCount} task${assignedCount === 1 ? "" : "s"} — those will fall back to showing the default member.`
    : "";
  if (!confirm(`Remove ${u.name} from the team?${warn}`)) return;
  try {
    await Store.removeUser(id);
    showToast("Team member removed", "success");
    renderApp();
  } catch (e) {
    showToast(e.message || "Failed to remove team member", "error");
  }
}

function startMemberEdit(id) {
  MemberEditState.editingId = id;
  rerenderCurrentPage(true);
  setTimeout(() => {
    const input = document.getElementById("editNameInput_" + id);
    if (input) { input.focus(); input.select(); }
  }, 20);
}

function cancelMemberEdit() {
  MemberEditState.editingId = null;
  rerenderCurrentPage(true);
}

async function saveMemberName(id) {
  const input = document.getElementById("editNameInput_" + id);
  const val = input.value.trim();
  if (!val) {
    showToast("Name cannot be empty", "error");
    return;
  }
  try {
    await Store.renameUser(id, val);
    MemberEditState.editingId = null;
    showToast("Team member updated", "success");
    renderApp();
  } catch (e) {
    showToast(e.message || "Failed to update team member", "error");
  }
}
