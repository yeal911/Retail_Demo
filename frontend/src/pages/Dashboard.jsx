import React, { useState, useEffect, useCallback } from "react";
import {
    Menu, Spin, Avatar, Typography, Dropdown, message, Button, Space,
} from "antd";
import {
    DashboardOutlined, ShopOutlined, LogoutOutlined, UserOutlined,
    RobotOutlined, HistoryOutlined, ToolOutlined, SettingOutlined,
    MenuFoldOutlined, MenuUnfoldOutlined, LeftOutlined,
    LineChartOutlined, BarChartOutlined, TeamOutlined,
    ShoppingOutlined, UnorderedListOutlined,
} from "@ant-design/icons";
import { getStores } from "../api/request";
import logo from "../assets/logo.png";
import { useI18n } from "../i18n";
import KPI from "../components/KPI";
import SalesChart from "../components/SalesChart";
import StoreTable from "../components/StoreTable";
import ChatPanel from "../components/ChatPanel";
import AIInsights from "../components/AIInsights";
import LlmLogPanel from "../components/LlmLogPanel";
import McpLogPanel from "../components/McpLogPanel";
import AIConfigPanel from "../components/AIConfigPanel";
import ChartView from "../components/ChartView";
import TenantManagement from "../components/TenantManagement";
import ProductManagement from "../components/ProductManagement";
import OrderManagement from "../components/OrderManagement";

const { Text } = Typography;

export default function Dashboard({ user, onLogout }) {
  const [stores, setStores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedStore, setSelectedStore] = useState(null);
  const [activeMenu, setActiveMenu] = useState("overview");
  const [siderCollapsed, setSiderCollapsed] = useState(false);
  const [chatCollapsed, setChatCollapsed] = useState(false);
  const { t, locale, switchLocale } = useI18n();

  const isAdmin = user.role === "admin";
  const tenantId = user.tenantId;

  const collapsedMenuItems = isAdmin ? [
    { key: "tenants", icon: <TeamOutlined /> },
    null,
    { key: "aiConfig", icon: <SettingOutlined /> },
  ] : [
    { key: "overview",         icon: <DashboardOutlined /> },
    { key: "stores",           icon: <ShopOutlined /> },
    { key: "products",         icon: <ShoppingOutlined /> },
    { key: "orders",           icon: <UnorderedListOutlined /> },
    { key: "revenueTrend",     icon: <LineChartOutlined /> },
    { key: "revenueCompare",   icon: <BarChartOutlined /> },
    { key: "ordersCompare",    icon: <BarChartOutlined /> },
    { key: "avgTicketCompare", icon: <BarChartOutlined /> },
    null,
    { key: "llmLogs",  icon: <HistoryOutlined /> },
    { key: "mcpLogs",  icon: <ToolOutlined /> },
  ];

    const loadData = useCallback(async (showLoading = true) => {
        if (showLoading) setLoading(true);
        try {
            const res = await getStores(user.tenantId);
            if (res.data.success) setStores(res.data.data);
        } catch {
            message.error("Failed to load data");
        } finally {
            if (showLoading) setLoading(false);
        }
    }, [user.tenantId]);

    useEffect(() => { loadData(); }, [loadData]);

    const realSales = (sales) => sales.filter((s) => new Date(s.date).getFullYear() !== 2099);
    const totalRevenue = stores.reduce((sum, s) => sum + realSales(s.sales).reduce((a, b) => a + b.revenue, 0), 0);
    const totalOrders = stores.reduce((sum, s) => sum + realSales(s.sales).reduce((a, b) => a + b.orders, 0), 0);
    const activeStores = stores.filter((s) => s.status === "active").length;
    const avgTicket = totalOrders > 0 ? totalRevenue / totalOrders : 0;

    const userMenu = {
        items: [{ key: "logout", icon: <LogoutOutlined />, label: t("logout"), onClick: onLogout }],
    };

    const siderWidth = siderCollapsed ? 56 : 220;
    const chatWidth = chatCollapsed ? 40 : 360;

    return (
        <div style={{ display: "flex", height: "100vh", overflow: "hidden", background: "#f5f5f7" }}>

            {/* Sidebar */}
            <div style={{
                width: siderWidth,
                background: "#fff",
                borderRight: "1px solid #f0f0f0",
                display: "flex",
                flexDirection: "column",
                transition: "width 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                overflow: "hidden",
                flexShrink: 0,
                position: "relative",
            }}>

                {/* Header */}
                <div style={{
                    height: siderCollapsed ? 48 : 64,
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "center",
                    padding: siderCollapsed ? 0 : "0 20px",
                    borderBottom: "1px solid #f0f0f0",
                    overflow: "hidden",
                    position: "relative",
                }}>
                    {siderCollapsed ? (
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", gap: 4 }}>
                            <img src={logo} alt="logo" style={{ width: 20, height: 20 }} />
                            <div
                                onClick={() => setSiderCollapsed(false)}
                                style={{ cursor: "pointer", color: "#bfbfbf", fontSize: 14, lineHeight: 1, transition: "color 0.2s" }}
                                onMouseEnter={(e) => e.currentTarget.style.color = "#4F46E5"}
                                onMouseLeave={(e) => e.currentTarget.style.color = "#bfbfbf"}
                            >
                                <MenuUnfoldOutlined />
                            </div>
                        </div>
                    ) : (
                        <>
                            <div style={{ display: "flex", alignItems: "center" }}>
                                <img src={logo} alt="logo" style={{ width: 22, height: 22, marginRight: 8, flexShrink: 0 }} />
                                <Text strong style={{ fontSize: 15, color: "#1a1a2e", whiteSpace: "nowrap" }}>{t("appName")}</Text>
                                <div
                                    onClick={() => setSiderCollapsed(true)}
                                    style={{
                                        marginLeft: "auto", cursor: "pointer", color: "#bfbfbf",
                                        fontSize: 14, lineHeight: 1, transition: "color 0.2s",
                                    }}
                                    onMouseEnter={(e) => e.currentTarget.style.color = "#4F46E5"}
                                    onMouseLeave={(e) => e.currentTarget.style.color = "#bfbfbf"}
                                >
                                    <MenuFoldOutlined />
                                </div>
                            </div>
                            <Text style={{ fontSize: 12, color: "#8c8c8c", marginLeft: 30, marginTop: 2, whiteSpace: "nowrap" }}>
                                {user.tenant?.name}
                            </Text>
                        </>
                    )}
                </div>

                {/* Menu */}
                {siderCollapsed ? (
                    /* 折叠状态：完全自定义，不用 AntD Menu，避免 inline style 居中问题 */
                    <div style={{ flex: 1, display: "flex", flexDirection: "column", padding: "4px 0" }}>
                        {collapsedMenuItems.map((item, i) =>
                            item === null ? (
                                <div key={`divider-${i}`} style={{ height: 1, background: "#f0f0f0", margin: "4px 12px" }} />
                            ) : (
                                <div
                                    key={item.key}
                                    onClick={() => setActiveMenu(item.key)}
                                    style={{
                                        display: "flex", alignItems: "center", justifyContent: "center",
                                        height: 40, margin: "2px 12px", borderRadius: 6,
                                        cursor: "pointer", fontSize: 18,
                                        color: activeMenu === item.key ? "#4F46E5" : "#595959",
                                        background: activeMenu === item.key ? "#f0f0ff" : "transparent",
                                        transition: "background 0.2s, color 0.2s",
                                    }}
                                    onMouseEnter={(e) => {
                                        if (activeMenu !== item.key) e.currentTarget.style.background = "#f5f5f5";
                                    }}
                                    onMouseLeave={(e) => {
                                        if (activeMenu !== item.key) e.currentTarget.style.background = "transparent";
                                    }}
                                >
                                    {item.icon}
                                </div>
                            )
                        )}
                    </div>
                ) : (
                    /* 展开状态：正常 AntD Menu */
                    <Menu
                        mode="inline"
                        selectedKeys={[activeMenu]}
                        onClick={({ key }) => setActiveMenu(key)}
                        style={{ border: "none", flex: 1 }}
                        items={isAdmin ? [
                            {
                                key: "biz", type: "group", label: t("businessManagement"), children: [
                                    { key: "tenants", icon: <TeamOutlined />, label: t("tenantManagement") },
                                ],
                            },
                            {
                                key: "sys", type: "group", label: t("systemManagement"), children: [
                                    { key: "aiConfig", icon: <SettingOutlined />, label: t("aiConfig") },
                                ],
                            },
                        ] : [
                            {
                                key: "biz", type: "group", label: t("businessManagement"), children: [
                                    { key: "overview",         icon: <DashboardOutlined />, label: t("dataOverview") },
                                    { key: "stores",           icon: <ShopOutlined />,      label: t("storeManagement") },
                                    { key: "products",         icon: <ShoppingOutlined />,  label: t("productManagement") },
                                    { key: "orders",           icon: <UnorderedListOutlined />, label: t("orderManagement") },
                                    { key: "revenueTrend",     icon: <LineChartOutlined />, label: t("revenueTrendView") },
                                    { key: "revenueCompare",   icon: <BarChartOutlined />,  label: t("revenueCompareView") },
                                    { key: "ordersCompare",    icon: <BarChartOutlined />,  label: t("ordersCompareView") },
                                    { key: "avgTicketCompare", icon: <BarChartOutlined />,  label: t("avgTicketCompareView") },
                                ],
                            },
                            {
                                key: "sys", type: "group", label: t("systemManagement"), children: [
                                    { key: "llmLogs",  icon: <HistoryOutlined />, label: t("llmLogs") },
                                    { key: "mcpLogs",  icon: <ToolOutlined />,    label: t("mcpLogs") },
                                ],
                            },
                        ]}
                    />
                )}

                {/* User info + locale switch */}
                <div style={{
                    padding: siderCollapsed ? "12px 0" : "10px 16px",
                    borderTop: "1px solid #f0f0f0",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: siderCollapsed ? "center" : "space-between",
                    overflow: "hidden",
                    flexShrink: 0,
                }}>
                    {siderCollapsed ? (
                        <Dropdown menu={userMenu} placement="topRight">
                            <Avatar size={24} icon={<UserOutlined />} style={{ backgroundColor: "#4F46E5", cursor: "pointer" }} />
                        </Dropdown>
                    ) : (
                        <>
                            <Dropdown menu={userMenu} placement="topLeft">
                                <div style={{ display: "flex", alignItems: "center", cursor: "pointer", flex: 1, minWidth: 0 }}>
                                    <Avatar size={28} icon={<UserOutlined />} style={{ backgroundColor: "#4F46E5", marginRight: 8, flexShrink: 0 }} />
                                    <div style={{ overflow: "hidden" }}>
                                        <Text style={{ fontSize: 12, display: "block", whiteSpace: "nowrap" }}>{user.username}</Text>
                                    </div>
                                </div>
                            </Dropdown>
                            <Space size={2}>
                                <Button size="small" type={locale === "en" ? "primary" : "default"} onClick={() => switchLocale("en")} style={{ borderRadius: 4, fontSize: 10, padding: "0 6px", minWidth: 28 }}>EN</Button>
                                <Button size="small" type={locale === "es" ? "primary" : "default"} onClick={() => switchLocale("es")} style={{ borderRadius: 4, fontSize: 10, padding: "0 6px", minWidth: 28 }}>ES</Button>
                            </Space>
                        </>
                    )}
                </div>
            </div>

            {/* Main content */}
            <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
                {loading ? (
                    <div style={{ display: "flex", justifyContent: "center", alignItems: "center", flex: 1 }}>
                        <Spin size="large" />
                    </div>
                ) : (
                    <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
                        <div style={{ flex: 1, overflow: "auto", padding: 20, paddingRight: 8 }}>
                            {activeMenu === "overview" && !isAdmin && (
                                <>
                                    <AIInsights stores={stores} tenantId={tenantId} />
                                    <KPI totalRevenue={totalRevenue} totalOrders={totalOrders} activeStores={activeStores} avgTicket={avgTicket} />
                                    <SalesChart stores={stores} selectedStore={selectedStore} />
                                </>
                            )}
                            {(activeMenu === "overview" || activeMenu === "stores") && !isAdmin && (
                                <StoreTable
                                    stores={stores}
                                    onSelectStore={setSelectedStore}
                                    selectedStore={selectedStore}
                                    expanded={activeMenu === "stores"}
                                    onStoreChange={() => loadData(false)}
                                />
                            )}
                            {activeMenu === "llmLogs"          && <LlmLogPanel tenantId={tenantId} />}
                            {activeMenu === "mcpLogs"          && <McpLogPanel tenantId={tenantId} />}
                            {activeMenu === "aiConfig"         && <AIConfigPanel />}
                            {activeMenu === "tenants"          && <TenantManagement />}
                            {activeMenu === "products"         && <ProductManagement tenantId={tenantId} stores={stores} />}
                            {activeMenu === "orders"           && <OrderManagement tenantId={tenantId} stores={stores} />}
                            {activeMenu === "revenueTrend"     && <ChartView stores={stores} mode="trend" />}
                            {activeMenu === "revenueCompare"   && <ChartView stores={stores} mode="revenue" />}
                            {activeMenu === "ordersCompare"    && <ChartView stores={stores} mode="orders" />}
                            {activeMenu === "avgTicketCompare" && <ChartView stores={stores} mode="avgTicket" />}
                        </div>

                        {/* Chat panel - only for non-admin users */}
                        {!isAdmin && (
                        <div style={{
                            width: chatWidth,
                            height: "100%",
                            transition: "width 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                            overflow: "hidden",
                            flexShrink: 0,
                            position: "relative",
                        }}>
                            {chatCollapsed ? (
                                <div
                                    onClick={() => setChatCollapsed(false)}
                                    style={{
                                        height: "100%",
                                        display: "flex",
                                        flexDirection: "column",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        cursor: "pointer",
                                        background: "#fff",
                                        borderRadius: 12,
                                        border: "1px solid #f0f0f0",
                                        boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
                                        margin: 8,
                                        transition: "background 0.2s",
                                    }}
                                    onMouseEnter={(e) => e.currentTarget.style.background = "#f5f5f7"}
                                    onMouseLeave={(e) => e.currentTarget.style.background = "#fff"}
                                >
                                    <img src={logo} alt="logo" style={{ width: 20, height: 20, marginBottom: 6 }} />
                                    <LeftOutlined style={{ fontSize: 12, color: "#8c8c8c" }} />
                                </div>
                            ) : (
                                <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
                                    <ChatPanel stores={stores} onActionComplete={() => loadData(false)} onCollapse={() => setChatCollapsed(true)} tenantId={tenantId} />
                                </div>
                            )}
                        </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}