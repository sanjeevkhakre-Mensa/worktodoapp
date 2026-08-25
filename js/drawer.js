/* ============================================================
   WorkFlow — Task Detail drawer (slide-over panel)
   ============================================================ */

const DrawerState = { taskId: null, tab: "details" };

function openTaskDrawer(taskId) {
  DrawerState.taskId = taskId;
  DrawerState.tab = "details";
  renderDrawer();
}

function closeTaskDrawer() {
  DrawerState.taskId = null;
  const ov = document.getElementById("drawerOverlay");
  if (ov) ov.remove();
  document.removeEventListener("keydown", drawerEscHandler);
}

function drawerEscHandler(e) {
  if (e.key === "Escape") closeTaskDrawer();
}

function setDrawerTab(tab) {
  DrawerState.tab = tab;
  renderDrawer();
}

function renderDrawer() {
  const task = Store.getTask(DrawerState.taskId);
  let overlay = document.getElementById("drawerOverlay");
  if (!task) {
    if (overlay) overlay.remove();
    return;
  }
  if (!overlay) {
    overlay = document.createElement("div");
    overlay.id = "drawerOverlay";
    overlay.className = "drawer-overlay";
    overlay.onclick = (e) => { if (e.target === overlay) closeTaskDrawer(); };
    document.body.appendChild(overlay);
    document.addEventListener("keydown", drawerEscHandler);
  }

  const eff = computeEffectiveStatus(task);
  const tabs = [
    { id: "details", label: "Details" },
    { id: "checklist", label: `Checklist${task.checklist.length ? " (" + task.checklist.filter((c) => c.done).length + "/" + task.checklist.length + ")" : ""}` },
    { id: "comments", label: `Comments${task.comments.length ? " (" + task.comments.length + ")" : ""}` },
    { id: "activity", label: "Activity" },
  ];

  overlay.innerHTML = `
    <div class="drawer" onclick="event.stopPropagation()">
      <div class="drawer-header">
        <div style="flex:1;min-width:0">
          <div class="task-check ${task.status === "Completed" ? "done" : ""}" style="display:inline-flex;margin-bottom:8px" onclick="handleToggleComplete('${task.id}')">${task.status === "Completed" ? icon("check") : ""}</div>
          <h3 class="${task.status === "Completed" ? "task-title done" : ""}">${escapeHtml(task.title)}</h3>
        </div>
        <div style="display:flex;gap:6px">
          <div class="icon-btn xs" data-tooltip="Edit" onclick="openTaskModal('${task.id}')">${icon("edit")}</div>
          <div class="icon-btn xs" data-tooltip="Delete" onclick="handleDeleteFromDrawer('${task.id}')">${icon("trash")}</div>
          <div class="icon-btn xs" onclick="closeTaskDrawer()">${icon("x")}</div>
        </div>
      </div>
      <div class="drawer-tabs">
        ${tabs.map((tb) => `<div class="drawer-tab ${DrawerState.tab === tb.id ? "active" : ""}" onclick="setDrawerTab('${tb.id}')">${tb.label}</div>`).join("")}
      </div>
      <div class="drawer-body">
        ${DrawerState.tab === "details" ? drawerDetailsTab(task, eff) : ""}
        ${DrawerState.tab === "checklist" ? drawerChecklistTab(task) : ""}
        ${DrawerState.tab === "comments" ? drawerCommentsTab(task) : ""}
        ${DrawerState.tab === "activity" ? drawerActivityTab(task) : ""}
      </div>
    </div>`;
}

function drawerDetailsTab(task, eff) {
  return `
    <div class="drawer-section">
      <div class="lbl">Description</div>
      <div style="font-size:13px;color:${task.description ? "var(--ink)" : "var(--ink-faint)"}">${escapeHtml(task.description) || "No description added."}</div>
    </div>
    <div class="drawer-section">
      <div class="lbl">Due</div>
      <div style="font-size:13px">${fmtDateHuman(task.dueDate)}${task.dueTime ? " · " + fmtTimeRange(task) : ""}</div>
    </div>
    <div class="drawer-section" style="display:flex;gap:24px">
      <div>
        <div class="lbl">Priority</div>
        ${priorityBadge(task.priority)}
      </div>
      <div>
        <div class="lbl">Status</div>
        ${statusBadge(eff)}
      </div>
    </div>
    <div class="drawer-section" style="display:flex;gap:24px">
      <div>
        <div class="lbl">Project</div>
        ${projectChip(task.project)}
      </div>
      <div>
        <div class="lbl">Assignee</div>
        <div style="display:flex;align-items:center;gap:8px;font-size:12.5px;font-weight:600">${initialsAvatar(task.assignee, "sm")} ${escapeHtml(getUser(task.assignee).name)}</div>
      </div>
    </div>
    ${task.recurring && task.recurring !== "None" ? `<div class="drawer-section"><div class="lbl">Recurring</div><div style="font-size:13px;display:flex;align-items:center;gap:6px">${icon("repeat")} ${task.recurring}</div></div>` : ""}
    ${task.reminder ? `<div class="drawer-section"><div class="lbl">Reminder</div><div style="font-size:13px;display:flex;align-items:center;gap:6px">${icon("bell")} Reminder set</div></div>` : ""}
    <div class="drawer-section">
      <div class="lbl">Attachments</div>
      ${
        task.attachments && task.attachments.length
          ? task.attachments.map((name) => `<div class="attach-chip">${icon("paperclip")}<span>${escapeHtml(name)}</span></div>`).join("")
          : `<div style="font-size:12.5px;color:var(--ink-faint)">No attachments</div>`
      }
    </div>
  `;
}

function drawerChecklistTab(task) {
  return `
    <div class="drawer-section">
      ${
        task.checklist.length
          ? task.checklist
              .map(
                (c) => `
          <div class="checklist-item">
            <input type="checkbox" ${c.done ? "checked" : ""} onchange="handleToggleChecklist('${task.id}','${c.id}')" />
            <span class="${c.done ? "done" : ""}">${escapeHtml(c.text)}</span>
          </div>`
              )
              .join("")
          : `<div style="font-size:12.5px;color:var(--ink-faint)">No checklist items yet.</div>`
      }
      <div class="comment-input-row">
        <input type="text" id="newChecklistInput" placeholder="Add a subtask and press Enter" onkeydown="if(event.key==='Enter') handleAddChecklistItem('${task.id}')" />
        <button class="btn btn-secondary btn-sm" onclick="handleAddChecklistItem('${task.id}')">Add</button>
      </div>
    </div>`;
}

function drawerCommentsTab(task) {
  return `
    <div class="drawer-section">
      ${
        task.comments.length
          ? task.comments
              .map(
                (c) => `
          <div class="comment-item">
            <div class="head">${initialsAvatar(c.author, "sm")}<span class="name">${escapeHtml(getUser(c.author).name)}</span><span class="time">${timeAgo(c.date)}</span></div>
            <div class="txt">${escapeHtml(c.text)}</div>
          </div>`
              )
              .join("")
          : `<div style="font-size:12.5px;color:var(--ink-faint)">No comments yet.</div>`
      }
      <div class="comment-input-row">
        <input type="text" id="newCommentInput" placeholder="Write a comment and press Enter" onkeydown="if(event.key==='Enter') handleAddComment('${task.id}')" />
        <button class="btn btn-secondary btn-sm" onclick="handleAddComment('${task.id}')">Send</button>
      </div>
    </div>`;
}

function drawerActivityTab(task) {
  const items = task.activity.slice().reverse();
  return `
    <div class="drawer-section">
      ${items
        .map(
          (a) => `
        <div class="activity-item">
          <span class="t">${timeAgo(a.date)}</span>
          <span>${escapeHtml(a.text)}</span>
        </div>`
        )
        .join("")}
    </div>`;
}

async function handleToggleChecklist(taskId, itemId) {
  try {
    await Store.toggleChecklistItem(taskId, itemId);
    renderDrawer();
    rerenderCurrentPage(true);
  } catch (e) {
    showToast(e.message || "Failed to update checklist", "error");
  }
}

async function handleAddChecklistItem(taskId) {
  const input = document.getElementById("newChecklistInput");
  const val = input.value.trim();
  if (!val) return;
  try {
    await Store.addChecklistItem(taskId, val);
    input.value = "";
    renderDrawer();
  } catch (e) {
    showToast(e.message || "Failed to add checklist item", "error");
  }
}

async function handleAddComment(taskId) {
  const input = document.getElementById("newCommentInput");
  const val = input.value.trim();
  if (!val) return;
  try {
    await Store.addComment(taskId, val);
    input.value = "";
    renderDrawer();
  } catch (e) {
    showToast(e.message || "Failed to add comment", "error");
  }
}

async function handleDeleteFromDrawer(taskId) {
  if (!confirm("Delete this task? This cannot be undone.")) return;
  try {
    await Store.deleteTask(taskId);
    closeTaskDrawer();
    showToast("Task deleted", "success");
    rerenderCurrentPage();
  } catch (e) {
    showToast(e.message || "Failed to delete task", "error");
  }
}
