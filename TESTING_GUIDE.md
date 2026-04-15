# AI Retail Copilot — Testing Guide

Complete test cases for validating all system functionality.

---

## 1. Environment Setup

| # | Test Case | Steps | Expected Result |
|---|-----------|-------|-----------------|
| 1.1 | Backend install | `cd backend && npm install` | 0 vulnerabilities, all deps installed |
| 1.2 | Prisma migrate | `npx prisma migrate dev` | Migration applied, dev.db created |
| 1.3 | Seed data | `node prisma/seed.js` | 3 tenants, 3 users, 45 stores, 1350 sales records |
| 1.4 | Backend start | `npm run dev` | "Server running on port 3000" |
| 1.5 | Frontend install | `cd frontend && npm install` | 0 vulnerabilities |
| 1.6 | Frontend start | `npm run dev` | Vite dev server on port 5173 |
| 1.7 | Browser access | Open http://localhost:5173 | Login page renders |

---

## 2. Authentication

| # | Test Case | Steps | Expected Result |
|---|-----------|-------|-----------------|
| 2.1 | Valid login (user1) | Enter `user1` / `pass1`, click Sign In | Redirect to Dashboard, tenant shows "Huawei MX" |
| 2.2 | Valid login (user2) | Enter `user2` / `pass2`, click Sign In | Redirect to Dashboard, tenant shows "Telcel" |
| 2.3 | Valid login (user3) | Enter `user3` / `pass3`, click Sign In | Redirect to Dashboard, tenant shows "Bimbo" |
| 2.4 | Invalid password | Enter `user1` / `wrong` | Error message displayed |
| 2.5 | Empty fields | Click Sign In with empty fields | Validation error on required fields |
| 2.6 | Session persistence | Login, then refresh page (F5) | Still on Dashboard, not redirected to login |
| 2.7 | Session expiry | Login, wait 30+ minutes, interact | Redirected to login with session expired message |
| 2.8 | Logout | Click user avatar → Sign Out | Redirected to login page |

---

## 3. Dashboard — Overview

| # | Test Case | Steps | Expected Result |
|---|-----------|-------|-----------------|
| 3.1 | KPI cards render | Login and view Overview | 4 KPI cards: Total Revenue, Total Orders, Active Stores, Avg. Ticket |
| 3.2 | KPI values | Check KPI numbers | Revenue shows $XK format, Orders shows number, Active Stores shows count |
| 3.3 | Currency format | Check all monetary values | All use $ (MXN) prefix, not ¥ |
| 3.4 | Revenue trend chart | View line chart | Shows 30-day trend lines for top 5 stores |
| 3.5 | Store comparison chart | View bar chart | Shows revenue + orders- orders bars per store |
| 3.6 | Store table | View store list table | Shows stores with Name, City, Manager, Status, Revenue, Orders, Avg Ticket, Sales Target |
| 3.7 | Store click filter | Click a store name in table | Charts filter to show only that store |
| 3.8 | Store click toggle | Click same store name again | Filter removed, all stores shown |
| 3.9 | Table sorting | Click "30d Revenue" column header | Table sorts by revenue ascending/descending |

---

## 4. Dashboard — Store Management Menu

| # | Test Case | Steps | Expected Result |
|---|-----------|-------|-----------------|
| 4.1 | Menu click | Click "Stores" in sidebar | KPI and charts hidden, only store table shown |
| 4.2 | Table expanded | View store table in Stores mode | Shows 15 rows per page (expanded) |
| 4.3 | Back to overview | Click "Overview" in sidebar | KPI and charts visible again |

---

## 5. i18n — Language Switching

| # | Test Case | Steps | Expected Result |
|---|-----------|-------|-----------------|
| 5.1 | Default language | Login for first time | UI shows in Spanish (default) |
| 5.2 | Switch to EN | Click "EN" button | All labels switch to English |
| 5.3 | Switch to ES | Click "ES" button | All labels switch to Spanish |
| 5.4 | Language persists | Switch to EN, refresh page | Still in English after refresh |
| 5.5 | Login page i18n | Logout, check login page | Login page respects selected language |
| 5.6 | Chat i18n | Switch to ES, check chat welcome | Welcome message in Spanish |
| 5.7 | LLM prompt i18n | Ask question in ES mode | LLM receives Spanish prompt, responds in Spanish |

---

## 6. AI Chat — Data Analysis

| # | Test Case | Steps | Expected Result |
|---|-----------|-------|-----------------|
| 6.1 | Ask about revenue | Type "Which store has the highest revenue?" | LLM returns text analysis identifying top store |
| 6.2 | Ask about trends | Type "What's the sales trend for the last 7 days?" | LLM returns trend analysis |
| 6.3 | Ask in Spanish | Switch to ES, type "¿Qué tienda tiene mayores ingresos?" | LLM responds in Spanish |
| 6.4 | LLM not configured | Remove API key, ask question | Returns "LLM not configured" message |
| 6.5 | Chat scroll | Send multiple messages | Chat auto-scrolls to latest message |

---

## 7. AI Chat — MCP Operations

| # | Test Case | Steps | Expected Result |
|---|-----------|-------|-----------------|
| 7.1 | Deactivate store | Type "deactivate CDMX Store" | Green ✅ message: status updated to inactive |
| 7.2 | Auto-refresh after MCP | After 7.1, check store table | CDMX Store shows "Inactive" status — chat history preserved |
| 7.3 | Chat preserved | After 7.1, check chat messages | Previous messages still visible, not lost |
| 7.4 | Activate store | Type "activate CDMX Store" | Green ✅ message: status updated to active |
| 7.5 | Set sales target | Type "set sales target 50000 for Guadalajara Store" | Green ✅ message: target set to $50,000 |
| 7.6 | Sales target visible | After 7.5, check store table | Guadalajara Store shows $50K in Sales Target column |
| 7.7 | Send notification | Type "notify Monterrey Store about inventory check tomorrow" | Green ✅ message: notification sent |
| 7.8 | Notification bell | After 7.7, check sidebar bell icon | Bell shows badge count, dropdown shows notification |
| 7.9 | MCP in Spanish | Switch to ES, type "desactivar la tienda Puebla" | LLM understands Spanish, executes MCP, shows result |

---

## 8. F1 — Auto Insights

| # | Test Case | Steps | Expected Result |
|---|-----------|-------|-----------------|
| 8.1 | Insights appear | Login and wait for page load | AI Insights card appears above KPI cards |
| 8.2 | Insights content | Check insight items | Each has description, severity tag (high/medium/low), colored background |
| 8.3 | Severity colors | Check different insights | Red=high, Yellow=medium, Blue=low |
| 8.4 | No action needed | Just load page | Insights appear automatically without user interaction |
| 8.5 | Max 5 shown | Check insights count | At most 5 insights shown |

---

## 9. F2 — Report Generation

| # | Test Case | Steps | Expected Result |
|---|-----------|-------|-----------------|
| 9.1 | Generate report | Type "generate this week's report" | Structured report rendered in chat |
| 9.2 | Report sections | Check report content | Has Summary, Best Performing stores, Risk Stores, Recommendations |
| 9.3 | Report in Spanish | Switch to ES, type "generar reporte" | Report rendered in Spanish |
| 9.4 | Report has specifics | Check best/risk stores | Contains actual store names and reasons, not generic text |

---

## 10. F3 — Batch Operations

| # | Test Case | Steps | Expected Result |
|---|-----------|-------|-----------------|
| 10.1 | Batch deactivate | Type "deactivate all stores with revenue below 50000" | Orange batch result with count of affected stores |
| 10.2 | Batch results detail | Check batch result | Shows each store name and its operation result |
| 10.3 | Batch DB changes | After 10.1, check store table | Multiple stores now show "Inactive" status |
| 10.4 | Batch in Spanish | Switch to ES, type "cerrar tiendas con bajo rendimiento" | Batch executes, results in Spanish |

---

## 11. F4 — Natural Language Data Query

| # | Test Case | Steps | Expected Result |
|---|-----------|-------|-----------------|
| 11.1 | Top N query | Type "show the top 3 stores by revenue" | Table rendered with columns and 3 rows |
| 11.2 | Filter query | Type "find stores with avg ticket above 50" | Table with matching stores |
| 11.3 | Query summary | Check query result | Has brief description above the table |
| 11.4 | Read-only | Verify no data changed | Query does not modify any store data |

---

## 12. F5 — AI Suggestions + One-Click Execute

| # | Test Case | Steps | Expected Result |
|---|-----------|-------|-----------------|
| 12.1 | Ask for suggestions | Type "how can I optimize sales?" | Suggestion cards rendered, each with title, reason, impact |
| 12.2 | Execute button | Check each suggestion card | Has "Execute" button |
| 12.3 | Click execute | Click Execute on a suggestion | Action runs, green ✅ result appears |
| 12.4 | Data changes | After 12.3, check store table | Data reflects the executed action |
| 12.5 | Multiple suggestions | Check suggestion count | At least 2 suggestions generated |

---

## 13. AI Call Logs

| # | Test Case | Steps | Expected Result |
|---|-----------|-------|-----------------|
| 13.1 | Menu navigation | Click "AI Call Logs" in sidebar | Log panel displayed |
| 13.2 | Logs recorded | Ask a question in chat, then check logs | New log entry appears with type, model, duration |
| 13.3 | Log fields | Check a log entry | Shows Time, Type, Model, Duration (ms), Input, Output |
| 13.4 | Duration color | Check duration values | Green (<1000ms), Yellow (1000-3000ms), Red (>3000ms) |
| 13.5 | Double-click input | Double-click on a truncated Input cell | Modal opens showing full input text |
| 13.6 | Double-click output | Double-click on a truncated Output cell | Modal opens showing full output text |
| 13.7 | Modal close | Click X or outside modal | Modal closes |
| 13.8 | Auto-refresh | Ask new question, don't refresh logs page | New entry appears within 10 seconds |

---

## 14. Store Operation Logs (MCP)

| # | Test Case | Steps | Expected Result |
|---|-----------|-------|-----------------|
| 14.1 | Menu navigation | Click "Store Operation Logs" in sidebar | MCP log panel displayed |
| 14.2 | Logs recorded | Execute MCP operation in chat, check logs | New entry with tool, params, result |
| 14.3 | Log fields | Check a log entry | Shows Time, Tool name, Parameters, Result |
| 14.4 | Tool tag colors | Check different tool entries | updateStoreStatus=orange, setSalesTarget=blue, sendNotification=green |
| 14.5 | Result indicator | Check result column | ✓ (green) for success, ✗ (red) for failure |
| 14.6 | Double-click params | Double-click on Parameters cell | Modal opens showing full params |
| 14.7 | Double-click result | Double-click on Result cell | Modal opens showing full result JSON |
| 14.8 | Auto-refresh | Execute new MCP op, don't refresh page | New entry appears within 10 seconds |

---

## 15. MCP Operation Visibility

| # | Test Case | Steps | Expected Result |
|---|-----------|-------|-----------------|
| 15.1 | Status change visible | Deactivate a store via chat | StoreTable status column updates to "Inactive" |
| 15.2 | Sales target visible | Set sales target via chat | StoreTable Sales Target column shows the value in $XK format |
| 15.3 | Target persistence<  | Set target, refresh page | Target still visible after refresh (persisted in DB) |
| 15.4 | Notification bell | Send notification via chat | Sidebar bell icon shows badge count |
| 15.5 | Notification dropdown | Click bell icon | Dropdown shows notification message and timestamp |
| 15.6 | No notifications | Fresh DB, check bell | Badge shows 0, dropdown shows "No notifications" |

---

## 16. Data Integrity

| # | Test Case | Steps | Expected Result |
|---|-----------|-------|-----------------|
| 16.1 | Tenant isolation | Login as user1 (Huawei MX), check stores | Only Huawei MX stores shown |
| 16.2 | Tenant isolation | Login as user2 (Telcel), check stores | Only Telcel stores shown |
| 16.3 | MCP updates DB | Deactivate a store via chat, restart backend, login | Store still shows inactive (persisted in DB) |
| 16.4 | Sales target in DB | Set sales target, check DB | Sale record with date 2099-01-01 created with target as revenue |
| 16.5 | Revenue excludes target | Set target for a store, check 30d Revenue | 30d Revenue does NOT include the 2099 target record |

---

## 17. UI/UX Quality

| # | Test Case | Steps | Expected Result |
|---|-----------|-------|-----------------|
| 17.1 | Card hover effect | Hover over KPI cards | Subtle shadow elevation change |
| 17.2 | Chat message animation | Send a message | New message appears with fade-in animation |
| 17.3 | Smooth scrollbar | Scroll in chat or table | Custom thin scrollbar, not default browser scrollbar |
| 17.4 | Responsive layout | Resize browser window | Layout adapts, chat panel stays visible |
| 17.5 | Table header style | Check table headers | Uppercase, smaller font, gray color |
| 17.6 | Action result styling | Execute MCP operation | Green background with checkmark icon |
| 17.7 | Batch result styling | Execute batch operation | Orange background with affected count |
| 17.8 | Report styling | Generate a report | Structured sections with icons and colors |
| 17.9 | Suggestion cards | Ask for suggestions | Yellow cards with Execute buttons |
