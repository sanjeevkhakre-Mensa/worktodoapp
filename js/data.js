/* ============================================================
   WorkFlow — Data layer (server-backed store; see js/api.js for the HTTP client)
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

const Store = {
  state: { me: null, users: [], tasks: [] },

  async refreshState() {
    this.state = await apiCall("GET", "/api/state");
    return this.state;
  },

  getTasks() {
    return this.state.tasks;
  },

  getTask(id) {
    return this.state.tasks.find((t) => t.id === id);
  },

  async addTask(patch) {
    const created = await apiCall("POST", "/api/tasks", patch);
    await this.refreshState();
    return created;
  },

  async updateTask(id, patch, activityNote) {
    const body = activityNote ? Object.assign({}, patch, { activityNote }) : patch;
    const updated = await apiCall("PUT", `/api/tasks/${id}`, body);
    await this.refreshState();
    return updated;
  },

  async deleteTask(id) {
    await apiCall("DELETE", `/api/tasks/${id}`);
    await this.refreshState();
  },

  async toggleComplete(id) {
    const updated = await apiCall("POST", `/api/tasks/${id}/toggle-complete`);
    await this.refreshState();
    return updated;
  },

  async addComment(id, text) {
    await apiCall("POST", `/api/tasks/${id}/comments`, { text });
    await this.refreshState();
  },

  async toggleChecklistItem(taskId, itemId) {
    await apiCall("POST", `/api/tasks/${taskId}/checklist/${itemId}/toggle`);
    await this.refreshState();
  },

  async addChecklistItem(taskId, text) {
    await apiCall("POST", `/api/tasks/${taskId}/checklist`, { text });
    await this.refreshState();
  },

  async reset() {
    await apiCall("POST", "/api/reset");
    await this.refreshState();
  },

  async renameUser(id, name) {
    await apiCall("PUT", `/api/users/${id}`, { name });
    await this.refreshState();
  },

  async addUser(name, role) {
    const result = await apiCall("POST", "/api/users", { name, role });
    await this.refreshState();
    return result;
  },

  async removeUser(id) {
    await apiCall("DELETE", `/api/users/${id}`);
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
