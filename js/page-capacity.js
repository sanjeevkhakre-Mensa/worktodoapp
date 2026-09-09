/* ============================================================
   WorkFlow — Capacity page: weekly resource booking / capacity planning
   ============================================================ */

const CapacityState = { weekCursor: todayYmd() }; // any ymd within the currently viewed week

function overlapDays(booking, weekStart, weekEnd) {
  // Inclusive day-count overlap between a booking's [startDate,endDate] and the
  // currently viewed week — a booking spanning multiple weeks only "costs" the days
  // that actually fall inside the week being looked at.
  const start = booking.startDate > weekStart ? booking.startDate : weekStart;
  const end = booking.endDate < weekEnd ? booking.endDate : weekEnd;
  if (end < start) return 0;
  const days = Math.round((ymdToDate(end) - ymdToDate(start)) / 86400000) + 1;
  return days;
}

function bookingsForWeek(weekStart, weekEnd) {
  return Store.getBookings().filter((b) => b.startDate <= weekEnd && b.endDate >= weekStart);
}

// Greedy lane assignment so overlapping bookings for the same person stack instead of
// visually colliding — most weeks have zero overlap, so most people just get lane 0.
function assignLanes(bookings) {
  const sorted = bookings.slice().sort((a, b) => a.startDate.localeCompare(b.startDate));
  const laneEnds = []; // laneEnds[i] = last endDate occupied in lane i
  return sorted.map((b) => {
    let lane = laneEnds.findIndex((end) => end < b.startDate);
    if (lane === -1) { lane = laneEnds.length; laneEnds.push(b.endDate); }
    else laneEnds[lane] = b.endDate;
    return Object.assign({}, b, { lane });
  });
}

function renderCapacityPage() {
  const cursor = ymdToDate(CapacityState.weekCursor);
  const start = startOfWeek(cursor);
  const weekDates = Array.from({ length: 7 }, (_, i) => { const d = new Date(start); d.setDate(d.getDate() + i); return d; });
  const weekStart = dateToYmd(weekDates[0]);
  const weekEnd = dateToYmd(weekDates[6]);
  const today = todayYmd();

  const users = getAllUsers();
  const weekBookings = bookingsForWeek(weekStart, weekEnd);

  return `
    <div class="page-header">
      <div>
        <h1>Capacity</h1>
        <p class="sub">Weekly workload by person — see who's free and who's stretched thin</p>
      </div>
      <button class="btn btn-primary" onclick="openBookingModal()">${icon("plus")} Add Booking</button>
    </div>

    <div class="calendar-toolbar">
      <div class="calendar-nav">
        <div class="icon-btn" onclick="capacityShiftWeek(-1)">${icon("chevronLeft")}</div>
        <h2>${weekRangeLabel(weekDates)}</h2>
        <div class="icon-btn" onclick="capacityShiftWeek(1)">${icon("chevronRight")}</div>
        <button class="btn btn-secondary btn-sm" onclick="capacityToday()">Today</button>
      </div>
    </div>

    <div class="capacity-board">
      <div class="capacity-days-header">
        <div class="capacity-user-col-header"></div>
        <div class="capacity-days-col-header">
          ${weekDates.map((d) => `<div class="capacity-daycol ${dateToYmd(d) === today ? "is-today" : ""}"><span class="dname">${DOW_NAMES[d.getDay()]}</span><span class="dnum">${d.getDate()}</span></div>`).join("")}
        </div>
      </div>
      ${
        users.length
          ? users.map((u) => capacityRowHtml(u, weekBookings.filter((b) => b.userId === u.id), weekStart, weekEnd)).join("")
          : `<div class="empty-state">${icon("inbox")}<div class="msg">No team members yet.</div></div>`
      }
    </div>
  `;
}

function weekRangeLabel(weekDates) {
  const start = weekDates[0], end = weekDates[6];
  const sameMonth = start.getMonth() === end.getMonth();
  const startLabel = start.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  const endLabel = sameMonth
    ? `${end.getDate()}, ${end.getFullYear()}`
    : end.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  return `${startLabel} – ${endLabel}`;
}

function capacityRowHtml(user, userBookings, weekStart, weekEnd) {
  const capacity = user.weeklyCapacityHours || 0;
  const bookedHours = userBookings.reduce((sum, b) => sum + b.hoursPerDay * overlapDays(b, weekStart, weekEnd), 0);
  const remaining = capacity - bookedHours;
  const pctBooked = capacity ? Math.min(100, Math.round((bookedHours / capacity) * 100)) : 0;
  const over = remaining < 0;
  const lanes = assignLanes(userBookings);
  const laneCount = Math.max(1, ...lanes.map((b) => b.lane + 1));

  return `
    <div class="capacity-row">
      <div class="capacity-user-col">
        <div class="capacity-user-head">
          ${initialsAvatar(user.id, "sm")}
          <div class="capacity-user-meta">
            <div class="name">${escapeHtml(user.name)}</div>
            <div class="role">${escapeHtml(user.role)}</div>
          </div>
        </div>
        <div class="capacity-hours-row">
          <span class="${over ? "over" : ""}">${remaining} hrs left</span>
          <span class="capacity-total" onclick="startEditCapacity('${user.id}', ${capacity})" data-tooltip="Edit weekly capacity">/ ${capacity} hrs ${icon("edit")}</span>
        </div>
        <div class="progress-track"><div class="progress-fill ${over ? "over" : ""}" style="width:${pctBooked}%"></div></div>
      </div>
      <div class="capacity-days-col" style="grid-template-rows: repeat(${laneCount}, 28px)">
        ${lanes.map((b) => bookingBarHtml(b, weekStart)).join("")}
      </div>
    </div>`;
}

function bookingBarHtml(booking, weekStart) {
  const weekStartDate = ymdToDate(weekStart);
  const barStart = booking.startDate > weekStart ? booking.startDate : weekStart;
  const barEndDate = ymdToDate(booking.endDate);
  const weekEndDate = new Date(weekStartDate); weekEndDate.setDate(weekEndDate.getDate() + 6);
  const barEnd = barEndDate < weekEndDate ? booking.endDate : dateToYmd(weekEndDate);

  const startCol = Math.round((ymdToDate(barStart) - weekStartDate) / 86400000) + 1; // 1-indexed grid column
  const endCol = Math.round((ymdToDate(barEnd) - weekStartDate) / 86400000) + 2; // exclusive end
  const project = booking.projectId ? getProject(booking.projectId) : null;
  const color = project ? project.color : "var(--primary)";

  return `
    <div class="booking-bar" style="grid-column:${startCol}/${endCol};grid-row:${booking.lane + 1};background:${color}22;color:${color};border-color:${color}55"
      onclick="openBookingModal('${booking.id}')" data-tooltip="${escapeHtml(booking.hoursPerDay)} hrs/day · ${escapeHtml(booking.title)}">
      <span class="booking-bar-hours">${booking.hoursPerDay}h/day</span> ${escapeHtml(booking.title)}
    </div>`;
}

function capacityShiftWeek(dir) {
  const d = ymdToDate(CapacityState.weekCursor);
  d.setDate(d.getDate() + dir * 7);
  CapacityState.weekCursor = dateToYmd(d);
  rerenderCurrentPage(true);
}

function capacityToday() {
  CapacityState.weekCursor = todayYmd();
  rerenderCurrentPage(true);
}

function startEditCapacity(userId, current) {
  const val = prompt("Weekly capacity (hours):", current);
  if (val === null) return;
  const hours = Number(val);
  if (!Number.isFinite(hours) || hours < 0) {
    showToast("Enter a positive number of hours", "error");
    return;
  }
  Store.updateUserCapacity(userId, hours).then(() => {
    showToast("Weekly capacity updated", "success");
    rerenderCurrentPage(true);
  }).catch((e) => showToast(e.message || "Failed to update capacity", "error"));
}
