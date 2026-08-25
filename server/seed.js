// Default seed data for a fresh install — six starter accounts (username / role / color)
// and a spread of demo tasks (today / overdue / upcoming / completed) so the app isn't
// empty on first login. Logging in is just picking your name — no password.

const SEED_USERS = [
  { id: "u1", username: "sanjeev", name: "Sanjeev Khakre", role: "Sales Manager", color: "#2563eb" },
  { id: "u2", username: "priya", name: "Priya Nair", role: "Business Analyst", color: "#7c3aed" },
  { id: "u3", username: "rahul", name: "Rahul Verma", role: "Regional Sales Officer", color: "#16a34a" },
  { id: "u4", username: "ananya", name: "Ananya Iyer", role: "Marketing Executive", color: "#d97706" },
  { id: "u5", username: "karan", name: "Karan Mehta", role: "Operations Lead", color: "#dc2626" },
  { id: "u6", username: "divya", name: "Divya Shah", role: "Distributor Coordinator", color: "#0891b2" },
];

const PROJECTS = ["p1", "p2", "p3", "p4", "p5", "p6"]; // p1 Sales Analytics, p2 Business Review, p3 Reporting, p4 Marketing, p5 Operations, p6 Distributor Ops

function isoDateOffset(offsetDays) {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + offsetDays);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function seedTasks(genId) {
  const now = new Date().toISOString();
  const t = (overrides) =>
    Object.assign(
      {
        id: genId(),
        description: "",
        dueTime: "",
        endTime: "",
        priority: "Medium",
        status: "Todo",
        project: "p1",
        assignee: "u1",
        createdBy: "u1",
        reminder: false,
        recurring: "None",
        attachments: [],
        checklist: [],
        comments: [],
        activity: [{ text: "Task created", date: now }],
        createdAt: now,
      },
      overrides
    );

  return [
    t({
      title: "Prepare Monthly Sales Report",
      description: "Compile GMV, growth %, and channel-wise breakup for the sales review deck.",
      dueDate: isoDateOffset(0),
      dueTime: "09:00",
      endTime: "10:30",
      priority: "High",
      status: "In Progress",
      project: "p1",
      assignee: "u1",
      checklist: [
        { id: "c1", text: "Pull GMV data from dispatch tracker", done: true },
        { id: "c2", text: "Build channel-wise summary", done: true },
        { id: "c3", text: "Review with RSM", done: false },
      ],
    }),
    t({
      title: "Review Distributor Performance",
      description: "Quarterly review of top 10 distributors against target vs achievement.",
      dueDate: isoDateOffset(0),
      dueTime: "11:00",
      endTime: "12:00",
      priority: "Medium",
      status: "Completed",
      project: "p2",
      assignee: "u3",
    }),
    t({
      title: "Power BI Dashboard Update",
      description: "Refresh the Primary Sales dashboard with the new Zone derivation logic.",
      dueDate: isoDateOffset(0),
      dueTime: "14:00",
      endTime: "15:30",
      priority: "Medium",
      status: "Pending",
      project: "p3",
      assignee: "u1",
    }),
    t({
      title: "New Distributor Onboarding — Vikram SE",
      description: "Complete KYC, credit terms and system mapping for the new distributor.",
      dueDate: isoDateOffset(0),
      dueTime: "16:00",
      priority: "High",
      status: "Todo",
      project: "p6",
      assignee: "u6",
    }),
    t({
      title: "PJP Fix — Zone C route corrections",
      dueDate: isoDateOffset(-1),
      dueTime: "10:00",
      priority: "Urgent",
      status: "Todo",
      project: "p6",
      assignee: "u3",
    }),
    t({
      title: "Fazzli Return — reconcile short shipment",
      dueDate: isoDateOffset(-2),
      priority: "High",
      status: "Todo",
      project: "p5",
      assignee: "u5",
    }),
    t({
      title: "Flavor-wise last 5 month GMV — Supplement channel",
      dueDate: isoDateOffset(-1),
      priority: "Medium",
      status: "Todo",
      project: "p1",
      assignee: "u2",
    }),
    t({
      title: "R&R Automation — reward calc script",
      dueDate: isoDateOffset(3),
      priority: "Medium",
      status: "Todo",
      project: "p5",
      assignee: "u5",
    }),
    t({
      title: "Consolidate all reports into one Google Sheet",
      dueDate: isoDateOffset(2),
      priority: "Low",
      status: "Todo",
      project: "p3",
      assignee: "u2",
    }),
    t({
      title: "DSR Updation — field team compliance",
      dueDate: isoDateOffset(1),
      priority: "Medium",
      status: "In Progress",
      project: "p2",
      assignee: "u3",
    }),
    t({
      title: "Expense Tracker — closing",
      dueDate: isoDateOffset(5),
      priority: "Medium",
      status: "Todo",
      project: "p5",
      assignee: "u1",
    }),
    t({
      title: "Outlet Correction — duplicate outlet IDs",
      dueDate: isoDateOffset(4),
      priority: "Low",
      status: "Todo",
      project: "p6",
      assignee: "u6",
    }),
    t({
      title: "Product Image Update — new SKU catalogue",
      dueDate: isoDateOffset(6),
      priority: "Low",
      status: "Todo",
      project: "p4",
      assignee: "u4",
    }),
    t({
      title: "Team Sync — weekly standup",
      dueDate: isoDateOffset(0),
      dueTime: "18:00",
      priority: "Low",
      status: "Todo",
      project: "p2",
      assignee: "u1",
      recurring: "Weekly",
    }),
  ];
}

module.exports = { SEED_USERS, seedTasks };
