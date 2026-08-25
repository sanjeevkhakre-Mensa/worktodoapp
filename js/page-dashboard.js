/* ============================================================
   WorkFlow — Dashboard page
   ============================================================ */

function greetingForNow() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

function renderDashboard() {
  const tasks = Store.getTasks();
  const today = todayYmd();

  const todayTasks = tasks.filter((t) => t.dueDate === today).sort((a, b) => (a.dueTime || "99:99").localeCompare(b.dueTime || "99:99"));
  const todayCompleted = todayTasks.filter((t) => t.status === "Completed").length;

  const inProgress = tasks.filter((t) => computeEffectiveStatus(t) === "In Progress");
  const inProgressDueToday = inProgress.filter((t) => t.dueDate === today).length;

  const overdue = tasks.filter((t) => computeEffectiveStatus(t) === "Overdue");

  const totalNonCancelled = tasks.length;
  const completedCount = tasks.filter((t) => t.status === "Completed").length;
  const completionRate = totalNonCancelled ? Math.round((completedCount / totalNonCancelled) * 100) : 0;

  const upcoming = tasks
    .filter((t) => t.status !== "Completed" && t.dueDate > today)
    .sort((a, b) => (a.dueDate + (a.dueTime || "")).localeCompare(b.dueDate + (b.dueTime || "")))
    .slice(0, 5);

  const dateLabel = new Date(today + "T00:00:00").toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
  const myId = currentUserId();
  const currentUser = getUser(myId);
  const firstName = currentUser.name.split(" ")[0];

  const workloadStats = [
    { label: "Tasks Assigned", value: tasks.filter((t) => t.assignee === myId).length, color: "var(--primary)" },
    { label: "Completed", value: tasks.filter((t) => t.assignee === myId && t.status === "Completed").length, color: "var(--green)" },
    { label: "In Progress", value: tasks.filter((t) => t.assignee === myId && computeEffectiveStatus(t) === "In Progress").length, color: "var(--amber)" },
    { label: "Overdue", value: tasks.filter((t) => t.assignee === myId && computeEffectiveStatus(t) === "Overdue").length, color: "var(--red)" },
  ];
  const maxWorkload = Math.max(1, ...workloadStats.map((w) => w.value));

  return `
    <div class="page-header">
      <div>
        <h1>${greetingForNow()}, ${escapeHtml(firstName)}</h1>
        <p class="sub">${dateLabel}</p>
      </div>
      <div class="page-header-actions">
        <button class="btn btn-primary" onclick="openTaskModal()">${icon("plus")} Add Task</button>
      </div>
    </div>

    <div class="kpi-grid">
      <div class="kpi-card">
        <div class="kpi-top">
          <span class="kpi-label">Today's Tasks</span>
          <span class="kpi-icon blue">${icon("today")}</span>
        </div>
        <div class="kpi-value">${todayTasks.length}</div>
        <div class="kpi-foot">${todayCompleted} completed</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-top">
          <span class="kpi-label">In Progress</span>
          <span class="kpi-icon amber">${icon("clock")}</span>
        </div>
        <div class="kpi-value">${inProgress.length}</div>
        <div class="kpi-foot warn">${inProgressDueToday} due today</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-top">
          <span class="kpi-label">Overdue</span>
          <span class="kpi-icon red">${icon("flag")}</span>
        </div>
        <div class="kpi-value">${overdue.length}</div>
        <div class="kpi-foot down">Needs attention</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-top">
          <span class="kpi-label">Completion Rate</span>
          <span class="kpi-icon green">${icon("completed")}</span>
        </div>
        <div class="kpi-value">${completionRate}%</div>
        <div class="kpi-foot up">+8% vs last week</div>
      </div>
    </div>

    <div class="dash-grid">
      <div class="card">
        <div class="card-header">
          <h3>Today's Tasks</h3>
          <span class="link" onclick="navigate('tasks','today')">View all</span>
        </div>
        <div class="card-body">
          ${
            todayTasks.length
              ? todayTasks.map(taskRowHtml).join("")
              : emptyStateHtml("No tasks scheduled for today.", "Add Task", "openTaskModal()")
          }
        </div>
      </div>

      <div class="stack">
        <div class="card">
          <div class="card-header"><h3>My Workload</h3></div>
          <div class="card-body pad">
            ${workloadStats
              .map(
                (w) => `
              <div class="workload-row">
                <div class="workload-top"><span class="lbl">${w.label}</span><span class="val">${w.value}</span></div>
                <div class="progress-track"><div class="progress-fill" style="width:${(w.value / maxWorkload) * 100}%;background:${w.color}"></div></div>
              </div>`
              )
              .join("")}
          </div>
        </div>

        <div class="card">
          <div class="card-header">
            <h3>Upcoming</h3>
            <span class="link" onclick="navigate('tasks','upcoming')">View all</span>
          </div>
          <div class="card-body pad" style="padding-top:6px">
            ${
              upcoming.length
                ? upcoming.map(upcomingItemHtml).join("")
                : `<div class="empty-state" style="padding:24px 8px"><span class="msg">Nothing coming up</span></div>`
            }
          </div>
        </div>
      </div>
    </div>
  `;
}

function taskRowHtml(t) {
  const eff = computeEffectiveStatus(t);
  const timeRange = fmtTimeRange(t);
  const project = getProject(t.project);
  return `
    <div class="task-row" onclick="openTaskDrawer('${t.id}')">
      <div class="task-check ${t.status === "Completed" ? "done" : ""}" onclick="event.stopPropagation(); handleToggleComplete('${t.id}')">${t.status === "Completed" ? icon("check") : ""}</div>
      <div class="task-main">
        <div class="task-title ${t.status === "Completed" ? "done" : ""}">${escapeHtml(t.title)}</div>
        <div class="task-meta">
          ${timeRange ? `<span>${timeRange}</span><span class="dot-sep"></span>` : ""}
          ${projectChip(t.project)}
        </div>
      </div>
      <div class="task-tags">
        ${priorityBadge(t.priority)}
        ${statusBadge(eff)}
      </div>
    </div>`;
}

function upcomingItemHtml(t) {
  const d = new Date(t.dueDate + "T00:00:00");
  const day = d.getDate();
  const month = d.toLocaleDateString("en-US", { month: "short" }).toUpperCase();
  return `
    <div class="upcoming-item" style="cursor:pointer" onclick="openTaskDrawer('${t.id}')">
      <div class="upcoming-date-chip"><span class="d">${day}</span><span class="m">${month}</span></div>
      <div style="min-width:0;flex:1">
        <div class="title">${escapeHtml(t.title)}</div>
        <div class="time">${fmtTimeRange(t) || "No time set"}</div>
      </div>
      ${priorityBadge(t.priority)}
    </div>`;
}

function emptyStateHtml(msg, btnLabel, onclickAttr) {
  return `
    <div class="empty-state">
      ${icon("inbox")}
      <div class="msg">${escapeHtml(msg)}</div>
      ${btnLabel ? `<button class="btn btn-primary btn-sm" onclick="${onclickAttr}">${icon("plus")} ${escapeHtml(btnLabel)}</button>` : ""}
    </div>`;
}

async function handleToggleComplete(id) {
  try {
    const task = await Store.toggleComplete(id);
    showToast(task.status === "Completed" ? "Task marked as completed" : "Task moved back to To-Do", "success");
    rerenderCurrentPage(true);
  } catch (e) {
    showToast(e.message || "Failed to update task", "error");
  }
}
