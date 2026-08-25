/* ============================================================
   WorkFlow — My Tasks page (table, filters, search, sort)
   ============================================================ */

const TasksPageState = {
  tab: "all", // all | today | upcoming | overdue | completed
  search: "",
  priority: "all",
  project: "all",
  assignee: "all",
  sort: "dueDate-asc",
};

function renderTasksPage(presetTab) {
  if (presetTab) TasksPageState.tab = presetTab;

  const tasks = Store.getTasks();
  const today = todayYmd();

  let list = tasks.slice();

  switch (TasksPageState.tab) {
    case "today":
      list = list.filter((t) => t.dueDate === today);
      break;
    case "upcoming":
      list = list.filter((t) => t.status !== "Completed" && t.dueDate > today);
      break;
    case "overdue":
      list = list.filter((t) => computeEffectiveStatus(t) === "Overdue");
      break;
    case "completed":
      list = list.filter((t) => t.status === "Completed");
      break;
    default:
      break;
  }

  if (TasksPageState.search.trim()) {
    const q = TasksPageState.search.trim().toLowerCase();
    list = list.filter((t) => t.title.toLowerCase().includes(q) || (t.description || "").toLowerCase().includes(q));
  }
  if (TasksPageState.priority !== "all") list = list.filter((t) => t.priority === TasksPageState.priority);
  if (TasksPageState.project !== "all") list = list.filter((t) => t.project === TasksPageState.project);
  if (TasksPageState.assignee !== "all") list = list.filter((t) => t.assignee === TasksPageState.assignee);

  list.sort((a, b) => {
    switch (TasksPageState.sort) {
      case "dueDate-asc": return (a.dueDate || "9999").localeCompare(b.dueDate || "9999");
      case "dueDate-desc": return (b.dueDate || "0000").localeCompare(a.dueDate || "0000");
      case "priority": {
        const order = { Urgent: 0, High: 1, Medium: 2, Low: 3 };
        return order[a.priority] - order[b.priority];
      }
      case "title": return a.title.localeCompare(b.title);
      default: return 0;
    }
  });

  const titleMap = { all: "My Tasks", today: "Today", upcoming: "Upcoming", overdue: "Overdue", completed: "Completed" };

  return `
    <div class="page-header">
      <div>
        <h1>${titleMap[TasksPageState.tab]}</h1>
        <p class="sub">${list.length} task${list.length === 1 ? "" : "s"}</p>
      </div>
      <div class="page-header-actions">
        <button class="btn btn-primary" onclick="openTaskModal()">${icon("plus")} Add Task</button>
      </div>
    </div>

    <div class="pill-tabs" style="margin-bottom:16px;width:fit-content">
      ${["all", "today", "upcoming", "overdue", "completed"]
        .map(
          (tab) =>
            `<div class="pill-tab ${TasksPageState.tab === tab ? "active" : ""}" onclick="setTasksTab('${tab}')">${titleMap[tab]}</div>`
        )
        .join("")}
    </div>

    <div class="toolbar">
      <div class="search-box">
        ${icon("search")}
        <input type="text" placeholder="Search tasks..." value="${escapeHtml(TasksPageState.search)}" oninput="setTasksSearch(this.value)" />
      </div>
      <div class="select-box">
        <select onchange="setTasksFilter('priority', this.value)">
          <option value="all" ${TasksPageState.priority === "all" ? "selected" : ""}>All Priority</option>
          <option value="Urgent" ${TasksPageState.priority === "Urgent" ? "selected" : ""}>Urgent</option>
          <option value="High" ${TasksPageState.priority === "High" ? "selected" : ""}>High</option>
          <option value="Medium" ${TasksPageState.priority === "Medium" ? "selected" : ""}>Medium</option>
          <option value="Low" ${TasksPageState.priority === "Low" ? "selected" : ""}>Low</option>
        </select>
      </div>
      <div class="select-box">
        <select onchange="setTasksFilter('project', this.value)">
          <option value="all" ${TasksPageState.project === "all" ? "selected" : ""}>All Projects</option>
          ${PROJECTS.map((p) => `<option value="${p.id}" ${TasksPageState.project === p.id ? "selected" : ""}>${escapeHtml(p.name)}</option>`).join("")}
        </select>
      </div>
      <div class="select-box">
        <select onchange="setTasksFilter('assignee', this.value)">
          <option value="all" ${TasksPageState.assignee === "all" ? "selected" : ""}>All Assignees</option>
          ${getAllUsers().map((u) => `<option value="${u.id}" ${TasksPageState.assignee === u.id ? "selected" : ""}>${escapeHtml(u.name)}</option>`).join("")}
        </select>
      </div>
      <div class="select-box" style="margin-left:auto">
        <select onchange="setTasksFilter('sort', this.value)">
          <option value="dueDate-asc" ${TasksPageState.sort === "dueDate-asc" ? "selected" : ""}>Due date ↑</option>
          <option value="dueDate-desc" ${TasksPageState.sort === "dueDate-desc" ? "selected" : ""}>Due date ↓</option>
          <option value="priority" ${TasksPageState.sort === "priority" ? "selected" : ""}>Priority</option>
          <option value="title" ${TasksPageState.sort === "title" ? "selected" : ""}>Title A–Z</option>
        </select>
      </div>
    </div>

    ${list.length ? tasksTableHtml(list) : `<div class="card">${emptyStateHtml("No tasks match your filters.", "Add Task", "openTaskModal()")}</div>`}
  `;
}

function tasksTableHtml(list) {
  return `
    <div class="table-wrap">
      <table class="data-table">
        <thead>
          <tr>
            <th style="width:34px"></th>
            <th>Task</th>
            <th>Project</th>
            <th>Due Date</th>
            <th>Priority</th>
            <th>Status</th>
            <th>Assignee</th>
            <th style="width:80px">Action</th>
          </tr>
        </thead>
        <tbody>
          ${list.map(taskTableRowHtml).join("")}
        </tbody>
      </table>
    </div>`;
}

function taskTableRowHtml(t) {
  const eff = computeEffectiveStatus(t);
  return `
    <tr onclick="openTaskDrawer('${t.id}')">
      <td onclick="event.stopPropagation()">
        <div class="task-check ${t.status === "Completed" ? "done" : ""}" onclick="handleToggleComplete('${t.id}')">${t.status === "Completed" ? icon("check") : ""}</div>
      </td>
      <td class="task-name-cell">
        ${escapeHtml(t.title)}
        ${t.description ? `<div class="desc">${escapeHtml(t.description)}</div>` : ""}
      </td>
      <td>${projectChip(t.project)}</td>
      <td>${fmtDateHuman(t.dueDate)}${t.dueTime ? ` · ${fmtTime12(t.dueTime)}` : ""}</td>
      <td>${priorityBadge(t.priority)}</td>
      <td>${statusBadge(eff)}</td>
      <td>${initialsAvatar(t.assignee, "sm")}</td>
      <td onclick="event.stopPropagation()">
        <div class="row-actions">
          <div class="icon-btn xs" data-tooltip="Edit" onclick="openTaskModal('${t.id}')">${icon("edit")}</div>
          <div class="icon-btn xs" data-tooltip="Delete" onclick="handleDeleteTask('${t.id}')">${icon("trash")}</div>
        </div>
      </td>
    </tr>`;
}

function setTasksTab(tab) {
  TasksPageState.tab = tab;
  rerenderCurrentPage();
}
function setTasksSearch(val) {
  TasksPageState.search = val;
  rerenderCurrentPage(true);
}
function setTasksFilter(key, val) {
  TasksPageState[key] = val;
  rerenderCurrentPage();
}
async function handleDeleteTask(id) {
  if (!confirm("Delete this task? This cannot be undone.")) return;
  try {
    await Store.deleteTask(id);
    showToast("Task deleted", "success");
    rerenderCurrentPage();
  } catch (e) {
    showToast(e.message || "Failed to delete task", "error");
  }
}

/* ---------- Projects page ---------- */
function renderProjectsPage() {
  const tasks = Store.getTasks();
  return `
    <div class="page-header">
      <div>
        <h1>Projects</h1>
        <p class="sub">${PROJECTS.length} active projects</p>
      </div>
      <div class="page-header-actions">
        <button class="btn btn-primary" onclick="openTaskModal()">${icon("plus")} Add Task</button>
      </div>
    </div>
    <div class="team-grid">
      ${PROJECTS.map((p) => {
        const pTasks = tasks.filter((t) => t.project === p.id);
        const done = pTasks.filter((t) => t.status === "Completed").length;
        const pct = pTasks.length ? Math.round((done / pTasks.length) * 100) : 0;
        return `
          <div class="team-card" style="cursor:pointer" onclick="navigate('tasks'); setTasksFilter('project','${p.id}')">
            <div class="head">
              <span class="project-dot" style="width:14px;height:14px;background:${p.color}"></span>
              <div>
                <div class="name">${escapeHtml(p.name)}</div>
                <div class="role">${pTasks.length} task${pTasks.length === 1 ? "" : "s"}</div>
              </div>
            </div>
            <div class="workload-top"><span class="lbl">Progress</span><span class="val">${pct}%</span></div>
            <div class="progress-track"><div class="progress-fill" style="width:${pct}%;background:${p.color}"></div></div>
          </div>`;
      }).join("")}
    </div>
  `;
}
