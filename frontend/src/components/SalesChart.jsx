import React, { useMemo } from "react";
import { Card, Row, Col } from "antd";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts";
import { useI18n } from "../i18n";

const cardStyle = { borderRadius: 12, border: "none", boxShadow: "0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)" };
const COLORS = ["#4F46E5", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6", "#06B6D4", "#EC4899", "#14B8A6", "#F97316", "#6366F1"];

// Filter out 2099 sales target records
const realSales = (sales) => sales.filter((s) => new Date(s.date).getFullYear() !== 2099);

export default function SalesChart({ stores, selectedStore }) {
  const { t, locale } = useI18n();
  const dateLocale = locale === "es" ? "es-MX" : "en-US";

  const targetStores = selectedStore ? stores.filter((s) => s.id === selectedStore) : stores;

  const { lineData, barData } = useMemo(() => {
    const dateMap = {};
    targetStores.forEach((store) => {
      realSales(store.sales).forEach((sale) => {
        const d = new Date(sale.date);
        const dateStr = `${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getDate()).padStart(2, "0")}`;
        if (!dateMap[dateStr]) dateMap[dateStr] = { date: dateStr };
        dateMap[dateStr][store.name] = sale.revenue;
      });
    });
    const line = Object.values(dateMap).sort((a, b) => a.date.localeCompare(b.date));
    const bar = targetStores.map((store) => {
      const rs = realSales(store.sales);
      const totalRev = rs.reduce((sum, s) => sum + s.revenue, 0);
      const totalOrd = rs.reduce((sum, s) => sum + s.orders, 0);
      return {
        name: store.name.length > 12 ? store.name.slice(0, 12) + "…" : store.name,
        revenue: totalRev,
        orders: totalOrd,
        avgTicket: totalOrd > 0 ? totalRev / totalOrd : 0,
      };
    });
    return { lineData: line, barData: bar };
  }, [stores, selectedStore, dateLocale]);

  const barHeight = Math.max(200, targetStores.length * 28);

  return (
    <div style={{ marginBottom: 20 }}>
      {/* Revenue Trend — full width */}
      <Card title={t("revenueTrend")} style={{ ...cardStyle, marginBottom: 16, overflow: "visible", position: "relative", zIndex: 10 }}
        styles={{ header: { borderBottom: "1px solid #f0f0f0", fontSize: 14, fontWeight: 600 }, body: { overflow: "visible" } }}>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={lineData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="date" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip formatter={(value, name) => [`$${value.toFixed(0)}`, name]} contentStyle={{ borderRadius: 8, fontSize: 12 }} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            {targetStores.map((store, idx) => (
              <Line key={store.id} type="monotone" dataKey={store.name} stroke={COLORS[idx % COLORS.length]} strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </Card>

      {/* Store Comparison — 3 charts in a row */}
      <Row gutter={[16, 16]}>
        <Col span={8}>
          <Card title={`${t("storeComparison")} — ${t("revenue")}`} style={cardStyle}
            styles={{ header: { borderBottom: "1px solid #f0f0f0", fontSize: 14, fontWeight: 600 } }}>
            <ResponsiveContainer width="100%" height={barHeight}>
              <BarChart data={barData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis type="number" tick={{ fontSize: 10 }} tickFormatter={(v) => v >= 1000 ? `${(v/1000).toFixed(0)}K` : v} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={80} />
                <Tooltip formatter={(value) => [`$${value.toFixed(0)}`, t("revenue")]} contentStyle={{ borderRadius: 8, fontSize: 12 }} />
                <Bar dataKey="revenue" fill="#4F46E5" radius={[0, 4, 4, 0]} barSize={16} />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </Col>
        <Col span={8}>
          <Card title={`${t("storeComparison")} — ${t("orders")}`} style={cardStyle}
            styles={{ header: { borderBottom: "1px solid #f0f0f0", fontSize: 14, fontWeight: 600 } }}>
            <ResponsiveContainer width="100%" height={barHeight}>
              <BarChart data={barData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis type="number" tick={{ fontSize: 10 }} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={80} />
                <Tooltip formatter={(value) => [value, t("orders")]} contentStyle={{ borderRadius: 8, fontSize: 12 }} />
                <Bar dataKey="orders" fill="#10B981" radius={[0, 4, 4, 0]} barSize={16} />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </Col>
        <Col span={8}>
          <Card title={`${t("storeComparison")} — ${t("avgTicket")}`} style={cardStyle}
            styles={{ header: { borderBottom: "1px solid #f0f0f0", fontSize: 14, fontWeight: 600 } }}>
            <ResponsiveContainer width="100%" height={barHeight}>
              <BarChart data={barData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis type="number" tick={{ fontSize: 10 }} tickFormatter={(v) => `$${v.toFixed(0)}`} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={80} />
                <Tooltip formatter={(value) => [`$${value.toFixed(0)}`, t("avgTicket")]} contentStyle={{ borderRadius: 8, fontSize: 12 }} />
                <Bar dataKey="avgTicket" fill="#F59E0B" radius={[0, 4, 4, 0]} barSize={16} />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </Col>
      </Row>
    </div>
  );
}
