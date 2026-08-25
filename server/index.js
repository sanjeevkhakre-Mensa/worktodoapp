// WorkFlow shared backend — one process serves both the static frontend and the JSON
// API, so running the app for a whole team is just `node index.js` on one machine.
// Storage is a single JSON file (no native/compiled deps like sqlite) so it runs on any
// Windows PC with nothing but Node installed. Not built for heavy concurrent load — fine
// for a small team's shared task list.

const express = require("express");
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

const { SEED_USERS, seedTasks } = require("./seed");

const PORT = process.env.PORT || 4100;
const DB_PATH = path.join(__dirname, "data", "db.json");
const PUBLIC_DIR = path.join(__dirname, "..");

let nextIdCounter = 1;
function genId(prefix) {
  return (prefix || "id") + "_" + Date.now().toString(36) + "_" + (nextIdCounter++).toString(36);
}

function loadDb() {
  if (fs.existsSync(DB_PATH)) {
    const db = JSON.parse(fs.readFileSync(DB_PATH, "utf8"));
    // Older installs seeded a passwordHash per user from before login was simplified
    // to "pick your name" — harmless to leave in place, just no longer read anywhere.
    return db;
  }
  const users = SEED_USERS.map((u) => Object.assign({ custom: false }, u));
  const db = { users, tasks: seedTasks(() => genId("t")), sessions: {} };
  saveDbTo(db);
  return db;
}

function saveDbTo(db) {
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
  fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2));
}

let db = loadDb();
function save() {
  saveDbTo(db);
}

function publicUser(u) {
  return { id: u.id, username: u.username, name: u.name, role: u.role, color: u.color, custom: !!u.custom };
}

const app = express();
app.use(express.json());

function auth(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  const userId = token && db.sessions[token];
  const user = userId && db.users.find((u) => u.id === userId);
  if (!user) return res.status(401).json({ error: "Not authenticated" });
  req.user = user;
  next();
}

function findTaskOr404(req, res) {
  const task = db.tasks.find((t) => t.id === req.params.id);
  if (!task) {
    res.status(404).json({ error: "Task not found" });
    return null;
  }
  return task;
}

// ---------- Auth ----------
// No password — this is a small trusted-team tool, so logging in is just picking your
// name. Anyone who can reach the server can act as anyone; that's a deliberate trade-off
// for zero-friction login, not an oversight.
app.get("/api/login-users", (req, res) => {
  res.json({ users: db.users.map(publicUser) });
});

app.post("/api/login", (req, res) => {
  const { userId } = req.body || {};
  const user = db.users.find((u) => u.id === userId);
  if (!user) return res.status(401).json({ error: "Unknown user" });
  const token = crypto.randomBytes(24).toString("hex");
  db.sessions[token] = user.id;
  save();
  res.json({ token, user: publicUser(user) });
});

app.post("/api/logout", auth, (req, res) => {
  const header = req.headers.authorization || "";
  const token = header.slice(7);
  delete db.sessions[token];
  save();
  res.json({ ok: true });
});

// ---------- State ----------
app.get("/api/state", auth, (req, res) => {
  res.json({
    me: publicUser(req.user),
    users: db.users.map(publicUser),
    tasks: db.tasks,
  });
});

// ---------- Tasks ----------
const TASK_FIELDS = [
  "title", "description", "dueDate", "dueTime", "endTime", "priority",
  "status", "project", "assignee", "reminder", "recurring", "attachments",
];

app.post("/api/tasks", auth, (req, res) => {
  const body = req.body || {};
  if (!body.title || !String(body.title).trim()) return res.status(400).json({ error: "Task name is required" });
  const now = new Date().toISOString();
  const task = {
    id: genId("t"),
    description: "",
    dueTime: "",
    endTime: "",
    priority: "Medium",
    status: "Todo",
    project: "p1",
    assignee: req.user.id,
    reminder: false,
    recurring: "None",
    attachments: [],
    checklist: [],
    comments: [],
    createdBy: req.user.id,
    createdAt: now,
    activity: [{ text: `Task created by ${req.user.name}`, date: now }],
  };
  TASK_FIELDS.forEach((f) => {
    if (body[f] !== undefined) task[f] = body[f];
  });
  db.tasks.unshift(task);
  save();
  res.status(201).json(task);
});

app.put("/api/tasks/:id", auth, (req, res) => {
  const task = findTaskOr404(req, res);
  if (!task) return;
  const body = req.body || {};
  const prevAssignee = task.assignee;
  TASK_FIELDS.forEach((f) => {
    if (body[f] !== undefined) task[f] = body[f];
  });
  if (body.assignee !== undefined && body.assignee !== prevAssignee) {
    const newAssigneeUser = db.users.find((u) => u.id === body.assignee);
    task.activity.push({
      text: `Reassigned to ${newAssigneeUser ? newAssigneeUser.name : "someone else"} by ${req.user.name}`,
      date: new Date().toISOString(),
    });
  }
  task.activity.push({ text: body.activityNote || `Task details updated by ${req.user.name}`, date: new Date().toISOString() });
  save();
  res.json(task);
});

app.delete("/api/tasks/:id", auth, (req, res) => {
  const exists = db.tasks.some((t) => t.id === req.params.id);
  if (!exists) return res.status(404).json({ error: "Task not found" });
  db.tasks = db.tasks.filter((t) => t.id !== req.params.id);
  save();
  res.status(204).end();
});

app.post("/api/tasks/:id/toggle-complete", auth, (req, res) => {
  const task = findTaskOr404(req, res);
  if (!task) return;
  task.status = task.status === "Completed" ? "Todo" : "Completed";
  task.activity.push({ text: `Marked as ${task.status} by ${req.user.name}`, date: new Date().toISOString() });
  save();
  res.json(task);
});

app.post("/api/tasks/:id/comments", auth, (req, res) => {
  const task = findTaskOr404(req, res);
  if (!task) return;
  const text = (req.body && req.body.text || "").trim();
  if (!text) return res.status(400).json({ error: "Comment text is required" });
  task.comments.push({ id: genId("cm"), author: req.user.id, text, date: new Date().toISOString() });
  task.activity.push({ text: `Comment added by ${req.user.name}`, date: new Date().toISOString() });
  save();
  res.json(task);
});

app.post("/api/tasks/:id/checklist", auth, (req, res) => {
  const task = findTaskOr404(req, res);
  if (!task) return;
  const text = (req.body && req.body.text || "").trim();
  if (!text) return res.status(400).json({ error: "Checklist text is required" });
  task.checklist.push({ id: genId("c"), text, done: false });
  save();
  res.json(task);
});

app.post("/api/tasks/:id/checklist/:itemId/toggle", auth, (req, res) => {
  const task = findTaskOr404(req, res);
  if (!task) return;
  const item = task.checklist.find((c) => c.id === req.params.itemId);
  if (!item) return res.status(404).json({ error: "Checklist item not found" });
  item.done = !item.done;
  save();
  res.json(task);
});

app.post("/api/reset", auth, (req, res) => {
  db.tasks = seedTasks(() => genId("t"));
  save();
  res.json({ ok: true });
});

// ---------- Users ----------
app.post("/api/users", auth, (req, res) => {
  const { name, role } = req.body || {};
  if (!name || !String(name).trim()) return res.status(400).json({ error: "Name is required" });
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
  };
  db.users.push(user);
  save();
  res.status(201).json({ user: publicUser(user) });
});

app.put("/api/users/:id", auth, (req, res) => {
  const user = db.users.find((u) => u.id === req.params.id);
  if (!user) return res.status(404).json({ error: "User not found" });
  const name = (req.body && req.body.name || "").trim();
  if (!name) return res.status(400).json({ error: "Name cannot be empty" });
  user.name = name;
  save();
  res.json(publicUser(user));
});

app.delete("/api/users/:id", auth, (req, res) => {
  const user = db.users.find((u) => u.id === req.params.id);
  if (!user) return res.status(404).json({ error: "User not found" });
  if (!user.custom) return res.status(400).json({ error: "Only added team members can be removed" });
  db.users = db.users.filter((u) => u.id !== req.params.id);
  delete db.sessions[req.params.id];
  Object.keys(db.sessions).forEach((token) => {
    if (db.sessions[token] === req.params.id) delete db.sessions[token];
  });
  save();
  res.status(204).end();
});

// ---------- Frontend ----------
app.use(express.static(PUBLIC_DIR));

app.listen(PORT, () => {
  console.log(`WorkFlow server running at http://localhost:${PORT}`);
  console.log(`On your network, teammates can reach it at http://<this-PC-IP>:${PORT}`);
});
