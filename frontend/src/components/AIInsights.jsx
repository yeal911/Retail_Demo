import React, { useState, useEffect } from "react";
import { Card, Tag, Spin } from "antd";
import { AlertOutlined, WarningOutlined, InfoCircleOutlined } from "@ant-design/icons";
import { useI18n } from "../i18n";
import { llmInsights } from "../api/request";

const CACHE_KEY = "retail_copilot_insights";
const CACHE_TTL = 10 * 60 * 1000; // 10 minutes

const cardStyle = { borderRadius: 12, border: "none", boxShadow: "0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)", marginBottom: 16 };

const severityConfig = {
  high: { color: "#EF4444", bg: "#FEF2F2", border: "#FECACA", icon: <WarningOutlined /> },
  medium: { color: "#F59E0B", bg: "#FFFBEB", border: "#FDE68A", icon: <AlertOutlined /> },
  low: { color: "#3B82F6", bg: "#EFF6FF", border: "#BFDBFE", icon: <InfoCircleOutlined /> },
};

function loadCache() {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const cached = JSON.parse(raw);
    if (Date.now() - cached.timestamp > CACHE_TTL) return null;
    return cached.items;
  } catch { return null; }
}

function saveCache(items) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ items, timestamp: Date.now() }));
  } catch {}
}

export default function AIInsights({ stores, tenantId }) {
  const { t, locale } = useI18n();
  const [insights, setInsights] = useState(() => loadCache() || []);
  const [loading, setLoading] = useState(() => !loadCache());
  const [currentIdx, setCurrentIdx] = useState(0);

  useEffect(() => {
    const cached = loadCache();
    if (cached && cached.length > 0) {
      setInsights(cached);
      setLoading(false);
      return;
    }

    const fetchInsights = async () => {
      try {
        const summaryData = stores.map((s) => ({
          id: s.id, name: s.name, city: s.city, status: s.status,
          totalRevenue: Math.round(s.sales.reduce((a, b) => a + b.revenue, 0)),
          totalOrders: s.sales.reduce((a, b) => a + b.orders, 0),
          last7Days: s.sales.slice(-7).map((d) => ({
            date: new Date(d.date).toLocaleDateString(locale === "es" ? "es-MX" : "en-US"),
            revenue: Math.round(d.revenue), orders: d.orders,
          })),
        }));
        const res = await llmInsights(summaryData, locale, tenantId);
        if (res.data.success && res.data.result?.items) {
          setInsights(res.data.result.items);
          saveCache(res.data.result.items);
        }
      } catch {} finally { setLoading(false); }
    };
    fetchInsights();
  }, [stores, locale]);

  // Auto-rotate carousel every 4s
  useEffect(() => {
    if (insights.length <= 1) return;
    const timer = setInterval(() => {
      setCurrentIdx((prev) => (prev + 1) % insights.length);
    }, 4000);
    return () => clearInterval(timer);
  }, [insights.length]);

  if (loading) return (
    <Card style={cardStyle} size="small">
      <div style={{ textAlign: "center", padding: 8 }}>
        <Spin size="small" /> <span style={{ marginLeft: 8, fontSize: 12, color: "#9ca3af" }}>{t("insightsLoading")}</span>
      </div>
    </Card>
  );

  if (insights.length === 0) return null;

  const item = insights[currentIdx] || insights[0];
  const sev = severityConfig[item.severity] || severityConfig.medium;

  return (
    <Card
      title={
        <span style={{ fontSize: 13, fontWeight: 600, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span><AlertOutlined style={{ color: "#F59E0B", marginRight: 6 }} />{t("aiInsights")}</span>
          {insights.length > 1 && (
            <span style={{ fontSize: 11, fontWeight: 400, color: "#9ca3af" }}>{currentIdx + 1} / {insights.length}</span>
          )}
        </span>
      }
      style={cardStyle}
      styles={{ header: { borderBottom: "1px solid #f0f0f0", padding: "8px 16px", minHeight: 36 } }}
      size="small"
    >
      <div
        style={{
          display: "flex", alignItems: "flex-start", gap: 8,
          padding: "8px 12px", borderRadius: 8,
          background: sev.bg, border: `1px solid ${sev.border}`,
          transition: "all 0.4s ease-in-out",
        }}
      >
        <span style={{ color: sev.color, fontSize: 16, marginTop: 1, flexShrink: 0 }}>{sev.icon}</span>
        <span style={{ fontSize: 12, lineHeight: 1.6, color: "#374151", flex: 1 }}>{item.description}</span>
        <Tag
          color={item.severity === "high" ? "error" : item.severity === "medium" ? "warning" : "processing"}
          style={{ fontSize: 10, lineHeight: "16px", padding: "0 4px", margin: 0, flexShrink: 0 }}
        >
          {item.severity}
        </Tag>
      </div>
      {insights.length > 1 && (
        <div style={{ display: "flex", justifyContent: "center", gap: 4, marginTop: 8 }}>
          {insights.map((_, i) => (
            <div
              key={i}
              onClick={() => setCurrentIdx(i)}
              style={{
                width: 6, height: 6, borderRadius: "50%",
                background: i === currentIdx ? sev.color : "#d1d5db",
                cursor: "pointer",
                transition: "background 0.3s ease",
              }}
            />
          ))}
        </div>
      )}
    </Card>
  );
}
