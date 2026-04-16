import React, { useState, useRef, useEffect, memo } from "react";
import { Input, Button, Card, Typography, Tag, Spin, Table } from "antd";
import { SendOutlined, UserOutlined, ThunderboltOutlined, CheckCircleOutlined, BarChartOutlined, BulbOutlined, FileTextOutlined, RightOutlined } from "@ant-design/icons";
import { llmAgent, getConfig, getProducts, getInventory } from "../api/request";
import { useI18n } from "../i18n";
import logo from "../assets/logo.png";

const { Text } = Typography;

export default memo(function ChatPanel({ stores, onActionComplete, onCollapse, tenantId }) {
  const { t, locale } = useI18n();
  const dateLocale = locale === "es" ? "es-MX" : "en-US";

  const [messages, setMessages] = useState([
    { role: "assistant", content: t("welcomeMessage") },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [modelName, setModelName] = useState("");
  const [products, setProducts] = useState([]);
  const [inventory, setInventory] = useState([]);
  const scrollRef = useRef(null);

  useEffect(() => {
    getConfig().then(res => {
      if (res.data.success) setModelName(res.data.data.modelName);
    }).catch(() => {});
  }, []);

  // Fetch products & inventory for LLM context
  useEffect(() => {
    if (!tenantId) return;
    Promise.all([getProducts(tenantId), getInventory({ tenantId })])
      .then(([pRes, iRes]) => {
        if (pRes.data.success) setProducts(pRes.data.data);
        if (iRes.data.success) setInventory(iRes.data.data);
      })
      .catch(() => {});
  }, [tenantId]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  const handleSend = async () => {
    const question = input.trim();
    if (!question || loading) return;

    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: question }]);
    setLoading(true);

    try {
      const storesData = stores.map((s) => ({
        id: s.id,
        name: s.name,
        city: s.city,
        status: s.status,
        totalRevenue: Math.round(s.sales.reduce((a, b) => a + b.revenue, 0)),
        totalOrders: s.sales.reduce((a, b) => a + b.orders, 0),
        last7Days: s.sales.slice(-7).map((d) => ({
          date: new Date(d.date).toLocaleDateString(dateLocale),
          revenue: Math.round(d.revenue),
          orders: d.orders,
        })),
      }));

      const productsData = products.map((p) => ({
        id: p.id,
        name: p.name,
        sku: p.sku,
        price: p.price,
        cost: p.cost,
        category: p.category?.name || p.categoryId,
      }));

      const inventoryData = inventory.map((i) => ({
        storeId: i.storeId,
        storeName: i.store?.name || "",
        productId: i.productId,
        productName: i.product?.name || "",
        quantity: i.quantity,
        reorderLevel: i.reorderLevel,
        lowStock: i.quantity <= i.reorderLevel,
      }));

      const summaryData = { stores: storesData, products: productsData, inventory: inventoryData };

      const res = await llmAgent(summaryData, question, locale, tenantId);
      const result = res.data.result;

      setMessages((prev) => [...prev, { role: "assistant", content: "", result }]);

      if ((result?.type === "action" || result?.type === "batch") && onActionComplete) {
        setTimeout(() => onActionComplete(), 500);
      }
    } catch {
      setMessages((prev) => [...prev, { role: "assistant", content: "Request failed. Please check backend and LLM config." }]);
    } finally {
      setLoading(false);
    }
  };

  const renderResult = (result) => {
    switch (result.type) {
      case "action":
        return (
          <>
            <div style={{ marginBottom: 8 }}>
              <Tag icon={<ThunderboltOutlined />} color="processing" style={{ marginRight: 4 }}>{t("executeAction")}</Tag>
              <Text style={{ fontSize: 12, color: "#8c8c8c" }}>{result.tool}</Text>
            </div>
            <div style={{ background: "#f6ffed", border: "1px solid #b7eb8f", borderRadius: 8, padding: "8px 12px" }}>
              <Text style={{ fontSize: 12, color: "#52c41a", fontWeight: 600 }}>✅ {result.result?.message || t("actionSuccess")}</Text>
            </div>
          </>
        );

      case "report":
        return (
          <div style={{ fontSize: 12 }}>
            <div style={{ marginBottom: 8, fontWeight: 600, color: "#4F46E5" }}><FileTextOutlined style={{ marginRight: 4 }} />{t("reportTitle")}</div>
            <div style={{ background: "#f8fafc", borderRadius: 8, padding: 10, marginBottom: 8 }}>
              <Text strong style={{ fontSize: 11, color: "#6b7280" }}>{t("reportSummary")}</Text>
              <div style={{ marginTop: 4 }}>{result.summary}</div>
            </div>
            {result.bestStores?.length > 0 && (
              <div style={{ marginBottom: 6 }}><Text strong style={{ fontSize: 11, color: "#10B981" }}>🏆 {t("reportBestStores")}</Text>
                {result.bestStores.map((s, i) => <div key={i} style={{ marginLeft: 8, marginTop: 2 }}>• {s.name}: {s.reason}</div>)}
              </div>
            )}
            {result.riskStores?.length > 0 && (
              <div style={{ marginBottom: 6 }}><Text strong style={{ fontSize: 11, color: "#EF4444" }}>⚠️ {t("reportRiskStores")}</Text>
                {result.riskStores.map((s, i) => <div key={i} style={{ marginLeft: 8, marginTop: 2 }}>• {s.name}: {s.reason}</div>)}
              </div>
            )}
            {result.recommendations?.length > 0 && (
              <div><Text strong style={{ fontSize: 11, color: "#F59E0B" }}>💡 {t("reportRecommendations")}</Text>
                {result.recommendations.map((r, i) => <div key={i} style={{ marginLeft: 8, marginTop: 2 }}>• {r}</div>)}
              </div>
            )}
          </div>
        );

      case "batch":
        return (
          <div style={{ fontSize: 12 }}>
            <div style={{ marginBottom: 8 }}><Tag icon={<ThunderboltOutlined />} color="orange">{t("batchResult")}</Tag></div>
            <div style={{ background: "#fff7ed", border: "1px solid #fed7aa", borderRadius: 8, padding: 10 }}>
              <Text style={{ color: "#c2410c", fontWeight: 600 }}>✅ {result.count} {t("batchCount")}</Text>
              <div style={{ marginTop: 6, maxHeight: 80, overflow: "auto" }}>
                {result.results?.slice(0, 10).map((r, i) => (
                  <div key={i} style={{ fontSize: 11, marginTop: 2 }}>• {r.storeName}: {r.result?.message}</div>
                ))}
              </div>
            </div>
          </div>
        );

      case "query":
        return (
          <div style={{ fontSize: 12 }}>
            <div style={{ marginBottom: 6 }}><Tag icon={<BarChartOutlined />} color="blue">{t("queryResult")}</Tag></div>
            {result.summary && <div style={{ marginBottom: 6, color: "#6b7280" }}>{result.summary}</div>}
            <Table columns={result.columns?.map((c) => ({ title: c, dataIndex: c, key: c })) || []}
              dataSource={result.rows?.map((row, i) => {
                const obj = {};
                result.columns?.forEach((c, j) => { obj[c] = row[j]; });
                return { ...obj, key: i };
              }) || []}
              size="small" pagination={false} scroll={{ x: true }}
              style={{ fontSize: 11 }} />
          </div>
        );

      case "suggestions":
        return (
          <div style={{ fontSize: 12 }}>
            <div style={{ marginBottom: 8 }}><Tag icon={<BulbOutlined />} color="gold">{t("suggestionsTitle")}</Tag></div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {result.items?.map((item, i) => (
                <div key={i} style={{ background: "#fefce8", border: "1px solid #fde68a", borderRadius: 8, padding: "8px 10px" }}>
                  <div style={{ fontWeight: 600, marginBottom: 2 }}>{item.title}</div>
                  <div style={{ color: "#6b7280", fontSize: 11, marginBottom: 4 }}>{item.reason}</div>
                  {item.impact && <div style={{ color: "#b45309", fontSize: 11, marginBottom: 4 }}>🎯 {t("suggestionImpact")}: {item.impact}</div>}
                  <Button size="small" type="primary" icon={<CheckCircleOutlined />}
                    onClick={async () => {
                       try {
                         const storesData = stores.map((s) => ({ id: s.id, name: s.name, city: s.city, status: s.status, totalRevenue: Math.round(s.sales.reduce((a, b) => a + b.revenue, 0)), totalOrders: s.sales.reduce((a, b) => a + b.orders, 0) }));
                         const productsData = products.map((p) => ({ id: p.id, name: p.name, sku: p.sku, price: p.price, cost: p.cost, category: p.category?.name || p.categoryId }));
                         const inventoryData = inventory.map((i) => ({ storeId: i.storeId, storeName: i.store?.name || "", productId: i.productId, productName: i.product?.name || "", quantity: i.quantity, reorderLevel: i.reorderLevel, lowStock: i.quantity <= i.reorderLevel }));
                         const summaryData = { stores: storesData, products: productsData, inventory: inventoryData };
                         const res = await llmAgent(summaryData, JSON.stringify({ tool: item.tool, params: item.params }), locale, tenantId);
                        const r = res.data.result;
                        setMessages((prev) => [...prev, { role: "assistant", content: "", result: r }]);
                        if ((r?.type === "action" || r?.type === "batch") && onActionComplete) setTimeout(() => onActionComplete(), 500);
                      } catch {}
                    }}
                    style={{ borderRadius: 6, fontSize: 11 }}>
                    {t("suggestionExecute")}
                  </Button>
                </div>
              ))}
            </div>
          </div>
        );

      default:
        return <div style={{ whiteSpace: "pre-wrap" }}>{result.content || JSON.stringify(result)}</div>;
    }
  };

  const renderMessage = (msg, idx) => {
    const isUser = msg.role === "user";
    return (
      <div key={idx} className="chat-msg" style={{ display: "flex", gap: 8, marginBottom: 16, flexDirection: isUser ? "row-reverse" : "row" }}>
        <div style={{ width: 32, height: 32, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, background: isUser ? "#4F46E5" : "#f0f0f0" }}>
          {isUser ? <UserOutlined style={{ color: "#fff", fontSize: 14 }} /> : <img src={logo} alt="AI" style={{ width: 14, height: 14 }} />}
        </div>
        <div style={{ maxWidth: "85%", padding: "10px 14px", borderRadius: isUser ? "12px 12px 2px 12px" : "12px 12px 12px 2px", background: isUser ? "#4F46E5" : "#fff", color: isUser ? "#fff" : "#333", boxShadow: "0 1px 2px rgba(0,0,0,0.06)", fontSize: 13, lineHeight: 1.6 }}>
          {msg.result ? renderResult(msg.result) : (
            <div style={{ whiteSpace: "pre-wrap" }}>{msg.content}</div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div style={{
      height: "100%", display: "flex", flexDirection: "column",
      background: "#fff", borderRadius: 12,
      boxShadow: "0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)",
      overflow: "hidden",
    }}>
      {/* Header */}
      <div style={{ padding: "8px 12px", borderBottom: "1px solid #f0f0f0", display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
        {onCollapse && (
          <div onClick={onCollapse} style={{ cursor: "pointer", color: "#bfbfbf", fontSize: 13, lineHeight: 1, transition: "color 0.2s", flexShrink: 0 }}
            onMouseEnter={(e) => e.currentTarget.style.color = "#4F46E5"}
            onMouseLeave={(e) => e.currentTarget.style.color = "#bfbfbf"}>
            <RightOutlined />
          </div>
        )}
        <img src={logo} alt="AI" style={{ width: 15, height: 15 }} />
        <Text strong style={{ fontSize: 13 }}>{t("aiAssistant")}</Text>
        {modelName && <Tag color="purple" style={{ fontSize: 10, lineHeight: "16px", padding: "0 4px" }}>{modelName}</Tag>}
      </div>

      {/* Messages */}
      <div ref={scrollRef} style={{ flex: 1, overflow: "auto", padding: "8px 12px", minHeight: 0 }}>
        {messages.map(renderMessage)}
        {loading && (
          <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
            <div style={{ width: 28, height: 28, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", background: "#f0f0f0" }}>
              <img src={logo} alt="AI" style={{ width: 12, height: 12 }} />
            </div>
            <div style={{ padding: "8px 12px", borderRadius: "12px 12px 12px 2px", background: "#fff", boxShadow: "0 1px 2px rgba(0,0,0,0.06)" }}>
              <Spin size="small" />
              <Text type="secondary" style={{ marginLeft: 6, fontSize: 11 }}>{t("thinking")}</Text>
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div style={{ padding: "8px 10px", borderTop: "1px solid #f0f0f0", display: "flex", gap: 6, flexShrink: 0 }}>
        <Input value={input} onChange={(e) => setInput(e.target.value)} onPressEnter={handleSend}
          placeholder={t("inputPlaceholder")} disabled={loading} style={{ borderRadius: 8, fontSize: 13 }} />
        <Button type="primary" icon={<SendOutlined />} onClick={handleSend} loading={loading} style={{ borderRadius: 8, width: 36 }} />
      </div>
    </div>
  );
});
