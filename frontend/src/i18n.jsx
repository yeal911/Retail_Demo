import React, { createContext, useContext, useState, useCallback } from "react";

const translations = {
  en: {
    // App
    appName: "AI Retail Copilot",
    appSubtitle: "Smart Retail Management",

    // Login
    loginTitle: "AI Retail Copilot",
    loginSubtitle: "Smart Retail Management System",
    username: "Username",
    password: "Password",
    login: "Sign In",
    loginHint: "Test: admin / admin | huawei / pass1 | telcel / pass2 | bimbo / pass3",
    loginError: "Invalid username or password",
    loginFailed: "Login failed",

    // Dashboard
    currentTenant: "Current Tenant",
    admin: "Admin",
    logout: "Sign Out",
    dataOverview: "Overview",
    storeManagement: "Stores",

    // KPI
    totalRevenue: "Total Revenue",
    totalOrders: "Total Orders",
    activeStores: "Active Stores",
    avgTicket: "Avg. Ticket",
    last30Days: "Last 30 days",
    operating: "Operating",
    revenuePerOrder: "Revenue / Orders",

    // Charts
    revenueTrend: "Revenue Trend",
    storeComparison: "Store Comparison",
    revenue: "Revenue",
    orders: "Orders",

    // Store Table
    storeList: "Store List",
    storeName: "Store Name",
    city: "City",
    manager: "Manager",
    status: "Status",
    statusActive: "Active",
    statusInactive: "Inactive",
    revenue30d: "30d Revenue",
    orders30d: "30d Orders",
    avgTicketCol: "Avg. Ticket",

    // Chat
    aiAssistant: "AI Assistant",
    thinking: "Thinking...",
    inputPlaceholder: "Ask a question or give a command...",
    executeAction: "Action",
    welcomeMessage: "Hello! I'm your AI retail assistant. I can analyze data or execute operations.\n\nTry asking:\n• Which store has the highest revenue?\n• What's the sales trend for the last 7 days?\n• Deactivate a store",
    actionSuccess: "Action completed",

    // Session
    sessionExpired: "Session expired, please sign in again",

    // LLM Logs
    llmLogs: "AI Call Logs",
    llmType: "Type",
    llmModel: "Model",
    llmDuration: "Duration",
    llmInput: "Input",
    llmOutput: "Output",
    llmTime: "Time",
    llmMs: "ms",
    llmNoLogs: "No AI calls recorded yet",

    // MCP Logs
    mcpLogs: "Store Operation Logs",
    mcpTool: "Tool",
    mcpParams: "Parameters",
    mcpResult: "Result",
    mcpTime: "Time",
    mcpNoLogs: "No operations recorded yet",

    // Insights
    aiInsights: "AI Insights",
    insightsLoading: "Analyzing data...",

    // Store Table extras
    salesTarget: "Sales Target",
    statusUpdated: "Status updated",
    statusUpdateFailed: "Failed to update status",
    targetUpdated: "Target updated",
    targetUpdateFailed: "Failed to update target",

    // Notifications
    notifications: "Notifications",
    noNotifications: "No notifications",

    // Agent result types
    reportTitle: "Operations Report",
    reportSummary: "Summary",
    reportBestStores: "Best Performing",
    reportRiskStores: "Risk Stores",
    reportRecommendations: "Recommendations",
    batchResult: "Batch Operation Result",
    batchCount: "stores affected",
    queryResult: "Query Result",
    suggestionsTitle: "Actionable Suggestions",
    suggestionExecute: "Execute",
    suggestionImpact: "Impact",

    // Menu categories
    businessManagement: "Business Management",
    storeOps: "Store Ops",
    productSales: "Product & Sales",
    analytics: "Analytics",
    systemManagement: "System",
    inventoryManagement: "Inventory",
    orderDate: "Date",
    filterByStore: "Store",
    filterByProduct: "Product",
    filterByDate: "Date Range",
    storeSummary: "Store Summary",
    totalStores: "Total Stores",
    inactiveStores: "Inactive",
    avgRevenue: "Avg. Revenue",
    avgOrders: "Avg. Orders",

    // Chart views
    revenueTrendView: "Revenue Trend",
    revenueCompareView: "Revenue Compare",
    ordersCompareView: "Orders Compare",
    avgTicketCompareView: "Avg Ticket Compare",
    selectStores: "Select Stores",
    allStores: "All Stores",

    // AI Config
    aiConfig: "AI Configuration",
    tenantManagement: "Tenant Management",
    tenantName: "Tenant Name",
    storeCount: "Stores",
    userCount: "Users",
    productManagement: "Products",
    orderManagement: "Orders",
    productList: "Product List",
    inventoryView: "Inventory",
    orderList: "Order List",
    orderDetail: "Order Detail",
    productName: "Product",
    category: "Category",
    price: "Price",
    cost: "Cost",
    margin: "Margin",
    quantity: "Qty",
    unitPrice: "Unit Price",
    subtotal: "Subtotal",
    total: "Total",
    paymentMethod: "Payment",
    items: "Items",
    viewDetail: "Detail",
    lowStock: "Low",
    inStock: "OK",
    outOfStock: "Out",
    totalQuantity: "Total Qty",
    startDate: "Start",
    endDate: "End",
    llmApiUrl: "API URL",
    modelName: "Model Name",
    apiKey: "API Key",
    save: "Save",
    configSaved: "Configuration saved",
    configSaveFailed: "Failed to save configuration",
  },
  es: {
    // App
    appName: "AI Retail Copilot",
    appSubtitle: "Gestión Inteligente de Retail",

    // Login
    loginTitle: "AI Retail Copilot",
    loginSubtitle: "Sistema de Gestión Inteligente de Retail",
    username: "Usuario",
    password: "Contraseña",
    login: "Iniciar Sesión",
    loginHint: "Prueba: admin / admin | huawei / pass1 | telcel / pass2 | bimbo / pass3",
    loginError: "Usuario o contraseña incorrectos",
    loginFailed: "Error al iniciar sesión",

    // Dashboard
    currentTenant: "Tenant Actual",
    admin: "Admin",
    logout: "Cerrar Sesión",
    dataOverview: "Resumen",
    storeManagement: "Tiendas",

    // KPI
    totalRevenue: "Ingresos Totales",
    totalOrders: "Pedidos Totales",
    activeStores: "Tiendas Activas",
    avgTicket: "Ticket Prom.",
    last30Days: "Últimos 30 días",
    operating: "Operando",
    revenuePerOrder: "Ingresos / Pedidos",

    // Charts
    revenueTrend: "Tendencia de Ingresos",
    storeComparison: "Comparación de Tiendas",
    revenue: "Ingresos",
    orders: "Pedidos",

    // Store Table
    storeList: "Lista de Tiendas",
    storeName: "Nombre de Tienda",
    city: "Ciudad",
    manager: "Gerente",
    status: "Estado",
    statusActive: "Activo",
    statusInactive: "Inactivo",
    revenue30d: "Ingresos 30d",
    orders30d: "Pedidos 30d",
    avgTicketCol: "Ticket Prom.",

    // Chat
    aiAssistant: "Asistente IA",
    thinking: "Pensando...",
    inputPlaceholder: "Haz una pregunta o da una instrucción...",
    executeAction: "Acción",
    welcomeMessage: "¡Hola! Soy tu asistente IA de retail. Puedo analizar datos o ejecutar operaciones.\n\nPrueba preguntar:\n• ¿Qué tienda tiene mayores ingresos?\n• ¿Cuál es la tendencia de ventas de los últimos 7 días?\n• Desactivar una tienda",
    actionSuccess: "Acción completada",

    // Session
    sessionExpired: "Sesión expirada, por favor inicia sesión de nuevo",

    // LLM Logs
    llmLogs: "Registros de Llamadas IA",
    llmType: "Tipo",
    llmModel: "Modelo",
    llmDuration: "Duración",
    llmInput: "Entrada",
    llmOutput: "Salida",
    llmTime: "Hora",
    llmMs: "ms",
    llmNoLogs: "Aún no hay llamadas IA registradas",

    // MCP Logs
    mcpLogs: "Registros de Operaciones",
    mcpTool: "Herramienta",
    mcpParams: "Parámetros",
    mcpResult: "Resultado",
    mcpTime: "Hora",
    mcpNoLogs: "Aún no hay operaciones registradas",

    // Insights
    aiInsights: "Insights IA",
    insightsLoading: "Analizando datos...",

    // Store Table extras
    salesTarget: "Objetivo Ventas",
    statusUpdated: "Estado actualizado",
    statusUpdateFailed: "Error al actualizar estado",
    targetUpdated: "Objetivo actualizado",
    targetUpdateFailed: "Error al actualizar objetivo",

    // Notifications
    notifications: "Notificaciones",
    noNotifications: "Sin notificaciones",

    // Agent result types
    reportTitle: "Reporte de Operaciones",
    reportSummary: "Resumen",
    reportBestStores: "Mejor Rendimiento",
    reportRiskStores: "Tiendas en Riesgo",
    reportRecommendations: "Recomendaciones",
    batchResult: "Resultado de Operación por Lote",
    batchCount: "tiendas afectadas",
    queryResult: "Resultado de Consulta",
    suggestionsTitle: "Sugerencias Accionables",
    suggestionExecute: "Ejecutar",
    suggestionImpact: "Impacto",

    // Menu categories
    businessManagement: "Gestión de Negocio",
    storeOps: "Operaciones",
    productSales: "Producto y Ventas",
    analytics: "Análisis",
    systemManagement: "Sistema",
    inventoryManagement: "Inventario",
    orderDate: "Fecha",
    filterByStore: "Tienda",
    filterByProduct: "Producto",
    filterByDate: "Rango de Fechas",
    storeSummary: "Resumen de Tiendas",
    totalStores: "Total Tiendas",
    inactiveStores: "Inactivas",
    avgRevenue: "Ingresos Prom.",
    avgOrders: "Pedidos Prom.",

    // Chart views
    revenueTrendView: "Tendencia Ingresos",
    revenueCompareView: "Comparar Ingresos",
    ordersCompareView: "Comparar Pedidos",
    avgTicketCompareView: "Comparar Ticket Prom.",
    selectStores: "Seleccionar Tiendas",
    allStores: "Todas las Tiendas",

    // AI Config
    aiConfig: "Configuración IA",
    tenantManagement: "Gestión de Tenants",
    tenantName: "Nombre del Tenant",
    storeCount: "Tiendas",
    userCount: "Usuarios",
    productManagement: "Productos",
    orderManagement: "Pedidos",
    productList: "Lista Productos",
    inventoryView: "Inventario",
    orderList: "Lista Pedidos",
    orderDetail: "Detalle Pedido",
    productName: "Producto",
    category: "Categoría",
    price: "Precio",
    cost: "Costo",
    margin: "Margen",
    quantity: "Cant.",
    unitPrice: "Precio Unit.",
    subtotal: "Subtotal",
    total: "Total",
    paymentMethod: "Pago",
    items: "Items",
    viewDetail: "Detalle",
    lowStock: "Bajo",
    inStock: "OK",
    outOfStock: "Agotado",
    totalQuantity: "Cant. Total",
    startDate: "Inicio",
    endDate: "Fin",
    llmApiUrl: "URL de API",
    modelName: "Nombre del Modelo",
    apiKey: "Clave API",
    save: "Guardar",
    configSaved: "Configuración guardada",
    configSaveFailed: "Error al guardar configuración",
  },
};

const I18nContext = createContext();

export function I18nProvider({ children }) {
  const [locale, setLocale] = useState(() => {
    return localStorage.getItem("locale") || "es";
  });

  const switchLocale = useCallback((newLocale) => {
    setLocale(newLocale);
    localStorage.setItem("locale", newLocale);
  }, []);

  const t = useCallback(
    (key) => {
      return translations[locale]?.[key] || translations.en[key] || key;
    },
    [locale]
  );

  return (
    <I18nContext.Provider value={{ locale, switchLocale, t }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  return useContext(I18nContext);
}
