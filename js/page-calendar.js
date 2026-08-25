/* ============================================================
   WorkFlow — Calendar page (Month / Week / Day views)
   ============================================================ */

const CalendarState = {
  view: "month", // month | week | day
  cursor: todayYmd(), // any ymd within the currently viewed period
};

const DOW_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function ymdToDate(ymd) {
  return new Date(ymd + "T00:00:00");
}
function dateToYmd(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function tasksByDate() {
  const map = {};
  Store.getTasks().forEach((t) => {
    if (!t.dueDate) return;
    (map[t.dueDate] = map[t.dueDate] || []).push(t);
  });
  return map;
}

function renderCalendarPage() {
  const view = CalendarState.view;
  return `
    <div class="page-header">
      <div>
        <h1>Calendar</h1>
        <p class="sub">Click any date to schedule a task</p>
      </div>
      <div class="page-header-actions">
        <button class="btn btn-primary" onclick="openTaskModal(null,'${CalendarState.cursor}')">${icon("plus")} Add Task</button>
      </div>
    </div>

    <div class="calendar-toolbar">
      <div class="calendar-nav">
        <div class="icon-btn" onclick="calendarShift(-1)">${icon("chevronLeft")}</div>
        <h2>${calendarTitle()}</h2>
        <div class="icon-btn" onclick="calendarShift(1)">${icon("chevronRight")}</div>
        <button class="btn btn-secondary btn-sm" onclick="calendarToday()">Today</button>
      </div>
      <div class="pill-tabs">
        ${["month", "week", "day"].map((v) => `<div class="pill-tab ${view === v ? "active" : ""}" onclick="setCalendarView('${v}')">${v[0].toUpperCase() + v.slice(1)}</div>`).join("")}
      </div>
    </div>

    ${view === "month" ? monthViewHtml() : view === "week" ? weekViewHtml() : dayViewHtml()}
  `;
}

function calendarTitle() {
  const d = ymdToDate(CalendarState.cursor);
  if (CalendarState.view === "month") {
    return d.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  }
  if (CalendarState.view === "day") {
    return d.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric", year: "numeric" });
  }
  const start = startOfWeek(d);
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  const sameMonth = start.getMonth() === end.getMonth();
  const startLabel = start.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  // Note: this Chromium build's toLocaleDateString misformats when `month` is omitted
  // from the options (e.g. {day,year} alone) — build the same-month case manually instead.
  const endLabel = sameMonth
    ? `${end.getDate()}, ${end.getFullYear()}`
    : end.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  return `${startLabel} – ${endLabel}`;
}

function startOfWeek(d) {
  const nd = new Date(d);
  nd.setDate(nd.getDate() - nd.getDay());
  return nd;
}

function calendarShift(dir) {
  const d = ymdToDate(CalendarState.cursor);
  if (CalendarState.view === "month") d.setMonth(d.getMonth() + dir);
  else if (CalendarState.view === "week") d.setDate(d.getDate() + dir * 7);
  else d.setDate(d.getDate() + dir);
  CalendarState.cursor = dateToYmd(d);
  rerenderCurrentPage();
}
function calendarToday() {
  CalendarState.cursor = todayYmd();
  rerenderCurrentPage();
}
function setCalendarView(v) {
  CalendarState.view = v;
  rerenderCurrentPage();
}

const PRIORITY_DOT_COLOR = { Urgent: "var(--red)", High: "var(--red)", Medium: "var(--amber)", Low: "var(--ink-faint)" };

function monthViewHtml() {
  const cursor = ymdToDate(CalendarState.cursor);
  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const firstOfMonth = new Date(year, month, 1);
  const gridStart = startOfWeek(firstOfMonth);
  const byDate = tasksByDate();
  const today = todayYmd();

  let cells = "";
  for (let i = 0; i < 42; i++) {
    const d = new Date(gridStart);
    d.setDate(d.getDate() + i);
    const ymd = dateToYmd(d);
    const inMonth = d.getMonth() === month;
    const isToday = ymd === today;
    const dayTasks = (byDate[ymd] || []).slice().sort((a, b) => (a.dueTime || "99").localeCompare(b.dueTime || "99"));
    const visible = dayTasks.slice(0, 3);
    const extra = dayTasks.length - visible.length;

    cells += `
      <div class="cal-cell ${inMonth ? "" : "other-month"} ${isToday ? "today" : ""}" onclick="handleCalCellClick('${ymd}')">
        <div class="cal-daynum">${d.getDate()}</div>
        ${visible
          .map((t) => {
            const p = getProject(t.project);
            return `<div class="cal-task-chip" style="background:${p.color}22;color:${p.color}" onclick="event.stopPropagation();openTaskDrawer('${t.id}')" data-tooltip="${escapeHtml(t.title)}">${escapeHtml(t.title)}</div>`;
          })
          .join("")}
        ${extra > 0 ? `<div class="cal-more">+${extra} more</div>` : ""}
      </div>`;
  }

  return `
    <div class="cal-grid">
      ${DOW_NAMES.map((n) => `<div class="cal-dow">${n}</div>`).join("")}
      ${cells}
    </div>`;
}

function weekViewHtml() {
  const cursor = ymdToDate(CalendarState.cursor);
  const start = startOfWeek(cursor);
  const byDate = tasksByDate();
  const today = todayYmd();

  let heads = "";
  let lists = "";
  for (let i = 0; i < 7; i++) {
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    const ymd = dateToYmd(d);
    const isToday = ymd === today;
    heads += `<div class="week-head" style="${isToday ? "color:var(--primary)" : ""}"><div class="dname">${DOW_NAMES[i]}</div><div class="dnum" style="${isToday ? "color:var(--primary)" : ""}">${d.getDate()}</div></div>`;
    const dayTasks = (byDate[ymd] || []).sort((a, b) => (a.dueTime || "99").localeCompare(b.dueTime || "99"));
    lists += `
      <div class="week-day-list" onclick="handleCalCellClick('${ymd}')">
        ${dayTasks
          .map((t) => {
            const p = getProject(t.project);
            return `<div class="day-task-item" style="background:${p.color}22;color:${p.color}" onclick="event.stopPropagation();openTaskDrawer('${t.id}')">${t.dueTime ? fmtTime12(t.dueTime) + " · " : ""}${escapeHtml(t.title)}</div>`;
          })
          .join("") || `<div style="font-size:11.5px;color:var(--ink-faint);padding-top:6px">No tasks</div>`}
      </div>`;
  }

  return `<div class="week-grid"><div></div>${heads}<div style="padding:10px;font-size:11px;color:var(--ink-faint)">Tasks</div>${lists}</div>`;
}

function dayViewHtml() {
  const ymd = CalendarState.cursor;
  const byDate = tasksByDate();
  const dayTasks = (byDate[ymd] || []).sort((a, b) => (a.dueTime || "99").localeCompare(b.dueTime || "99"));

  return `
    <div class="card day-view-list">
      <div class="card-header"><h3>${dayTasks.length} task${dayTasks.length === 1 ? "" : "s"}</h3>
        <span class="link" onclick="openTaskModal(null,'${ymd}')">+ Add task on this day</span>
      </div>
      <div class="card-body">
        ${dayTasks.length ? dayTasks.map(taskRowHtml).join("") : emptyStateHtml("No tasks scheduled for this day.", "Add Task", `openTaskModal(null,'${ymd}')`)}
      </div>
    </div>`;
}

function handleCalCellClick(ymd) {
  openTaskModal(null, ymd);
}
