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
| huawei | pass1 | Huawei MX |
| telcel | pass2 | Telcel |
| bimbo | pass3 | Bimbo |

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
│   │                   # AIInsights, ProductManagement, OrderManagement
│   │                   # InventoryManagement, LlmLogPanel, McpLogPanel
│   ├── src/api/       # request.js (Axios)
│   ├── src/i18n.jsx   # Traducciones EN / ES
│   └── src/styles.css  # Estilos globales + animaciones
│
├── backend/           # Backend Node.js
│   ├── src/routes/    # auth, store, llm
│   ├── src/services/  # llmService (prompts i18n, 5 funciones IA)
│   ├── src/mcp/       # tools.js (6 herramientas MCP + McpLog)
│   └── prisma/        # schema.prisma (11 modelos), seed.js
│
├── README.md          # Versión en Inglés
├── README_ES.md       # Este archivo (ES)
└── TESTING_GUIDE.md   # Guía de pruebas
```

## Modelo de Datos (11 Modelos)

| Modelo | Propósito | Relaciones Clave |
|--------|-----------|------------------|
| Tenant | Aislamiento multi-tenant | 1:N → User, Store, Category, Product |
| User | Autenticación | N:1 → Tenant |
| Store | Tienda retail | 1:N → Sale, Order, Inventory, SalesTarget |
| Sale | Resumen diario (agregado de Order) | N:1 → Store |
| Product | Catálogo de productos | N:1 → Category, Tenant |
| Category | Categoría de producto | N:1 → Tenant |
| Order | Pedido de cliente | 1:N → OrderItem, N:1 → Store |
| OrderItem | Línea de pedido | N:1 → Order, Product |
| Inventory | Stock por tienda por producto | N:1 → Store, Product |
| SalesTarget | Objetivo de ventas mensual | N:1 → Store |
| LlmLog / McpLog | Registro de auditoría IA y operaciones | Independiente |

**Consistencia de Datos**: `Sale.revenue = SUM(Order.total)`, `Sale.orders = COUNT(Order)` por tienda por día. Verificado por checks de consistencia en seed.

## Endpoints API

| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | /api/login | Inicio de sesión |
| GET | /api/stores?tenantId=xxx | Obtener datos de tiendas con ventas |
| PATCH | /api/stores/:id/status | Actualizar estado de tienda |
| POST | /api/stores/:id/target | Establecer objetivo de ventas |
| GET | /api/products?tenantId=xxx | Obtener catálogo de productos |
| GET | /api/categories?tenantId=xxx | Obtener categorías |
| GET | /api/orders?tenantId=xxx | Obtener pedidos con items |
| GET | /api/inventory?tenantId=xxx | Obtener estado de inventario |
| POST | /api/llm/query | Análisis de datos LLM |
| POST | /api/llm/agent | Agente LLM (5 tipos de respuesta) |
| POST | /api/llm/insights | Generar insights IA automáticamente |
| GET | /api/llm/logs | Registros de llamadas IA |
| GET | /api/mcp/logs | Registros de operaciones |
| GET | /api/tenants | Listar tenants (admin) |
| GET/PUT | /api/config | Configuración LLM |

## Herramientas MCP (6)

| Herramienta | Parámetros | Descripción | Auto-Refresh UI |
|------------|-----------|-------------|-----------------|
| updateStoreStatus | storeId, status | Actualizar estado de tienda | StoreTable ✅ |
| setSalesTarget | storeId, target | Establecer objetivo de ventas | StoreTable ✅ |
| sendNotification | storeId, message | Enviar notificación | Campana 🔔 ✅ |
| adjustPricing | productId, newPrice | Ajustar precio de producto | ProductManagement ✅ |
| transferInventory | productId, from, to, qty | Transferir stock entre tiendas | InventoryManagement ✅ |
| restockProduct | productId, storeId, qty | Reabastecer producto | InventoryManagement ✅ |

**Contexto LLM**: Las 6 herramientas son completamente funcionales porque el prompt del Agente incluye datos de Store + Product + Inventory, permitiendo al LLM referenciar IDs correctamente.

## Capacidades IA (5 Funciones)

| # | Función | Disparador | Descripción |
|---|---------|-----------|-------------|
| F1 | **Insights Automáticos** | Carga de página | Detecta anomalías, caídas de ingresos, tiendas en riesgo |
| F2 | **Generación de Reportes** | Chat: "generar reporte" | Reporte estructurado con resumen, mejores/peores tiendas, recomendaciones |
| F3 | **Operaciones por Lote** | Chat: "cerrar tiendas de bajo rendimiento" | Filtra tiendas por condición, ejecuta acción en todas |
| F4 | **Consulta NL** | Chat: "mostrar top 3 tiendas" | Lenguaje natural → tabla de datos de solo lectura |
| F5 | **Sugerencias + Ejecutar** | Chat: "cómo optimizar?" | Tarjetas de sugerencias accionables con botón Ejecutar |

## Navegación UI

| Grupo | Páginas |
|-------|---------|
| Resumen | Dashboard (KPI + Gráficos + Insights IA) |
| Operaciones | Tiendas (estadísticas + tabla), Inventario (filtros + estado stock) |
| Producto y Ventas | Productos (catálogo + márgenes), Pedidos (productos inline + filtros) |
| Análisis | Tendencia Ingresos, Comparar Ingresos, Comparar Pedidos, Comparar Ticket Prom. |
| Sistema | Registros IA, Registros Operaciones |

## Características

- **i18n**: Interfaz + prompts LLM en Inglés / Español con selector de idioma
- **Sesión**: Persistencia de sesión en localStorage por 30 minutos
- **Contexto LLM**: Datos de Store + Product + Inventory inyectados en el prompt del Agente
- **Auto-actualización**: Todas las páginas de gestión se actualizan tras operaciones IA (mecanismo refreshKey)
- **Consistencia de Datos**: Registros Sale derivados de agregación de Orders, no generados independientemente
- **Seed Inteligente**: Reabastecimiento periódico (cada 5 días), distribución de pedidos entre semana/fin de semana
- **Registros LLM**: Todas las llamadas IA registradas con entrada, salida, modelo, duración
- **Registros MCP**: Todas las operaciones registradas con herramienta, parámetros, resultado
- **Moneda**: Formato MXN ($) para el mercado mexicano
- **Notificaciones**: Icono de campana con contador para resultados de sendNotification
- **Objetivo de Ventas**: Visible en tabla de tiendas, almacenado como registro Sale (fecha=2099)
