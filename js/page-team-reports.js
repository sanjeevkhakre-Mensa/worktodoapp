/* ============================================================
   WorkFlow — Team Tasks + Reports pages
   ============================================================ */

const TeamPageState = { member: "all", project: "all", status: "all" };

function renderTeamPage() {
  const tasks = Store.getTasks();
  const allMembers = getAllUsers();
  let members = allMembers.slice();
  if (TeamPageState.member !== "all") members = members.filter((u) => u.id === TeamPageState.member);

  return `
    <div class="page-header">
      <div>
        <h1>Team Tasks</h1>
        <p class="sub">Workload and completion across ${allMembers.length} team members</p>
      </div>
    </div>

    <div class="toolbar">
      <div class="select-box">
        <select onchange="setTeamFilter('member', this.value)">
          <option value="all">All Employees</option>
          ${allMembers.map((u) => `<option value="${u.id}" ${TeamPageState.member === u.id ? "selected" : ""}>${escapeHtml(u.name)}</option>`).join("")}
        </select>
      </div>
      <div class="select-box">
        <select onchange="setTeamFilter('project', this.value)">
          <option value="all">All Projects</option>
          ${PROJECTS.map((p) => `<option value="${p.id}" ${TeamPageState.project === p.id ? "selected" : ""}>${escapeHtml(p.name)}</option>`).join("")}
        </select>
      </div>
      <div class="select-box">
        <select onchange="setTeamFilter('status', this.value)">
          <option value="all">All Status</option>
          <option value="Todo">Todo</option>
          <option value="In Progress">In Progress</option>
          <option value="Completed">Completed</option>
          <option value="Overdue">Overdue</option>
        </select>
      </div>
    </div>

    <div class="team-grid">
      ${members.map((u) => teamCardHtml(u, tasks)).join("")}
    </div>
  `;
}

function teamCardHtml(u, allTasks) {
  let tasks = allTasks.filter((t) => t.assignee === u.id);
  if (TeamPageState.project !== "all") tasks = tasks.filter((t) => t.project === TeamPageState.project);
  if (TeamPageState.status !== "all") tasks = tasks.filter((t) => computeEffectiveStatus(t) === TeamPageState.status);

  const assigned = tasks.length;
  const completed = tasks.filter((t) => t.status === "Completed").length;
  const pending = tasks.filter((t) => ["Todo", "Pending"].includes(computeEffectiveStatus(t))).length;
  const overdue = tasks.filter((t) => computeEffectiveStatus(t) === "Overdue").length;
  const pct = assigned ? Math.round((completed / assigned) * 100) : 0;

  return `
    <div class="team-card">
      <div class="head">
        ${initialsAvatar(u.id, "lg")}
        <div><div class="name">${escapeHtml(u.name)}</div><div class="role">${escapeHtml(u.role)}</div></div>
      </div>
      <div class="team-stats">
        <div class="team-stat"><div class="n">${assigned}</div><div class="l">Assigned</div></div>
        <div class="team-stat"><div class="n" style="color:var(--green)">${completed}</div><div class="l">Done</div></div>
        <div class="team-stat"><div class="n" style="color:var(--amber)">${pending}</div><div class="l">Pending</div></div>
        <div class="team-stat"><div class="n" style="color:var(--red)">${overdue}</div><div class="l">Overdue</div></div>
      </div>
      <div class="workload-top"><span class="lbl">Completion</span><span class="val">${pct}%</span></div>
      <div class="progress-track"><div class="progress-fill" style="width:${pct}%;background:${pct >= 70 ? "var(--green)" : pct >= 40 ? "var(--amber)" : "var(--red)"}"></div></div>
    </div>`;
}

function setTeamFilter(key, val) {
  TeamPageState[key] = val;
  rerenderCurrentPage();
}

/* ================= Reports ================= */

function renderReportsPage() {
  const tasks = Store.getTasks();
  const total = tasks.length;
  const completed = tasks.filter((t) => t.status === "Completed").length;
  const overdue = tasks.filter((t) => computeEffectiveStatus(t) === "Overdue").length;
  const pending = total - completed - overdue;
  const rate = total ? Math.round((completed / total) * 100) : 0;

  const byProject = PROJECTS.map((p) => ({
    label: p.name,
    color: p.color,
    value: tasks.filter((t) => t.project === p.id).length,
  }));
  const byEmployee = getAllUsers().map((u) => ({
    label: u.name.split(" ")[0],
    color: u.color,
    value: tasks.filter((t) => t.assignee === u.id).length,
  }));

  const trend = [62, 58, 71, 66, 74, 69, rate];
  const trendLabels = ["Wk-6", "Wk-5", "Wk-4", "Wk-3", "Wk-2", "Last wk", "This wk"];

  return `
    <div class="page-header">
      <div>
        <h1>Reports</h1>
        <p class="sub">Team productivity overview</p>
      </div>
    </div>

    <div class="kpi-grid">
      <div class="kpi-card">
        <div class="kpi-top"><span class="kpi-label">Total Tasks</span><span class="kpi-icon blue">${icon("tasks")}</span></div>
        <div class="kpi-value">${total}</div>
        <div class="kpi-foot">Across all projects</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-top"><span class="kpi-label">Completed</span><span class="kpi-icon green">${icon("completed")}</span></div>
        <div class="kpi-value">${completed}</div>
        <div class="kpi-foot up">${rate}% completion rate</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-top"><span class="kpi-label">Pending</span><span class="kpi-icon amber">${icon("clock")}</span></div>
        <div class="kpi-value">${pending}</div>
        <div class="kpi-foot warn">In progress or todo</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-top"><span class="kpi-label">Overdue</span><span class="kpi-icon red">${icon("flag")}</span></div>
        <div class="kpi-value">${overdue}</div>
        <div class="kpi-foot down">Needs attention</div>
      </div>
    </div>

    <div class="report-grid" style="margin-bottom:18px">
      <div class="card">
        <div class="card-header"><h3>Productivity Trend</h3></div>
        <div class="card-body pad">
          <div class="bar-chart">
            ${trend
              .map((v, i) => `
              <div class="bar-col">
                <span class="val">${v}%</span>
                <div class="bar" style="height:${v}%;background:linear-gradient(180deg,var(--primary),${i === trend.length - 1 ? "var(--primary)" : "var(--primary-tint-strong)"})"></div>
                <span class="lbl">${trendLabels[i]}</span>
              </div>`)
              .join("")}
          </div>
        </div>
      </div>

      <div class="card">
        <div class="card-header"><h3>Tasks by Project</h3></div>
        <div class="card-body pad">
          ${byProject
            .map((p) => `
            <div class="legend-row">
              <span class="sw" style="background:${p.color}"></span>
              <span class="lname">${escapeHtml(p.label)}</span>
              <span class="lval">${p.value}</span>
            </div>
            <div class="progress-track" style="margin-bottom:8px"><div class="progress-fill" style="width:${total ? (p.value / total) * 100 : 0}%;background:${p.color}"></div></div>
          `)
            .join("")}
        </div>
      </div>
    </div>

    <div class="card">
      <div class="card-header"><h3>Tasks by Employee</h3></div>
      <div class="card-body pad">
        <div class="bar-chart" style="height:170px">
          ${byEmployee
            .map((e) => {
              const maxV = Math.max(1, ...byEmployee.map((x) => x.value));
              const h = (e.value / maxV) * 100;
              return `
              <div class="bar-col">
                <span class="val">${e.value}</span>
                <div class="bar" style="height:${h}%;background:${e.color}"></div>
                <span class="lbl">${escapeHtml(e.label)}</span>
              </div>`;
            })
            .join("")}
        </div>
      </div>
    </div>
  `;
}
