# AI Retail Copilot

Sistema local de gestión retail con IA — gestión multi-tenant de tiendas + visualización de datos de ventas + análisis LLM + operaciones MCP.

## Stack Tecnológico

| Capa | Tecnología |
|------|-----------|
| Frontend | React 18 + Vite 6 + Ant Design 5 + Recharts |
| Backend | Node.js + Express + Prisma ORM + SQLite |
| IA | API compatible con OpenAI (DeepSeek / GPT / GLM) |

## Inicio Rápido

### 1. Backend

```bash
cd backend
npm install
npx prisma migrate dev
node prisma/seed.js
npm run dev
```

Servidor en http://localhost:3000

### 2. Frontend

```bash
cd frontend
npm install
npm run dev
```

Aplicación en http://localhost:5173

### 3. Cuentas de Prueba

| Usuario | Contraseña | Tenant |
|---------|-----------|--------|
| user1 | pass1 | Huawei MX |
| user2 | pass2 | Telcel |
| user3 | pass3 | Bimbo |

## Configuración LLM

Editar `backend/.env`:

```env
LLM_API_URL=https://api.deepseek.com/v1/chat/completions
LLM_API_KEY=tu_api_key
MODEL_NAME=deepseek-chat
```

Soporta cualquier API compatible con OpenAI (DeepSeek, GPT, GLM, etc.).

## Estructura del Proyecto

```
project-root/
├── frontend/          # Frontend React
│   ├── src/pages/     # Login, Dashboard
│   ├── src/components/ # KPI, SalesChart, StoreTable, ChatPanel
│   │                   # AIInsights, LlmLogPanel, McpLogPanel
│   ├── src/api/       # request.js (Axios)
│   ├── src/i18n.jsx   # Traducciones EN / ES
│   └── src/styles.css  # Estilos globales + animaciones
│
├── backend/           # Backend Node.js
│   ├── src/routes/    # auth, store, llm
│   ├── src/services/  # llmService (prompts i18n, 5 funciones IA)
│   ├── src/mcp/       # tools.js (3 herramientas MCP + McpLog)
│   └── prisma/        # schema.prisma (6 modelos), seed.js
│
├── README.md          # Versión en Inglés
├── README_ES.md       # Este archivo (ES)
└── TESTING_GUIDE.md   # Guía de pruebas
```

## Endpoints API

| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | /api/login | Inicio de sesión |
| GET | /api/stores?tenantId=xxx | Obtener datos de tiendas |
| POST | /api/llm/query | Análisis de datos LLM |
| POST | /api/llm/agent | Agente LLM (5 tipos de respuesta) |
| POST | /api/llm/insights | Generar insights IA automáticamente |
| GET | /api/llm/logs | Registros de llamadas IA |
| GET | /api/mcp/logs | Registros de operaciones de tiendas |

## Herramientas MCP

| Herramienta | Parámetros | Descripción | Visibilidad UI |
|------------|-----------|-------------|----------------|
| updateStoreStatus | storeId, status | Actualizar estado de tienda | Columna estado en tabla |
| setSalesTarget | storeId, target | Establecer objetivo de ventas | Columna "Objetivo Ventas" en tabla |
| sendNotification | storeId, message | Enviar notificación | 🔔 Campana de notificaciones en sidebar |

## Capacidades IA (5 Funciones)

| # | Función | Disparador | Descripción |
|---|---------|-----------|-------------|
| F1 | **Insights Automáticos** | Carga de página | Detecta anomalías, caídas de ingresos, tiendas en riesgo |
| F2 | **Generación de Reportes** | Chat: "generar reporte" | Reporte estructurado con resumen, mejores/peores tiendas, recomendaciones |
| F3 | **Operaciones por Lote** | Chat: "cerrar tiendas de bajo rendimiento" | Filtra tiendas por condición, ejecuta acción en todas |
| F4 | **Consulta NL** | Chat: "mostrar top 3 tiendas" | Lenguaje natural → tabla de datos de solo lectura |
| F5 | **Sugerencias + Ejecutar** | Chat: "cómo optimizar?" | Tarjetas de sugerencias accionables con botón Ejecutar |

## Características

- **i18n**: Interfaz + prompts LLM en Inglés / Español con selector de idioma
- **Sesión**: Persistencia de sesión en localStorage por 30 minutos
- **Registros LLM**: Todas las llamadas IA registradas con entrada, salida, modelo, duración
- **Registros MCP**: Todas las operaciones de tiendas registradas con herramienta, parámetros, resultado
- **Auto-actualización**: Datos de tiendas se actualizan silenciosamente tras operaciones MCP (sin perder chat)
- **Moneda**: Formato MXN ($) para el mercado mexicano
- **Notificaciones**: Icono de campana con contador para resultados de sendNotification
- **Objetivo de Ventas**: Visible en tabla de tiendas, almacenado como registro Sale (fecha=2099)
