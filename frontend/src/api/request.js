import axios from "axios";

const API_BASE = "http://localhost:3000";

const api = axios.create({
  baseURL: API_BASE,
  timeout: 30000,
  headers: { "Content-Type": "application/json" },
});

export const login = (username, password) =>
  api.post("/api/login", { username, password });

export const getStores = (tenantId) =>
  api.get("/api/stores", { params: { tenantId } });

export const updateStoreStatus = (id, status) =>
  api.patch(`/api/stores/${id}/status`, { status });

export const setStoreTarget = (id, target) =>
  api.post(`/api/stores/${id}/target`, { target });

export const llmQuery = (data, question, tenantId) =>
  api.post("/api/llm/query", { data, question, tenantId });

export const llmAgent = (data, question, locale, tenantId) =>
  api.post("/api/llm/agent", { data, question, locale, tenantId });

export const llmInsights = (data, locale, tenantId) =>
  api.post("/api/llm/insights", { data, locale, tenantId });

export const getLlmLogs = (tenantId) =>
  api.get("/api/llm/logs", { params: { tenantId } });

export const deleteLlmLog = (id) =>
  api.delete(`/api/llm/logs/${id}`);

export const getMcpLogs = (tenantId) =>
  api.get("/api/mcp/logs", { params: { tenantId } });

export const deleteMcpLog = (id) =>
  api.delete(`/api/mcp/logs/${id}`);

export const getTenants = () =>
  api.get("/api/tenants");

export const getProducts = (tenantId) =>
  api.get("/api/products", { params: { tenantId } });

export const getCategories = (tenantId) =>
  api.get("/api/categories", { params: { tenantId } });

export const getOrders = (params) =>
  api.get("/api/orders", { params });

export const getInventory = (params) =>
  api.get("/api/inventory", { params });

export const getConfig = () =>
  api.get("/api/config");

export const updateConfig = (data) =>
  api.put("/api/config", data);

export default api;
