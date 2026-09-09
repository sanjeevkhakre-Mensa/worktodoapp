/* ============================================================
   WorkFlow — Data layer (local-storage store; see js/api.js for persistence)
   ============================================================ */

const PROJECTS = [
  { id: "p1", name: "Sales Analytics", color: "#2563eb" },
  { id: "p2", name: "Business Review", color: "#7c3aed" },
  { id: "p3", name: "Reporting", color: "#16a34a" },
  { id: "p4", name: "Marketing", color: "#d97706" },
  { id: "p5", name: "Operations", color: "#dc2626" },
  { id: "p6", name: "Distributor Ops", color: "#0891b2" },
];

function initials(name) {
  return name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();
}

const TASK_FIELDS = [
  "title", "description", "dueDate", "dueTime", "endTime", "priority",
  "status", "project", "assignee", "reminder", "recurring", "attachments",
];
const BOOKING_FIELDS = ["userId", "projectId", "title", "startDate", "endDate", "hoursPerDay"];

function currentDbUser(db) {
  return db.users.find((u) => u.id === getToken());
}

const Store = {
  state: { me: null, users: [], tasks: [], bookings: [] },

  async refreshState() {
    const db = loadDb();
    const me = currentDbUser(db);
    if (!me) throw new Error("Not authenticated");
    this.state = {
      me: publicUser(me),
      users: db.users.map(publicUser),
      tasks: db.tasks,
      bookings: db.bookings,
    };
    return this.state;
  },

  getTasks() {
    return this.state.tasks;
  },

  getTask(id) {
    return this.state.tasks.find((t) => t.id === id);
  },

  async addTask(patch) {
    const db = loadDb();
    if (!patch.title || !String(patch.title).trim()) throw new Error("Task name is required");
    const me = currentDbUser(db);
    const now = new Date().toISOString();
    const task = {
      id: genId("t"),
      description: "", dueTime: "", endTime: "", priority: "Medium", status: "Todo", project: "p1",
      assignee: me.id, reminder: false, recurring: "None", attachments: [], checklist: [], comments: [],
      createdBy: me.id, createdAt: now, activity: [{ text: `Task created by ${me.name}`, date: now }],
    };
    TASK_FIELDS.forEach((f) => { if (patch[f] !== undefined) task[f] = patch[f]; });
    if (patch.sourceEmailId) task.sourceEmailId = patch.sourceEmailId;
    db.tasks.unshift(task);
    saveDb(db);
    await this.refreshState();
    return task;
  },

  async updateTask(id, patch, activityNote) {
    const db = loadDb();
    const task = db.tasks.find((t) => t.id === id);
    if (!task) throw new Error("Task not found");
    const me = currentDbUser(db);
    const prevAssignee = task.assignee;
    TASK_FIELDS.forEach((f) => { if (patch[f] !== undefined) task[f] = patch[f]; });
    if (patch.assignee !== undefined && patch.assignee !== prevAssignee) {
      const newAssigneeUser = db.users.find((u) => u.id === patch.assignee);
      task.activity.push({
        text: `Reassigned to ${newAssigneeUser ? newAssigneeUser.name : "someone else"} by ${me.name}`,
        date: new Date().toISOString(),
      });
    }
    task.activity.push({ text: activityNote || `Task details updated by ${me.name}`, date: new Date().toISOString() });
    saveDb(db);
    await this.refreshState();
    return task;
  },

  async deleteTask(id) {
    const db = loadDb();
    db.tasks = db.tasks.filter((t) => t.id !== id);
    saveDb(db);
    await this.refreshState();
  },

  async toggleComplete(id) {
    const db = loadDb();
    const task = db.tasks.find((t) => t.id === id);
    if (!task) throw new Error("Task not found");
    const me = currentDbUser(db);
    task.status = task.status === "Completed" ? "Todo" : "Completed";
    task.activity.push({ text: `Marked as ${task.status} by ${me.name}`, date: new Date().toISOString() });
    saveDb(db);
    await this.refreshState();
    return task;
  },

  async addComment(id, text) {
    const db = loadDb();
    const task = db.tasks.find((t) => t.id === id);
    if (!task) throw new Error("Task not found");
    const trimmed = (text || "").trim();
    if (!trimmed) throw new Error("Comment text is required");
    const me = currentDbUser(db);
    task.comments.push({ id: genId("cm"), author: me.id, text: trimmed, date: new Date().toISOString() });
    task.activity.push({ text: `Comment added by ${me.name}`, date: new Date().toISOString() });
    saveDb(db);
    await this.refreshState();
  },

  async toggleChecklistItem(taskId, itemId) {
    const db = loadDb();
    const task = db.tasks.find((t) => t.id === taskId);
    if (!task) throw new Error("Task not found");
    const item = task.checklist.find((c) => c.id === itemId);
    if (!item) throw new Error("Checklist item not found");
    item.done = !item.done;
    saveDb(db);
    await this.refreshState();
  },

  async addChecklistItem(taskId, text) {
    const db = loadDb();
    const task = db.tasks.find((t) => t.id === taskId);
    if (!task) throw new Error("Task not found");
    const trimmed = (text || "").trim();
    if (!trimmed) throw new Error("Checklist text is required");
    task.checklist.push({ id: genId("c"), text: trimmed, done: false });
    saveDb(db);
    await this.refreshState();
  },

  async reset() {
    const db = loadDb();
    db.tasks = seedTasks();
    saveDb(db);
    await this.refreshState();
  },

  async renameUser(id, name) {
    const db = loadDb();
    const user = db.users.find((u) => u.id === id);
    if (!user) throw new Error("User not found");
    const trimmed = String(name).trim();
    if (!trimmed) throw new Error("Name cannot be empty");
    user.name = trimmed;
    saveDb(db);
    await this.refreshState();
  },

  async addUser(name, role) {
    const db = loadDb();
    if (!name || !String(name).trim()) throw new Error("Name is required");
    let base = String(name).toLowerCase().replace(/[^a-z0-9]+/g, ".").replace(/^\.+|\.+$/g, "") || "user";
    let username = base;
    let n = 1;
    while (db.users.some((u) => u.username === username)) {
      username = `${base}${++n}`;
    }
    const user = {
      id: genId("u"),
      username,
      name: String(name).trim(),
      role: (role && String(role).trim()) || "Team Member",
      color: ["#2563eb", "#7c3aed", "#16a34a", "#d97706", "#dc2626", "#0891b2", "#db2777", "#4f46e5"][db.users.length % 8],
      custom: true,
      weeklyCapacityHours: 40,
    };
    db.users.push(user);
    saveDb(db);
    await this.refreshState();
    return { user: publicUser(user) };
  },

  async removeUser(id) {
    const db = loadDb();
    const user = db.users.find((u) => u.id === id);
    if (!user) throw new Error("User not found");
    if (!user.custom) throw new Error("Only added team members can be removed");
    db.users = db.users.filter((u) => u.id !== id);
    saveDb(db);
    await this.refreshState();
  },

  async updateUserCapacity(id, weeklyCapacityHours) {
    const db = loadDb();
    const user = db.users.find((u) => u.id === id);
    if (!user) throw new Error("User not found");
    const hours = Number(weeklyCapacityHours);
    if (!Number.isFinite(hours) || hours < 0) throw new Error("Weekly capacity must be a positive number");
    user.weeklyCapacityHours = hours;
    saveDb(db);
    await this.refreshState();
  },

  getBookings() {
    return this.state.bookings || [];
  },

  getBooking(id) {
    return this.getBookings().find((b) => b.id === id);
  },

  async addBooking(patch) {
    const db = loadDb();
    if (!patch.userId) throw new Error("userId is required");
    if (!patch.title || !String(patch.title).trim()) throw new Error("Title is required");
    if (!patch.startDate || !patch.endDate) throw new Error("Start and end date are required");
    if (patch.endDate < patch.startDate) throw new Error("End date can't be before start date");
    const hoursPerDay = Number(patch.hoursPerDay);
    if (!Number.isFinite(hoursPerDay) || hoursPerDay <= 0) throw new Error("Hours/day must be a positive number");
    const me = currentDbUser(db);
    const booking = {
      id: genId("bk"),
      userId: patch.userId,
      projectId: patch.projectId || null,
      title: String(patch.title).trim(),
      startDate: patch.startDate,
      endDate: patch.endDate,
      hoursPerDay,
      createdBy: me.id,
      createdAt: new Date().toISOString(),
    };
    db.bookings.push(booking);
    saveDb(db);
    await this.refreshState();
    return booking;
  },

  async updateBooking(id, patch) {
    const db = loadDb();
    const booking = db.bookings.find((b) => b.id === id);
    if (!booking) throw new Error("Booking not found");
    BOOKING_FIELDS.forEach((f) => { if (patch[f] !== undefined) booking[f] = patch[f]; });
    if (booking.endDate < booking.startDate) throw new Error("End date can't be before start date");
    saveDb(db);
    await this.refreshState();
    return booking;
  },

  async deleteBooking(id) {
    const db = loadDb();
    db.bookings = db.bookings.filter((b) => b.id !== id);
    saveDb(db);
    await this.refreshState();
  },
};

/* ---------- Derived helpers ---------- */

function currentUserId() {
  return Store.state.me && Store.state.me.id;
}

function todayYmd() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function computeEffectiveStatus(task) {
  if (task.status === "Completed") return "Completed";
  if (task.dueDate && task.dueDate < todayYmd()) return "Overdue";
  return task.status; // Todo | In Progress | Pending
}

function statusBadgeClass(status) {
  switch (status) {
    case "Completed": return "status-completed";
    case "In Progress": return "status-inprogress";
    case "Pending": return "status-pending";
    case "Overdue": return "status-overdue";
    default: return "status-todo";
  }
}

function priorityBadgeClass(priority) {
  return "priority-" + (priority || "medium").toLowerCase();
}

function getProject(id) {
  return PROJECTS.find((p) => p.id === id) || PROJECTS[0];
}

function getUser(id) {
  const found = (Store.state.users || []).find((u) => u.id === id);
  return found || { id: id || "unknown", name: "Unknown", role: "", color: "#9ca3af", custom: false };
}

function getAllUsers() {
  return Store.state.users || [];
}

function isCustomUser(id) {
  return !!getUser(id).custom;
}

function fmtDateHuman(ymd) {
  if (!ymd) return "No due date";
  const d = new Date(ymd + "T00:00:00");
  const today = new Date(todayYmd() + "T00:00:00");
  const diffDays = Math.round((d - today) / 86400000);
  const opts = { day: "numeric", month: "short" };
  const label = d.toLocaleDateString("en-US", opts);
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Tomorrow";
  if (diffDays === -1) return "Yesterday";
  return label;
}

function fmtTimeRange(task) {
  if (!task.dueTime) return "";
  if (task.endTime) return `${fmtTime12(task.dueTime)} – ${fmtTime12(task.endTime)}`;
  return fmtTime12(task.dueTime);
}

function fmtTime12(hhmm) {
  const [h, m] = hhmm.split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m).padStart(2, "0")} ${period}`;
}

function timeAgo(iso) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return mins + "m ago";
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return hrs + "h ago";
  const days = Math.floor(hrs / 24);
  return days + "d ago";
}
