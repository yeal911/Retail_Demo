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
| user1 | pass1 | Huawei MX |
| user2 | pass2 | Telcel |
| user3 | pass3 | Bimbo |

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
│   │                   # AIInsights, LlmLogPanel, McpLogPanel
│   ├── src/api/       # request.js (Axios)
│   ├── src/i18n.jsx   # EN / ES translations
│   └── src/styles.css  # Global styles + animations
│
├── backend/           # Node.js backend
│   ├── src/routes/    # auth, store, llm
│   ├── src/services/  # llmService (i18n prompts, 5 AI features)
│   ├── src/mcp/       # tools.js (3 MCP tools, DB-backed + McpLog)
│   └── prisma/        # schema.prisma (6 models), seed.js
│
├── README.md          # This file (EN)
├── README_ES.md       # Spanish version
└── TESTING_GUIDE.md   # Comprehensive test guide
```

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | /api/login | Login |
| GET | /api/stores?tenantId=xxx | Get store data |
| POST | /api/llm/query | LLM data analysis |
| POST | /api/llm/agent | LLM Agent (5 response types) |
| POST | /api/llm/insights | Auto-generate AI insights |
| GET | /api/llm/logs | AI call logs |
| GET | /api/mcp/logs | Store operation logs |

## MCP Tools

| Tool | Parameters | Description | UI Visibility |
|------|-----------|-------------|---------------|
| updateStoreStatus | storeId, status | Update store status | StoreTable status column |
| setSalesTarget | storeId, target | Set sales target | StoreTable Sales Target column |
| sendNotification | storeId, message | Send notification | Sidebar 🔔 notification bell |

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

## Features

- **i18n**: English / Spanish UI + LLM prompts with language switcher
- **Session**: 30-minute localStorage session persistence
- **LLM Logs**: All AI calls recorded with input, output, model, duration
- **MCP Logs**: All store operations recorded with tool, params, result
- **Auto-refresh**: Store data updates silently after MCP operations (no chat loss)
- **Currency**: MXN ($) format for Mexican market
- **Notifications**: Bell icon with badge count for sendNotification results
- **Sales Target**: Visible in StoreTable, stored as Sale record (date=2099)
