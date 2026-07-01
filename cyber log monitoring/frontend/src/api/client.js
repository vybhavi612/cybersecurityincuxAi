import axios from "axios";

export const API_BASE = "http://localhost:8000";
export const WS_URL = "ws://localhost:8000/ws/dashboard";

const client = axios.create({ baseURL: API_BASE });

client.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export function getStoredUser() {
  const raw = localStorage.getItem("user");
  return raw ? JSON.parse(raw) : null;
}

export async function login(username, password) {
  const { data } = await client.post("/api/auth/login", { username, password });
  localStorage.setItem("token", data.access_token);
  localStorage.setItem("user", JSON.stringify(data.user));
  return data.user;
}

export function logout() {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
}

export const api = {
  dashboardStats: () => client.get("/api/dashboard/stats").then((r) => r.data),
  hourlyHeatmap: () => client.get("/api/dashboard/heatmap/hourly").then((r) => r.data),
  geoDistribution: () => client.get("/api/dashboard/geo").then((r) => r.data),
  alertsByRegion: () => client.get("/api/dashboard/alerts-by-region").then((r) => r.data),

  searchLogs: (params) => client.get("/api/logs/search", { params }).then((r) => r.data),
  sessionTimeline: (sessionId) =>
    client.get(`/api/logs/session/${sessionId}`).then((r) => r.data),
  verifyChain: () => client.get("/api/logs/verify-chain").then((r) => r.data),

  listAlerts: (params) => client.get("/api/alerts", { params }).then((r) => r.data),
  updateAlert: (id, payload) => client.patch(`/api/alerts/${id}`, payload).then((r) => r.data),

  simulate: (scenario, payload) =>
    client.post(`/api/simulate/${scenario}`, payload).then((r) => r.data),
};

export default client;
