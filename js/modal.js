/* ============================================================
   WorkFlow — Add / Edit Task modal
   ============================================================ */

let modalPendingAttachments = [];

function openTaskModal(taskId, presetDate) {
  const editing = !!taskId;
  const task = editing ? Store.getTask(taskId) : null;
  modalPendingAttachments = editing ? (task.attachments || []).slice() : [];

  const t = task || {
    title: "",
    description: "",
    dueDate: presetDate || todayYmd(),
    dueTime: "",
    priority: "Medium",
    status: "Todo",
    project: "p1",
    assignee: currentUserId(),
    reminder: false,
    recurring: "None",
  };

  const overlay = document.createElement("div");
  overlay.className = "overlay";
  overlay.id = "taskModalOverlay";
  overlay.onclick = (e) => { if (e.target === overlay) closeTaskModal(); };

  overlay.innerHTML = `
    <div class="modal" onclick="event.stopPropagation()">
      <div class="modal-header">
        <h3>${editing ? "Edit Task" : "Add Task"}</h3>
        <div class="icon-btn xs" onclick="closeTaskModal()">${icon("x")}</div>
      </div>
      <div class="modal-body">
        <div class="form-field">
          <label>Task Name</label>
          <input type="text" id="f_title" placeholder="e.g. Prepare weekly sales summary" value="${escapeHtml(t.title)}" autofocus />
        </div>
        <div class="form-field">
          <label>Description</label>
          <textarea id="f_description" placeholder="Add more detail (optional)">${escapeHtml(t.description || "")}</textarea>
        </div>
        <div class="form-grid">
          <div class="form-field">
            <label>Due Date</label>
            <input type="date" id="f_dueDate" value="${t.dueDate || ""}" />
          </div>
          <div class="form-field">
            <label>Due Time</label>
            <input type="time" id="f_dueTime" value="${t.dueTime || ""}" />
          </div>
        </div>
        <div class="form-field">
          <label>Priority</label>
          <div class="priority-picker" id="f_priority_picker">
            ${["Low", "Medium", "High", "Urgent"]
              .map(
                (p) =>
                  `<div class="priority-opt sel-${p.toLowerCase()} ${t.priority === p ? "selected" : ""}" data-val="${p}" onclick="selectPriorityOpt('${p}')">${p}</div>`
              )
              .join("")}
          </div>
        </div>
        <div class="form-field">
          <label>Project</label>
          <select id="f_project">
            ${PROJECTS.map((p) => `<option value="${p.id}" ${t.project === p.id ? "selected" : ""}>${escapeHtml(p.name)}</option>`).join("")}
          </select>
        </div>

        <div class="more-options-toggle" id="moreOptionsToggle" onclick="toggleMoreOptions()">
          ${icon("chevronRight")} More Options
        </div>
        <div class="more-options" id="moreOptionsBody">
          <div class="form-grid">
            <div class="form-field">
              <label>Status</label>
              <select id="f_status">
                ${["Todo", "In Progress", "Pending", "Completed"].map((s) => `<option value="${s}" ${t.status === s ? "selected" : ""}>${s}</option>`).join("")}
              </select>
            </div>
            <div class="form-field">
              <label>Assignee</label>
              <select id="f_assignee">
                ${getAllUsers().map((u) => `<option value="${u.id}" ${t.assignee === u.id ? "selected" : ""}>${escapeHtml(u.name)}</option>`).join("")}
              </select>
            </div>
          </div>
          <div class="form-field">
            <label>Recurring</label>
            <select id="f_recurring">
              ${["None", "Daily", "Weekly", "Monthly"].map((r) => `<option value="${r}" ${t.recurring === r ? "selected" : ""}>${r}</option>`).join("")}
            </select>
          </div>
          <div class="form-field">
            <label class="checkbox-row"><input type="checkbox" id="f_reminder" ${t.reminder ? "checked" : ""} /> Set a reminder</label>
          </div>
          <div class="form-field">
            <label>Attachments</label>
            <input type="file" id="f_attachments" multiple onchange="handleAttachmentPick(event)" />
            <div id="attachmentList" style="margin-top:8px">${renderAttachmentChips()}</div>
          </div>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-ghost" onclick="closeTaskModal()">Cancel</button>
        <button class="btn btn-primary" onclick="submitTaskModal(${editing ? `'${taskId}'` : "null"})">${editing ? "Save Changes" : "Add Task"}</button>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);
  document.addEventListener("keydown", modalEscHandler);
  setTimeout(() => document.getElementById("f_title") && document.getElementById("f_title").focus(), 30);
}

function modalEscHandler(e) {
  if (e.key === "Escape") closeTaskModal();
}

function toggleMoreOptions() {
  document.getElementById("moreOptionsToggle").classList.toggle("open");
  document.getElementById("moreOptionsBody").classList.toggle("open");
}

function selectPriorityOpt(val) {
  document.querySelectorAll("#f_priority_picker .priority-opt").forEach((el) => {
    el.classList.toggle("selected", el.dataset.val === val);
  });
}

function getSelectedPriority() {
  const sel = document.querySelector("#f_priority_picker .priority-opt.selected");
  return sel ? sel.dataset.val : "Medium";
}

function handleAttachmentPick(e) {
  const files = Array.from(e.target.files || []);
  files.forEach((f) => modalPendingAttachments.push(f.name));
  document.getElementById("attachmentList").innerHTML = renderAttachmentChips();
}

function removeAttachment(idx) {
  modalPendingAttachments.splice(idx, 1);
  document.getElementById("attachmentList").innerHTML = renderAttachmentChips();
}

function renderAttachmentChips() {
  if (!modalPendingAttachments.length) return "";
  return modalPendingAttachments
    .map(
      (name, i) =>
        `<div class="attach-chip">${icon("file")}<span style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${escapeHtml(name)}</span><div class="icon-btn xs" style="width:20px;height:20px" onclick="removeAttachment(${i})">${icon("x")}</div></div>`
    )
    .join("");
}

function closeTaskModal() {
  const overlay = document.getElementById("taskModalOverlay");
  if (overlay) overlay.remove();
  document.removeEventListener("keydown", modalEscHandler);
}

async function submitTaskModal(taskId) {
  const title = document.getElementById("f_title").value.trim();
  if (!title) {
    showToast("Task name is required", "error");
    document.getElementById("f_title").focus();
    return;
  }

  const patch = {
    title,
    description: document.getElementById("f_description").value.trim(),
    dueDate: document.getElementById("f_dueDate").value,
    dueTime: document.getElementById("f_dueTime").value,
    priority: getSelectedPriority(),
    project: document.getElementById("f_project").value,
    status: document.getElementById("f_status").value,
    assignee: document.getElementById("f_assignee").value,
    recurring: document.getElementById("f_recurring").value,
    reminder: document.getElementById("f_reminder").checked,
    attachments: modalPendingAttachments.slice(),
  };

  const saveBtn = document.querySelector("#taskModalOverlay .modal-footer .btn-primary");
  if (saveBtn) saveBtn.disabled = true;

  try {
    if (taskId) {
      await Store.updateTask(taskId, patch, `Task details updated by ${getUser(currentUserId()).name}`);
      showToast("Task updated", "success");
    } else {
      await Store.addTask(patch);
      showToast("Task added", "success");
    }
    closeTaskModal();
    rerenderCurrentPage();
  } catch (e) {
    showToast(e.message || "Failed to save task", "error");
    if (saveBtn) saveBtn.disabled = false;
  }
}
