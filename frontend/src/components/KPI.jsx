import React from "react";
import { Row, Col, Card, Statistic } from "antd";
import { DollarOutlined, ShoppingCartOutlined, ShopOutlined, RiseOutlined } from "@ant-design/icons";
import { useI18n } from "../i18n";

const kpiStyle = { borderRadius: 12, border: "none", boxShadow: "0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)", padding: "12px 16px" };

function formatMXN(v) {
  if (v >= 1000000) return `$${(v / 1000000).toFixed(1)}M`;
  if (v >= 1000) return `$${(v / 1000).toFixed(1)}K`;
  return `$${v.toFixed(0)}`;
}

export default function KPI({ totalRevenue, totalOrders, activeStores, avgTicket }) {
  const { t } = useI18n();

  return (
    <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
      <Col span={6}>
        <Card style={kpiStyle}>
          <Statistic title={t("totalRevenue")} value={totalRevenue} precision={0}
            valueStyle={{ color: "#4F46E5", fontSize: 24, fontWeight: 700 }}
            formatter={(v) => formatMXN(v)} />
          <div style={{ marginTop: 8, display: "flex", alignItems: "center", gap: 6 }}>
            <DollarOutlined style={{ color: "#4F46E5", fontSize: 14 }} />
            <span style={{ fontSize: 12, color: "#8c8c8c" }}>{t("last30Days")}</span>
          </div>
        </Card>
      </Col>
      <Col span={6}>
        <Card style={kpiStyle}>
          <Statistic title={t("totalOrders")} value={totalOrders}
            valueStyle={{ color: "#10B981", fontSize: 24, fontWeight: 700 }}
            formatter={(v) => v.toLocaleString()} />
          <div style={{ marginTop: 8, display: "flex", alignItems: "center", gap: 6 }}>
            <ShoppingCartOutlined style={{ color: "#10B981", fontSize: 14 }} />
            <span style={{ fontSize: 12, color: "#8c8c8c" }}>{t("last30Days")}</span>
          </div>
        </Card>
      </Col>
      <Col span={6}>
        <Card style={kpiStyle}>
          <Statistic title={t("activeStores")} value={activeStores}
            valueStyle={{ color: "#F59E0B", fontSize: 24, fontWeight: 700 }} />
          <div style={{ marginTop: 8, display: "flex", alignItems: "center", gap: 6 }}>
            <ShopOutlined style={{ color: "#F59E0B", fontSize: 14 }} />
            <span style={{ fontSize: 12, color: "#8c8c8c" }}>{t("operating")}</span>
          </div>
        </Card>
      </Col>
      <Col span={6}>
        <Card style={kpiStyle}>
          <Statistic title={t("avgTicket")} value={avgTicket} precision={0}
            prefix="$" valueStyle={{ color: "#EF4444", fontSize: 24, fontWeight: 700 }} />
          <div style={{ marginTop: 8, display: "flex", alignItems: "center", gap: 6 }}>
            <RiseOutlined style={{ color: "#EF4444", fontSize: 14 }} />
            <span style={{ fontSize: 12, color: "#8c8c8c" }}>{t("revenuePerOrder")}</span>
          </div>
        </Card>
      </Col>
    </Row>
  );
}
