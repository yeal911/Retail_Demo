import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const LLM_API_URL = process.env.LLM_API_URL;
const LLM_API_KEY = process.env.LLM_API_KEY;
const MODEL_NAME = process.env.MODEL_NAME || "deepseek-chat";

async function callLLM(prompt, type, tenantId) {
  if (!LLM_API_URL || !LLM_API_KEY || LLM_API_KEY === "your_key") {
    const fallback = "LLM not configured. Please set LLM_API_URL and LLM_API_KEY in backend/.env.";
    await prisma.llmLog.create({ data: { type, input: prompt, output: fallback, model: MODEL_NAME, duration: 0, tenantId: tenantId || null } });
    return fallback;
  }

  const startTime = Date.now();
  try {
    const response = await fetch(LLM_API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${LLM_API_KEY}` },
      body: JSON.stringify({ model: MODEL_NAME, messages: [{ role: "user", content: prompt }], temperature: 0.1, max_tokens: 2048 }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("LLM API error:", response.status, errText);
      const errMsg = `LLM request failed (${response.status}). Check API config.`;
      const duration = Date.now() - startTime;
      await prisma.llmLog.create({ data: { type, input: prompt, output: errMsg, model: MODEL_NAME, duration, tenantId: tenantId || null } });
      return errMsg;
    }

    const data = await response.json();
    const output = data.choices?.[0]?.message?.content || "LLM returned no content";
    const duration = Date.now() - startTime;
    await prisma.llmLog.create({ data: { type, input: prompt, output, model: MODEL_NAME, duration, tenantId: tenantId || null } });
    return output;
  } catch (error) {
    console.error("LLM call error:", error);
    const errMsg = "LLM call failed. Check network and API config.";
    const duration = Date.now() - startTime;
    await prisma.llmLog.create({ data: { type, input: prompt, output: errMsg, model: MODEL_NAME, duration, tenantId: tenantId || null } });
    return errMsg;
  }
}

function extractJSON(text) {
  let jsonStr = text;
  const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (codeBlockMatch) jsonStr = codeBlockMatch[1].trim();
  try { return JSON.parse(jsonStr); } catch {}
  const jsonMatch = jsonStr.match(/\{[\s\S]*\}/);
  if (jsonMatch) try { return JSON.parse(jsonMatch[0]); } catch {}
  return null;
}

async function executeTool(toolName, params, tenantId) {
  const { updateStoreStatus, setSalesTarget, sendNotification, adjustPricing, transferInventory, restockProduct } = await import("../mcp/tools.js");
  switch (toolName) {
      case "updateStoreStatus": return await updateStoreStatus(params.storeId, params.status, tenantId);
      case "setSalesTarget": return await setSalesTarget(params.storeId, params.target, tenantId);
      case "sendNotification": return await sendNotification(params.storeId, params.message, tenantId);
      case "adjustPricing": return await adjustPricing(params.productId, params.newPrice, tenantId);
      case "transferInventory": return await transferInventory(params.productId, params.fromStoreId, params.toStoreId, params.quantity, tenantId);
      case "restockProduct": return await restockProduct(params.productId, params.storeId, params.quantity, tenantId);
    default: return { success: false, message: `Unknown tool: ${toolName}` };
  }
}

// ─── Prompts (EN / ES) ────────────────────────────────────────

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

Look for: significant revenue drops, unusual order volatility, stores underperforming vs average, weekend vs weekday anomalies.

Return ONLY the JSON array, no other text:
[{"description":"...","severity":"high","storeId":"..."},...]`,

    agent: (data, question) => `You are an intelligent retail operations Agent. You can analyze data, generate reports, execute operations, query data, and provide actionable suggestions.

## Current Store Data
${JSON.stringify(data, null, 2)}

## Available Tools
1. updateStoreStatus(storeId, status) - Change store operating status
2. setSalesTarget(storeId, target) - Set store sales target
3. sendNotification(storeId, message) - Send notification to a store
4. adjustPricing(productId, newPrice) - Adjust product price
5. transferInventory(productId, fromStoreId, toStoreId, quantity) - Transfer inventory between stores
6. restockProduct(productId, storeId, quantity) - Restock product at a store

## Response Types (return ONLY JSON, no other text)

### Single Action
{"type":"action","tool":"toolName","params":{...}}

### Batch Operation (operate on multiple stores matching a condition)
{"type":"batch","tool":"toolName","filter":{"field":"status|revenue|orders","op":"eq|lt|gt|lte|gte","value":...},"actionParams":{...}}
Example: close all low-performing stores → {"type":"batch","tool":"updateStoreStatus","filter":{"field":"revenue","op":"lt","value":50000},"actionParams":{"status":"inactive"}}

### Structured Report
{"type":"report","summary":"overall summary","bestStores":[{"name":"...","reason":"..."}],"riskStores":[{"name":"...","reason":"..."}],"recommendations":["...","..."]}

### Data Query Result
{"type":"query","columns":["col1","col2",...],"rows":[[val1,val2,...],...],"summary":"brief description of results"}

### Actionable Suggestions
{"type":"suggestions","items":[{"title":"...","reason":"...","tool":"toolName","params":{...},"impact":"expected impact description"},...]}

### Plain Text (for simple Q&A)
{"type":"text","content":"your answer here"}

## Rules
- For batch operations, use the filter to match stores from the data above, then apply the tool to ALL matching stores
- For queries, extract actual data from the store data above and return as table
- For reports, provide structured business insights with specific store names and numbers
- For suggestions, each item MUST have a tool and params that can be directly executed
- Always use actual store IDs from the data above

## User Input
${question}`,
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

Buscar: caídas significativas de ingresos, volatilidad inusual de pedidos, tiendas con rendimiento inferior al promedio, anomalías fin de semana vs día de semana.

Retorna SOLO el arreglo JSON, sin otro texto:
[{"description":"...","severity":"high","storeId":"..."},...]`,

    agent: (data, question) => `Eres un Agente inteligente de operaciones retail. Puedes analizar datos, generar reportes, ejecutar operaciones, consultar datos y proporcionar sugerencias accionables.

## Datos Actuales de Tiendas
${JSON.stringify(data, null, 2)}

## Herramientas Disponibles
1. updateStoreStatus(storeId, status) - Cambiar estado operativo de tienda
2. setSalesTarget(storeId, target) - Establecer objetivo de ventas de tienda
3. sendNotification(storeId, message) - Enviar notificación a una tienda
4. adjustPricing(productId, newPrice) - Ajustar precio de producto
5. transferInventory(productId, fromStoreId, toStoreId, quantity) - Transferir inventario entre tiendas
6. restockProduct(productId, storeId, quantity) - Reabastecer producto en tienda

## Tipos de Respuesta (retornar SOLO JSON, sin otro texto)

### Acción Individual
{"type":"action","tool":"nombreHerramienta","params":{...}}

### Operación por Lote (operar en múltiples tiendas que cumplan una condición)
{"type":"batch","tool":"nombreHerramienta","filter":{"field":"status|revenue|orders","op":"eq|lt|gt|lte|gte","value":...},"actionParams":{...}}
Ejemplo: cerrar todas las tiendas de bajo rendimiento → {"type":"batch","tool":"updateStoreStatus","filter":{"field":"revenue","op":"lt","value":50000},"actionParams":{"status":"inactive"}}

### Reporte Estructurado
{"type":"report","summary":"resumen general","bestStores":[{"name":"...","reason":"..."}],"riskStores":[{"name":"...","reason":"..."}],"recommendations":["...","..."]}

### Resultado de Consulta de Datos
{"type":"query","columns":["col1","col2",...],"rows":[[val1,val2,...],...],"summary":"breve descripción de resultados"}

### Sugerencias Accionables
{"type":"suggestions","items":[{"title":"...","reason":"...","tool":"nombreHerramienta","params":{...},"impact":"descripción del impacto esperado"},...]}

### Texto Plano (para Q&A simple)
{"type":"text","content":"tu respuesta aquí"}

## Reglas
- Para operaciones por lote, usa el filtro para coincidir tiendas de los datos arriba, luego aplica la herramienta a TODAS las tiendas coincidentes
- Para consultas, extrae datos reales de los datos de tienda arriba y retorna como tabla
- Para reportes, proporciona insights de negocio estructurados con nombres de tiendas y números específicos
- Para sugerencias, cada item DEBE tener tool y params que puedan ejecutarse directamente
- Siempre usa IDs de tienda reales de los datos arriba

## Entrada del Usuario
${question}`,
  },
};

// ─── F1: Auto Insights ──────────────────────────────────────────

export async function generateInsights(data, locale = "en", tenantId) {
  const lang = locale === "es" ? "es" : "en";
  const prompt = prompts[lang].insights(data);
  const responseText = await callLLM(prompt, "insights", tenantId);

  try {
    const parsed = extractJSON(responseText);
    if (Array.isArray(parsed)) return { type: "insights", items: parsed };
    if (parsed && Array.isArray(parsed.items)) return { type: "insights", items: parsed.items };
  } catch {}

  return { type: "insights", items: [] };
}

// ─── F2-F5: Enhanced Agent ──────────────────────────────────────

export async function agent(data, question, locale = "en", tenantId) {
  const lang = locale === "es" ? "es" : "en";
  const prompt = prompts[lang].agent(data, question);
  const responseText = await callLLM(prompt, "agent", tenantId);

  const parsed = extractJSON(responseText);
  if (!parsed || !parsed.type) {
    return { type: "text", content: responseText };
  }

  switch (parsed.type) {
    // F2: Structured Report
    case "report":
      return { type: "report", summary: parsed.summary, bestStores: parsed.bestStores || [], riskStores: parsed.riskStores || [], recommendations: parsed.recommendations || [] };

    // F3: Batch Operation
    case "batch": {
      const { tool, filter, actionParams } = parsed;
      const matchingStores = data.filter((s) => {
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
        const result = await executeTool(tool, params, tenantId);
        results.push({ storeId: store.id, storeName: store.name, result });
      }

      return { type: "batch", tool, filter, count: results.length, results };
    }

    // F4: Data Query
    case "query":
      return { type: "query", columns: parsed.columns || [], rows: parsed.rows || [], summary: parsed.summary || "" };

    // F5: Actionable Suggestions
    case "suggestions":
      return { type: "suggestions", items: (parsed.items || []).map((item) => ({ title: item.title, reason: item.reason, tool: item.tool, params: item.params, impact: item.impact })) };

    // Single Action (existing)
    case "action": {
      const toolResult = await executeTool(parsed.tool, parsed.params, tenantId);
      return { type: "action", tool: parsed.tool, params: parsed.params, result: toolResult };
    }

    // Plain text
    case "text":
      return { type: "text", content: parsed.content || responseText };

    default:
      return { type: "text", content: responseText };
  }
}

// Legacy analyze function
export async function analyze(data, question, locale = "en", tenantId) {
  const lang = locale === "es" ? "es" : "en";
  const prompt = prompts[lang].agent(data, question);
  const responseText = await callLLM(prompt, "query", tenantId);
  return responseText;
}
