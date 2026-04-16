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
      name: "sendNotification",
      description: "Send a notification message to a store",
      parameters: {
        type: "object",
        properties: {
          storeId: { type: "string", description: "Store ID" },
          message: { type: "string", description: "Notification message content" },
        },
        required: ["storeId", "message"],
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
    case "sendNotification": {
      const err = validateId(params.storeId, stores, "storeId");
      if (err) return { success: false, message: err };
      const { sendNotification } = await import("../mcp/tools.js");
      return await sendNotification(params.storeId, params.message, tenantId);
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
    default:
      return { success: false, message: `Unknown tool: ${toolName}` };
  }
}

// ─── Normalize Data ──────────────────────────────────────────────

function normalizeData(data) {
  if (Array.isArray(data)) return { stores: data, products: [], inventory: [] };
  return { stores: data.stores || [], products: data.products || [], inventory: data.inventory || [] };
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

    agent: (data, question) => {
      const { stores, products, inventory } = normalizeData(data);
      return `You are an intelligent retail operations Agent. You have access to tools that can modify store status, set sales targets, send notifications, adjust product pricing, transfer inventory, and restock products.

## Current Store Data
${JSON.stringify(stores, null, 2)}

## Product Catalog
${products.length > 0 ? JSON.stringify(products, null, 2) : "(No product data available)"}

## Inventory Status
${inventory.length > 0 ? JSON.stringify(inventory, null, 2) : "(No inventory data available)"}

## Instructions
- Use the provided tools to execute operations when the user requests them
- For batch operations (e.g., "close all low stores"), call the tool multiple times for each matching store
- For queries and analysis that don't require tool execution, respond with structured JSON
- Always use actual IDs from the data above
- When adjusting prices, find the product ID from the Product Catalog
- When transferring inventory, check Inventory Status to ensure source has enough stock
- When restocking, check Inventory Status for lowStock items

## Response Format (for non-tool responses, return JSON in your text)
For analysis/reports that don't need tool execution, return one of these JSON formats:

### Structured Report
{"type":"report","summary":"overall summary","bestStores":[{"name":"...","reason":"..."}],"riskStores":[{"name":"...","reason":"..."}],"recommendations":["..."]}

### Data Query Result
{"type":"query","columns":["col1","col2"],"rows":[[val1,val2],...],"summary":"brief description"}

### Actionable Suggestions
{"type":"suggestions","items":[{"title":"...","reason":"...","tool":"toolName","params":{...},"impact":"expected impact"}]}

### Plain Text
{"type":"text","content":"your answer"}

## User Input
${question}`;
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

    agent: (data, question) => {
      const { stores, products, inventory } = normalizeData(data);
      return `Eres un Agente inteligente de operaciones retail. Tienes acceso a herramientas que pueden modificar estado de tiendas, establecer objetivos de ventas, enviar notificaciones, ajustar precios, transferir inventario y reabastecer productos.

## Datos Actuales de Tiendas
${JSON.stringify(stores, null, 2)}

## Catálogo de Productos
${products.length > 0 ? JSON.stringify(products, null, 2) : "(Datos de productos no disponibles)"}

## Estado de Inventario
${inventory.length > 0 ? JSON.stringify(inventory, null, 2) : "(Datos de inventario no disponibles)"}

## Instrucciones
- Usa las herramientas proporcionadas para ejecutar operaciones cuando el usuario las solicite
- Para operaciones por lote (ej. "cerrar tiendas de bajo rendimiento"), llama la herramienta múltiples veces para cada tienda que coincida
- Para consultas y análisis que no requieren ejecución de herramientas, responde con JSON estructurado
- Siempre usa IDs reales de los datos arriba
- Al ajustar precios, busca el ID de producto del Catálogo
- Al transferir inventario, verifica el Estado de Inventario para asegurar stock suficiente en origen
- Al reabastecer, verifica el Estado de Inventario para items con lowStock: true

## Formato de Respuesta (para respuestas sin herramientas, retorna JSON en tu texto)
Para análisis/reportes que no necesitan ejecución de herramientas, retorna uno de estos formatos JSON:

### Reporte Estructurado
{"type":"report","summary":"resumen general","bestStores":[{"name":"...","reason":"..."}],"riskStores":[{"name":"...","reason":"..."}],"recommendations":["..."]}

### Resultado de Consulta
{"type":"query","columns":["col1","col2"],"rows":[[val1,val2],...],"summary":"breve descripción"}

### Sugerencias Accionables
{"type":"suggestions","items":[{"title":"...","reason":"...","tool":"nombreHerramienta","params":{...},"impact":"impacto esperado"}]}

### Texto Plano
{"type":"text","content":"tu respuesta"}

## Entrada del Usuario
${question}`;
    },
  },
};

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

export async function agent(data, question, locale = "en", tenantId) {
  const lang = locale === "es" ? "es" : "en";
  const { stores: storesData } = normalizeData(data);
  const systemPrompt = prompts[lang].agent(data, question);

  const messages = [{ role: "user", content: systemPrompt }];
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

    // ── Execute tool calls ──
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

      const result = await executeTool(toolName, params, tenantId, data);

      // Track action for final response
      const storeName = params.storeId ? storesData.find((s) => s.id === params.storeId)?.name : "";
      executedActions.push({ tool: toolName, params, result, storeName });

      // Add tool result to conversation
      messages.push({
        role: "tool",
        tool_call_id: tc.id,
        content: JSON.stringify(result),
      });
    }

    // Continue loop → LLM will see tool results and decide next step
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
  const prompt = prompts[lang].agent(data, question);
  const { content } = await callLLM({ messages: [{ role: "user", content: prompt }], type: "query", tenantId });
  return content;
}
