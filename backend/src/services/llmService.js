import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const LLM_API_URL = process.env.LLM_API_URL;
const LLM_API_KEY = process.env.LLM_API_KEY;
const MODEL_NAME = process.env.MODEL_NAME || "deepseek-chat";

// ─── LLM API Call (supports Function Calling) ────────────────────

async function callLLM({ messages, tools, type, tenantId }) {
  if (!LLM_API_URL || !LLM_API_KEY || LLM_API_KEY === "your_key") {
    const fallback = "LLM not configured. Please set LLM_API_URL and LLM_API_KEY in backend/.env.";
    await prisma.llmLog.create({ data: { type, input: JSON.stringify(messages), output: fallback, model: MODEL_NAME, duration: 0, tenantId: tenantId || null } });
    return { content: fallback, toolCalls: [] };
  }

  const body = { model: MODEL_NAME, messages, temperature: 0.1, max_tokens: 2048 };
  if (tools?.length) body.tools = tools;

  const startTime = Date.now();
  try {
    const response = await fetch(LLM_API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${LLM_API_KEY}` },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("LLM API error:", response.status, errText);
      const errMsg = `LLM request failed (${response.status}). Check API config.`;
      const duration = Date.now() - startTime;
      await prisma.llmLog.create({ data: { type, input: JSON.stringify(messages), output: errMsg, model: MODEL_NAME, duration, tenantId: tenantId || null } });
      return { content: errMsg, toolCalls: [] };
    }

    const data = await response.json();
    const choice = data.choices?.[0]?.message;
    const content = choice?.content || "";
    const toolCalls = choice?.tool_calls || [];
    const duration = Date.now() - startTime;

    // Log: include tool_calls info for debugging
    const logOutput = toolCalls.length > 0
      ? `[tool_calls: ${toolCalls.map((tc) => tc.function.name).join(", ")}] ${content}`
      : content;
    await prisma.llmLog.create({ data: { type, input: JSON.stringify(messages), output: logOutput, model: MODEL_NAME, duration, tenantId: tenantId || null } });

    return { content, toolCalls };
  } catch (error) {
    console.error("LLM call error:", error);
    const errMsg = "LLM call failed. Check network and API config.";
    const duration = Date.now() - startTime;
    await prisma.llmLog.create({ data: { type, input: JSON.stringify(messages), output: errMsg, model: MODEL_NAME, duration, tenantId: tenantId || null } });
    return { content: errMsg, toolCalls: [] };
  }
}

// ─── JSON Extraction (fallback for text responses) ────────────────

function extractJSON(text) {
  if (!text) return null;
  let jsonStr = text;
  const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (codeBlockMatch) jsonStr = codeBlockMatch[1].trim();
  try { return JSON.parse(jsonStr); } catch {}
  const jsonMatch = jsonStr.match(/\{[\s\S]*\}/);
  if (jsonMatch) try { return JSON.parse(jsonMatch[0]); } catch {}
  return null;
}

// ─── MCP Tool Definitions (Function Calling Schema) ──────────────

const mcpToolSchemas = [
  {
    type: "function",
    function: {
      name: "updateStoreStatus",
      description: "Change store operating status to active or inactive",
      parameters: {
        type: "object",
        properties: {
          storeId: { type: "string", description: "Store ID from the Store Data" },
          status: { type: "string", enum: ["active", "inactive"], description: "New status" },
        },
        required: ["storeId", "status"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "setSalesTarget",
      description: "Set monthly sales target for a store",
      parameters: {
        type: "object",
        properties: {
          storeId: { type: "string", description: "Store ID" },
          target: { type: "number", description: "Monthly sales target amount" },
        },
        required: ["storeId", "target"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "adjustPricing",
      description: "Adjust the price of a product",
      parameters: {
        type: "object",
        properties: {
          productId: { type: "string", description: "Product ID from the Product Catalog" },
          newPrice: { type: "number", description: "New price for the product" },
        },
        required: ["productId", "newPrice"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "transferInventory",
      description: "Transfer inventory quantity of a product from one store to another. Check Inventory Status first to ensure source store has enough stock.",
      parameters: {
        type: "object",
        properties: {
          productId: { type: "string", description: "Product ID" },
          fromStoreId: { type: "string", description: "Source store ID (where inventory comes from)" },
          toStoreId: { type: "string", description: "Destination store ID (where inventory goes to)" },
          quantity: { type: "number", description: "Number of units to transfer" },
        },
        required: ["productId", "fromStoreId", "toStoreId", "quantity"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "restockProduct",
      description: "Restock a product at a store by adding quantity",
      parameters: {
        type: "object",
        properties: {
          productId: { type: "string", description: "Product ID" },
          storeId: { type: "string", description: "Store ID" },
          quantity: { type: "number", description: "Number of units to add" },
        },
        required: ["productId", "storeId", "quantity"],
      },
    },
  },
  // ── Data Query Tools (on-demand, keep prompt small) ──
  {
    type: "function",
    function: {
      name: "getStoreSales",
      description: "Get daily sales history for a store. Use this when you need sales trends, revenue details, or daily breakdown.",
      parameters: {
        type: "object",
        properties: {
          storeId: { type: "string", description: "Store ID" },
          days: { type: "number", description: "Number of recent days (default 7, max 30)" },
        },
        required: ["storeId"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "getInventoryStatus",
      description: "Get inventory details for a store or product. Use this to check stock levels, find low-stock items, or verify availability before transfer.",
      parameters: {
        type: "object",
        properties: {
          storeId: { type: "string", description: "Store ID (optional, omit for all stores)" },
          productId: { type: "string", description: "Product ID (optional, omit for all products)" },
          lowStockOnly: { type: "boolean", description: "If true, only return items at or below reorder level" },
        },
        required: [],
      },
    },
  },
];

// ─── Tool Execution + ID Validation ──────────────────────────────

async function executeTool(toolName, params, tenantId, data) {
  const { stores, products } = normalizeData(data);

  // ID Validation
  const validateId = (id, collection, name) => {
    if (!id) return `${name} is required`;
    if (collection && !collection.some((item) => item.id === id)) return `${name} "${id}" not found in data`;
    return null;
  };

  switch (toolName) {
    case "updateStoreStatus": {
      const err = validateId(params.storeId, stores, "storeId");
      if (err) return { success: false, message: err };
      const { updateStoreStatus } = await import("../mcp/tools.js");
      return await updateStoreStatus(params.storeId, params.status, tenantId);
    }
    case "setSalesTarget": {
      const err = validateId(params.storeId, stores, "storeId");
      if (err) return { success: false, message: err };
      const { setSalesTarget } = await import("../mcp/tools.js");
      return await setSalesTarget(params.storeId, params.target, tenantId);
    }
    case "adjustPricing": {
      const err = validateId(params.productId, products, "productId");
      if (err) return { success: false, message: err };
      const { adjustPricing } = await import("../mcp/tools.js");
      return await adjustPricing(params.productId, params.newPrice, tenantId);
    }
    case "transferInventory": {
      const err1 = validateId(params.productId, products, "productId");
      if (err1) return { success: false, message: err1 };
      const err2 = validateId(params.fromStoreId, stores, "fromStoreId");
      if (err2) return { success: false, message: err2 };
      const err3 = validateId(params.toStoreId, stores, "toStoreId");
      if (err3) return { success: false, message: err3 };
      const { transferInventory } = await import("../mcp/tools.js");
      return await transferInventory(params.productId, params.fromStoreId, params.toStoreId, params.quantity, tenantId);
    }
    case "restockProduct": {
      const err1 = validateId(params.productId, products, "productId");
      if (err1) return { success: false, message: err1 };
      const err2 = validateId(params.storeId, stores, "storeId");
      if (err2) return { success: false, message: err2 };
      const { restockProduct } = await import("../mcp/tools.js");
      return await restockProduct(params.productId, params.storeId, params.quantity, tenantId);
    }
    // ── Data Query Tools (on-demand) ──
    case "getStoreSales": {
      const err = validateId(params.storeId, stores, "storeId");
      if (err) return { success: false, message: err };
      const days = Math.min(params.days || 7, 30);
      const store = stores.find((s) => s.id === params.storeId);
      const sales = store?.sales?.slice(-days) || [];
      return { success: true, data: sales.map((s) => ({ date: s.date, revenue: s.revenue, orders: s.orders, avgTicket: s.avgTicket })) };
    }
    case "getInventoryStatus": {
      const { inventory } = normalizeData(data);
      let filtered = inventory;
      if (params.storeId) filtered = filtered.filter((i) => i.storeId === params.storeId);
      if (params.productId) filtered = filtered.filter((i) => i.productId === params.productId);
      if (params.lowStockOnly) filtered = filtered.filter((i) => i.quantity <= i.reorderLevel);
      return { success: true, data: filtered.map((i) => ({ storeId: i.storeId, storeName: i.storeName || "", productId: i.productId, productName: i.productName || "", quantity: i.quantity, reorderLevel: i.reorderLevel, lowStock: i.quantity <= i.reorderLevel })) };
    }
    default:
      return { success: false, message: `Unknown tool: ${toolName}` };
  }
}

// ─── Normalize Data (exported for execute endpoint) ──────────────

function normalizeData(data) {
  if (Array.isArray(data)) return { stores: data, products: [], inventory: [] };
  return { stores: data.stores || [], products: data.products || [], inventory: data.inventory || [] };
}

// Export helpers for the /llm/execute endpoint
export { normalizeData as _normalizeData, executeTool as _executeTool };

// ─── Data Compactor (reduce prompt size for LLM) ────────────────

function compactData(data) {
  const { stores, products, inventory } = normalizeData(data);

  // Stores: keep only essential fields, drop last7Days (LLM can compute from sales)
  const compactStores = stores.map((s) => ({
    id: s.id, name: s.name, city: s.city, status: s.status,
    totalRevenue: s.totalRevenue, totalOrders: s.totalOrders,
  }));

  // Products: keep essential fields
  const compactProducts = products.map((p) => ({
    id: p.id, name: p.name, sku: p.sku, price: p.price, cost: p.cost,
    category: p.category?.name || p.categoryId,
  }));

  // Inventory: only low-stock items (most relevant for LLM actions)
  const compactInventory = inventory
    .filter((i) => i.lowStock || i.quantity <= (i.reorderLevel * 2))
    .map((i) => ({
      storeId: i.storeId, storeName: i.storeName || "",
      productId: i.productId, productName: i.productName || "",
      quantity: i.quantity, reorderLevel: i.reorderLevel, lowStock: i.lowStock,
    }));

  return { stores: compactStores, products: compactProducts, inventory: compactInventory };
}

// ─── Prompts (EN / ES) ────────────────────────────────────────────

const prompts = {
  en: {
    insights: (data) => `You are a retail analytics engine. Analyze the store data below and identify anomalies, risks, or notable patterns.

## Store Data
${JSON.stringify(data, null, 2)}

## Instructions
Return a JSON array of insights. Each insight must have:
- "description": a clear business explanation of the issue
- "severity": "high", "medium", or "low"
- "storeId": the relevant store ID (if applicable)

Look for: significant revenue drops, unusual order volatility, stores underperforming vs average, weekend vs weekday anomalies, low stock risks.

Return ONLY the JSON array, no other text:
[{"description":"...","severity":"high","storeId":"..."},...]`,

    agent: (data) => {
      const compact = compactData(data);
      return `You are an intelligent retail operations Agent. You have access to tools that can query data, modify store status, set sales targets, adjust product pricing, transfer inventory, and restock products.

## Current Store Data (summary)
${JSON.stringify(compact.stores)}

## Product Catalog
${compact.products.length > 0 ? JSON.stringify(compact.products) : "(No product data available)"}

Note: The Store Data above already includes totalRevenue and totalOrders (30-day aggregates). Use these directly for ranking, comparison, or "top/bottom" questions — do NOT call getStoreSales for aggregate queries.
- getStoreSales: only use when you need daily breakdowns or trends (e.g., "show daily revenue trend for the last week")
- getInventoryStatus: use when you need stock levels, low-stock items, or to verify availability before transfer/restock

## Instructions
- Prefer using data already in the prompt over making tool calls. Only call tools when the existing data is genuinely insufficient.
- Use the provided tools to execute operations when the user requests them
- For batch operations (e.g., "close all low stores"), call the tool multiple times for each matching store
- For queries and analysis that don't require tool execution, respond with structured JSON
- Always use actual IDs from the data above
- When adjusting prices, find the product ID from the Product Catalog
- When transferring inventory, check Inventory Status to ensure source has enough stock
- When restocking, check Inventory Status for lowStock items

## Response Format (for non-tool responses, return JSON in your text)

IMPORTANT: Choose the response type based on the question complexity:
- Simple/focused questions (e.g., "which store has the highest revenue?", "what is the lowest margin?") → use "text" type with a concise answer
- User explicitly asks to "show", "list", "display", or "compare" multiple items → use "query" type with a table
- User asks for a report or comprehensive analysis → use "report" type
- User asks for optimization suggestions → use "suggestions" type

### Plain Text (default for simple questions - BE CONCISE)
{"type":"text","content":"your concise answer with specific numbers"}

### Data Query Result (only when user explicitly asks to see a table/list)
{"type":"query","columns":["col1","col2"],"rows":[[val1,val2],...],"summary":"brief description"}

### Structured Report (for comprehensive analysis)
{"type":"report","summary":"overall summary","bestStores":[{"name":"...","reason":"..."}],"riskStores":[{"name":"...","reason":"..."}],"recommendations":["..."]}

### Actionable Suggestions (for optimization recommendations)
{"type":"suggestions","items":[{"title":"...","reason":"...","tool":"toolName","params":{...},"impact":"expected impact"}]}`;
    },
  },
  es: {
    insights: (data) => `Eres un motor de análisis retail. Analiza los datos de tiendas abajo e identifica anomalías, riesgos o patrones notables.

## Datos de Tiendas
${JSON.stringify(data, null, 2)}

## Instrucciones
Retorna un arreglo JSON de insights. Cada insight debe tener:
- "description": una explicación de negocio clara del problema
- "severity": "high", "medium" o "low"
- "storeId": el ID de tienda relevante (si aplica)

Buscar: caídas significativas de ingresos, volatilidad inusual de pedidos, tiendas con rendimiento inferior al promedio, anomalías fin de semana vs día de semana, riesgos de stock bajo.

Retorna SOLO el arreglo JSON, sin otro texto:
[{"description":"...","severity":"high","storeId":"..."},...]`,

    agent: (data) => {
      const compact = compactData(data);
      return `Eres un Agente inteligente de operaciones retail. Tienes acceso a herramientas que pueden consultar datos, modificar estado de tiendas, establecer objetivos de ventas, ajustar precios, transferir inventario y reabastecer productos.

## Datos Actuales de Tiendas (resumen)
${JSON.stringify(compact.stores)}

## Catálogo de Productos
${compact.products.length > 0 ? JSON.stringify(compact.products) : "(Datos de productos no disponibles)"}

Nota: Los Datos de Tiendas arriba ya incluyen totalRevenue y totalOrders (agregados de 30 días). Úsalos directamente para preguntas de ranking, comparación o "mejor/peor" — NO llames getStoreSales para consultas agregadas.
- getStoreSales: solo úsalo cuando necesites desglose diario o tendencias (ej., "muestra la tendencia de ingresos diarios de la última semana")
- getInventoryStatus: úsalo cuando necesites niveles de stock, items con stock bajo, o verificar disponibilidad antes de transferir/reabastecer

## Instrucciones
- Prefiere usar los datos ya disponibles en el prompt sobre hacer llamadas a herramientas. Solo llama herramientas cuando los datos existentes sean genuinamente insuficientes.
- Usa las herramientas proporcionadas para ejecutar operaciones cuando el usuario las solicite
- Para operaciones por lote (ej. "cerrar tiendas de bajo rendimiento"), llama la herramienta múltiples veces para cada tienda que coincida
- Para consultas y análisis que no requieren ejecución de herramientas, responde con JSON estructurado
- Siempre usa IDs reales de los datos arriba
- Al ajustar precios, busca el ID de producto del Catálogo
- Al transferir inventario, verifica el Estado de Inventario para asegurar stock suficiente en origen
- Al reabastecer, verifica el Estado de Inventario para items con lowStock: true

## Formato de Respuesta (para respuestas sin herramientas, retorna JSON en tu texto)

IMPORTANTE: Elige el tipo de respuesta según la complejidad de la pregunta:
- Preguntas simples/enfocadas (ej., "¿qué tienda tiene mayores ingresos?", "¿cuál es el margen más bajo?") → usa tipo "text" con respuesta concisa
- Usuario pide explícitamente "mostrar", "listar", "desplegar" o "comparar" múltiples items → usa tipo "query" con tabla
- Usuario pide un reporte o análisis completo → usa tipo "report"
- Usuario pide sugerencias de optimización → usa tipo "suggestions"

### Texto Plano (por defecto para preguntas simples - SÉ CONCISO)
{"type":"text","content":"tu respuesta concisa con números específicos"}

### Resultado de Consulta (solo cuando el usuario pide ver una tabla/lista)
{"type":"query","columns":["col1","col2"],"rows":[[val1,val2],...],"summary":"breve descripción"}

### Reporte Estructurado (para análisis completo)
{"type":"report","summary":"resumen general","bestStores":[{"name":"...","reason":"..."}],"riskStores":[{"name":"...","reason":"..."}],"recommendations":["..."]}

### Sugerencias Accionables (para recomendaciones de optimización)
{"type":"suggestions","items":[{"title":"...","reason":"...","tool":"nombreHerramienta","params":{...},"impact":"impacto esperado"}]}`;
    },
  },
};

// ─── Tool Description Generator (for confirmation UI, bilingual) ──

function describeTool(toolName, params, data, locale = "en") {
  const { stores, products } = normalizeData(data);
  const storeName = (id) => stores.find((s) => s.id === id)?.name || id;
  const productName = (id) => products.find((p) => p.id === id)?.name || id;
  const isEn = locale === "en";

  switch (toolName) {
    case "updateStoreStatus":
      return isEn
        ? `Change store "${storeName(params.storeId)}" status to ${params.status}`
        : `Cambiar estado de tienda "${storeName(params.storeId)}" a ${params.status === "active" ? "activo" : "inactivo"}`;
    case "setSalesTarget":
      return isEn
        ? `Set sales target for store "${storeName(params.storeId)}" to $${Number(params.target).toLocaleString()}`
        : `Establecer objetivo de ventas para "${storeName(params.storeId)}" en $${Number(params.target).toLocaleString()}`;
    case "adjustPricing":
      return isEn
        ? `Adjust price of "${productName(params.productId)}" to $${Number(params.newPrice).toLocaleString()}`
        : `Ajustar precio de "${productName(params.productId)}" a $${Number(params.newPrice).toLocaleString()}`;
    case "transferInventory":
      return isEn
        ? `Transfer ${params.quantity} units of "${productName(params.productId)}" from "${storeName(params.fromStoreId)}" to "${storeName(params.toStoreId)}"`
        : `Transferir ${params.quantity} unidades de "${productName(params.productId)}" de "${storeName(params.fromStoreId)}" a "${storeName(params.toStoreId)}"`;
    case "restockProduct":
      return isEn
        ? `Restock "${productName(params.productId)}" at "${storeName(params.storeId)}" with ${params.quantity} units`
        : `Reabastecer "${productName(params.productId)}" en "${storeName(params.storeId)}" con ${params.quantity} unidades`;
    default:
      return `Execute ${toolName}(${JSON.stringify(params)})`;
  }
}

// ─── F1: Auto Insights ──────────────────────────────────────────

export async function generateInsights(data, locale = "en", tenantId) {
  const lang = locale === "es" ? "es" : "en";
  const prompt = prompts[lang].insights(data);
  const { content } = await callLLM({ messages: [{ role: "user", content: prompt }], type: "insights", tenantId });

  try {
    const parsed = extractJSON(content);
    if (Array.isArray(parsed)) return { type: "insights", items: parsed };
    if (parsed && Array.isArray(parsed.items)) return { type: "insights", items: parsed.items };
  } catch {}

  return { type: "insights", items: [] };
}

// ─── F2-F5: Agent with Function Calling ─────────────────────────

export async function agent(data, question, locale = "en", tenantId, history = []) {
  const lang = locale === "es" ? "es" : "en";
  const { stores: storesData } = normalizeData(data);
  const systemPrompt = prompts[lang].agent(data);

  // Build messages array: system context → conversation history → current question (last)
  // This ensures correct chronological order so the LLM can resolve pronouns like "it"
  const messages = [{ role: "system", content: systemPrompt }];

  // Add conversation history (previous turns) in chronological order
  for (const msg of history) {
    if (msg.role === "user" || msg.role === "assistant") {
      messages.push({ role: msg.role, content: msg.content });
    }
  }

  // Add current question as the last user message
  messages.push({ role: "user", content: question });
  const executedActions = [];  // Track all executed tool calls
  const MAX_TURNS = 5;        // Prevent infinite loops

  // ── Multi-turn tool calling loop ──
  for (let turn = 0; turn < MAX_TURNS; turn++) {
    const { content, toolCalls } = await callLLM({
      messages,
      tools: mcpToolSchemas,
      type: "agent",
      tenantId,
    });

    // No tool calls → LLM is done, parse the final response
    if (toolCalls.length === 0) {
      // If we executed actions, return the last action result
      if (executedActions.length > 0) {
        const lastAction = executedActions[executedActions.length - 1];
        // Single action
        if (executedActions.length === 1) {
          return { type: "action", tool: lastAction.tool, params: lastAction.params, result: lastAction.result };
        }
        // Multiple actions → batch result
        return { type: "batch", tool: lastAction.tool, count: executedActions.length, results: executedActions.map((a) => ({ storeId: a.params.storeId, storeName: a.storeName || "", result: a.result })) };
      }

      // No actions executed → parse text response as structured JSON
      const parsed = extractJSON(content);
      if (parsed && parsed.type) {
        switch (parsed.type) {
          case "report":
            return { type: "report", summary: parsed.summary, bestStores: parsed.bestStores || [], riskStores: parsed.riskStores || [], recommendations: parsed.recommendations || [] };
          case "query":
            return { type: "query", columns: parsed.columns || [], rows: parsed.rows || [], summary: parsed.summary || "" };
          case "suggestions":
            return { type: "suggestions", items: (parsed.items || []).map((item) => ({ title: item.title, reason: item.reason, tool: item.tool, params: item.params, impact: item.impact })) };
          case "text":
            return { type: "text", content: parsed.content || content };
          case "action": {
            // Fallback: LLM returned action as JSON instead of tool_call
            const toolResult = await executeTool(parsed.tool, parsed.params, tenantId, data);
            return { type: "action", tool: parsed.tool, params: parsed.params, result: toolResult };
          }
          case "batch": {
            const { tool, filter, actionParams } = parsed;
            const matchingStores = storesData.filter((s) => {
              const val = filter.field === "revenue" ? s.totalRevenue : filter.field === "orders" ? s.totalOrders : s[filter.field];
              switch (filter.op) {
                case "eq": return val === filter.value;
                case "lt": return val < filter.value;
                case "gt": return val > filter.value;
                case "lte": return val <= filter.value;
                case "gte": return val >= filter.value;
                default: return false;
              }
            });
            const results = [];
            for (const store of matchingStores) {
              const params = { ...actionParams, storeId: store.id };
              const result = await executeTool(tool, params, tenantId, data);
              results.push({ storeId: store.id, storeName: store.name, result });
            }
            return { type: "batch", tool, filter, count: results.length, results };
          }
          default:
            return { type: "text", content };
        }
      }

      // Not JSON → plain text
      return { type: "text", content };
    }

    // ── Tool calls found → Split into query (execute immediately) and mutation (confirm) ──
    const QUERY_TOOLS = new Set(["getStoreSales", "getInventoryStatus"]);
    const queryResults = [];   // Execute immediately
    const pendingActions = []; // Need confirmation

    // Add assistant message with tool_calls to conversation
    messages.push({
      role: "assistant",
      content: content || null,
      tool_calls: toolCalls,
    });

    for (const tc of toolCalls) {
      const toolName = tc.function.name;
      let params;
      try {
        params = JSON.parse(tc.function.arguments);
      } catch {
        params = {};
      }

      if (QUERY_TOOLS.has(toolName)) {
        // ── Query tool: execute immediately, add result to conversation ──
        const result = await executeTool(toolName, params, tenantId, data);
        messages.push({
          role: "tool",
          tool_call_id: tc.id,
          content: JSON.stringify(result),
        });
        queryResults.push({ tool: toolName, params, result });
      } else {
        // ── Mutation tool: collect for confirmation ──
        const description = describeTool(toolName, params, data, locale);
        const storeName = params.storeId ? storesData.find((s) => s.id === params.storeId)?.name : "";
        pendingActions.push({ tool: toolName, params, description, storeName, toolCallId: tc.id });
        // Add a placeholder tool result so the conversation stays valid for the next LLM turn
        messages.push({
          role: "tool",
          tool_call_id: tc.id,
          content: JSON.stringify({ pending: true, description }),
        });
      }
    }

    // If there are mutation tools → return confirmation (query results already executed)
    if (pendingActions.length > 0) {
      if (pendingActions.length === 1) {
        const action = pendingActions[0];
        return { type: "confirmation", tool: action.tool, params: action.params, description: action.description };
      }
      return {
        type: "confirmation",
        tool: pendingActions[0].tool,
        description: pendingActions.map((a) => a.description).join("\n"),
        actions: pendingActions.map((a) => ({ tool: a.tool, params: a.params, description: a.description })),
      };
    }

    // Only query tools were called → continue loop so LLM can process the results and answer
    // (The query results are already in the conversation, LLM will see them next turn)
    continue;
  }

  // Max turns reached → return what we have
  if (executedActions.length > 0) {
    const lastAction = executedActions[executedActions.length - 1];
    if (executedActions.length === 1) {
      return { type: "action", tool: lastAction.tool, params: lastAction.params, result: lastAction.result };
    }
    return { type: "batch", tool: lastAction.tool, count: executedActions.length, results: executedActions.map((a) => ({ storeId: a.params.storeId, storeName: a.storeName || "", result: a.result })) };
  }

  return { type: "text", content: "Operation completed but took too many steps. Please try again." };
}

// ─── Legacy analyze function ─────────────────────────────────────

export async function analyze(data, question, locale = "en", tenantId) {
  const lang = locale === "es" ? "es" : "en";
  const systemPrompt = prompts[lang].agent(data);
  const { content } = await callLLM({ messages: [{ role: "system", content: systemPrompt }, { role: "user", content: question }], type: "query", tenantId });
  return content;
}
