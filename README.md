# AI Retail Copilot

Local AI-powered retail management system — multi-tenant store management + sales data visualization + LLM analysis + MCP operations.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + Vite 6 + Ant Design 5 + Recharts |
| Backend | Node.js + Express + Prisma ORM + SQLite |
| AI | OpenAI-compatible API (DeepSeek / GPT / GLM) |

## Quick Start

### 1. Backend

```bash
cd backend
npm install
npx prisma migrate dev
node prisma/seed.js
npm run dev
```

Server runs at http://localhost:3000

### 2. Frontend

```bash
cd frontend
npm install
npm run dev
```

App runs at http://localhost:5173

### 3. Test Accounts

| Username | Password | Tenant |
|----------|----------|--------|
| huawei | pass1 | Huawei MX |
| telcel | pass2 | Telcel |
| bimbo | pass3 | Bimbo |

## LLM Configuration

Edit `backend/.env`:

```env
LLM_API_URL=https://api.deepseek.com/v1/chat/completions
LLM_API_KEY=your_api_key
MODEL_NAME=deepseek-chat
```

Supports any OpenAI-compatible API (DeepSeek, GPT, GLM, etc.).

## Project Structure

```
project-root/
├── frontend/          # React frontend
│   ├── src/pages/     # Login, Dashboard
│   ├── src/components/ # KPI, SalesChart, StoreTable, ChatPanel
│   │                   # AIInsights, ProductManagement, OrderManagement
│   │                   # InventoryManagement, LlmLogPanel, McpLogPanel
│   ├── src/api/       # request.js (Axios)
│   ├── src/i18n.jsx   # EN / ES translations
│   └── src/styles.css  # Global styles + animations
│
├── backend/           # Node.js backend
│   ├── src/routes/    # auth, store, llm
│   ├── src/services/  # llmService (i18n prompts, 5 AI features)
│   ├── src/mcp/       # tools.js (5 MCP tools, DB-backed + McpLog)
│   └── prisma/        # schema.prisma (11 models), seed.js
│
├── README.md          # This file (EN)
├── README_ES.md       # Spanish version
└── TESTING_GUIDE.md   # Comprehensive test guide
```

## Data Model (11 Models)

| Model | Purpose | Key Relations |
|-------|---------|---------------|
| Tenant | Multi-tenant isolation | 1:N → User, Store, Category, Product |
| User | Authentication | N:1 → Tenant |
| Store | Retail store | 1:N → Sale, Order, Inventory, SalesTarget |
| Sale | Daily sales summary (aggregated from Order) | N:1 → Store |
| Product | Product catalog | N:1 → Category, Tenant |
| Category | Product category | N:1 → Tenant |
| Order | Customer order | 1:N → OrderItem, N:1 → Store |
| OrderItem | Order line item | N:1 → Order, Product |
| Inventory | Stock per store per product | N:1 → Store, Product |
| SalesTarget | Monthly sales target | N:1 → Store |
| LlmLog / McpLog | AI & operation audit log | Standalone |

**Data Consistency**: `Sale.revenue = SUM(Order.total)`, `Sale.orders = COUNT(Order)` per store per day. All verified by seed consistency checks.

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | /api/login | Login |
| GET | /api/stores?tenantId=xxx | Get store data with sales |
| PATCH | /api/stores/:id/status | Update store status |
| POST | /api/stores/:id/target | Set sales target |
| GET | /api/products?tenantId=xxx | Get product catalog |
| GET | /api/categories?tenantId=xxx | Get categories |
| GET | /api/orders?tenantId=xxx | Get orders with items |
| GET | /api/inventory?tenantId=xxx | Get inventory status |
| POST | /api/llm/query | LLM data analysis |
| POST | /api/llm/agent | LLM Agent (5 response types) |
| POST | /api/llm/insights | Auto-generate AI insights |
| GET | /api/llm/logs | AI call logs |
| GET | /api/mcp/logs | Store operation logs |
| GET | /api/tenants | List tenants (admin) |
| GET/PUT | /api/config | LLM configuration |

## MCP Tools (5)

| Tool | Parameters | Description | UI Auto-Refresh |
|------|-----------|-------------|-----------------|
| updateStoreStatus | storeId, status | Update store status | StoreTable ✅ |
| setSalesTarget | storeId, target | Set sales target | StoreTable ✅ |
| adjustPricing | productId, newPrice | Adjust product price | ProductManagement ✅ |
| transferInventory | productId, from, to, qty | Transfer stock between stores | InventoryManagement ✅ |
| restockProduct | productId, storeId, qty | Restock product | InventoryManagement ✅ |

**LLM Context**: All 5 tools are fully functional because the Agent prompt includes Store + Product + Inventory data, enabling the LLM to correctly reference IDs.

## AI Capabilities (5 Features)

| # | Feature | Trigger | Description |
|---|---------|---------|-------------|
| F1 | **Auto Insights** | Page load | Automatically detects anomalies, revenue drops, risk stores |
| F2 | **Report Generation** | Chat: "generate report" | Structured report with summary, best/risk stores, recommendations |
| F3 | **Batch Operations** | Chat: "close all low stores" | Filter stores by condition, execute action on all matches |
| F4 | **NL Data Query** | Chat: "show top 3 stores" | Natural language → read-only data table |
| F5 | **Suggestions + Execute** | Chat: "how to optimize?" | Actionable suggestion cards with 1-click Execute button |

### Agent Response Types

| Type | Description | Chat Renderer |
|------|-------------|---------------|
| `action` | Single MCP operation | Green ✅ result card |
| `batch` | Multi-store operation | Orange result with affected count |
| `report` | Structured operations report | Sections: summary, best, risk, recommendations |
| `query` | Data query result | Table with columns and rows |
| `suggestions` | Actionable suggestions | Cards with Execute buttons |
| `text` | Plain text answer | Formatted text |

## UI Navigation

| Group | Pages |
|-------|-------|
| Overview | Dashboard (KPI + Charts + AI Insights) |
| Store Ops | Stores (summary stats + table), Inventory (filters + stock status) |
| Product & Sales | Products (catalog + margins), Orders (inline products + filters) |
| Analytics | Revenue Trend, Revenue Compare, Orders Compare, Avg Ticket Compare |
| System | AI Call Logs, Store Operation Logs |

## Features

- **i18n**: English / Spanish UI + LLM prompts with language switcher
- **Session**: 30-minute localStorage session persistence
- **LLM Context**: Store + Product + Inventory data injected into Agent prompt
- **Auto-refresh**: All management pages refresh after AI operations (refreshKey mechanism)
- **Data Consistency**: Sale records derived from Order aggregation, not independently generated
- **Smart Seed**: Periodic restocking (every 5 days), weekday/weekend order distribution
- **LLM Logs**: All AI calls recorded with input, output, model, duration
- **MCP Logs**: All store operations recorded with tool, params, result
- **Currency**: MXN ($) format for Mexican market
- **Sales Target**: Visible in storeTable, stored as Sale record (date=2099)
