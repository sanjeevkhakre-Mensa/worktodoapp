# WorkFlow — Team Task Manager

A shared task manager for the team: everyone logs in, tasks and their status are shared
and can be assigned to anyone. One person runs the server; everyone else just opens it
in a browser.

## Running it (one-time, on whoever's PC will host it)

Requires [Node.js](https://nodejs.org) (any recent version) installed once.

```bash
cd task-manager/server
npm install
npm start
```

Or just double-click `server/start.bat` after the first `npm install`.

You'll see:

```
WorkFlow server running at http://localhost:4100
On your network, teammates can reach it at http://<this-PC-IP>:4100
```

Leave that window open — the app only works while it's running. Find "this PC's IP"
with `ipconfig` (look for "IPv4 Address" under your active network adapter), then share
`http://<that-IP>:4100` with the team. Everyone must be on the same network (office
Wi-Fi/LAN or VPN) to reach it this way.

If teammates on other machines can't connect, Windows Firewall may be blocking incoming
connections to Node the first time — allow it when prompted (or allow port 4100 for
Node.js in Windows Defender Firewall settings).

## Logging in

There's no password — the login screen shows the team as a list of names, and picking
one logs in as that person. This is deliberately low-friction for a small trusted team;
it also means anyone who can reach the server can act as anyone on it (see Security
below).

Six starter accounts exist: Sanjeev Khakre, Priya Nair, Rahul Verma, Ananya Iyer, Karan
Mehta, Divya Shah. Add more people anytime from **Settings → Team Members → + Add
Member** — they show up on the login screen immediately, nothing else to set up.

## What's shared vs. per-person

- **Shared for everyone**: tasks, assignments, status, comments, checklists, team roster.
- **Per-browser only**: light/dark theme preference (not synced, not meant to be).

## Data storage

All shared data lives in `server/data/db.json` — back that file up if you care about
the data. There's no cloud sync; if the hosting PC is off, nobody can use the app.

## Security

There is no password and no per-person access control. Anyone who can reach the
server's URL sees the full picker and can log in as anyone on the list, including
adding/removing team members and resetting all tasks. That's an acceptable trade-off on
a trusted office LAN; it is **not** something to expose on the open internet as-is.

## Limitations / not built

- No real-time push; other people's changes appear within ~8 seconds (polling), not
  instantly.
- Not packaged as a Windows `.exe` — it's a web app you keep open in a browser tab. If
  you want a proper installable desktop app (Electron) wrapping this later, that's a
  separate, larger step.
