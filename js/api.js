/* ============================================================
   WorkFlow — API client (talks to server/index.js)
   ============================================================ */

const TOKEN_KEY = "workflow_auth_token";

function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}
function setToken(token) {
  localStorage.setItem(TOKEN_KEY, token);
}
function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}

async function apiCall(method, path, body) {
  const headers = { "Content-Type": "application/json" };
  const token = getToken();
  if (token) headers.Authorization = "Bearer " + token;

  let res;
  try {
    res = await fetch(path, { method, headers, body: body !== undefined ? JSON.stringify(body) : undefined });
  } catch (e) {
    throw new Error("Can't reach the server. Check your connection and try again.");
  }

  if (res.status === 401) {
    clearToken();
    showLoginScreen("Your session expired — please log in again.");
    throw new Error("Session expired");
  }
  if (res.status === 204) return null;

  let data = null;
  try {
    data = await res.json();
  } catch (e) {
    /* no body */
  }
  if (!res.ok) throw new Error((data && data.error) || "Request failed");
  return data;
}

async function apiGetLoginUsers() {
  const res = await fetch("/api/login-users");
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Couldn't load the team list");
  return data.users;
}

async function apiLogin(userId) {
  const res = await fetch("/api/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Login failed");
  return data;
}
