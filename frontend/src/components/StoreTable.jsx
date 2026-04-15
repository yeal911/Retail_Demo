import React, { useState } from "react";
import { Card, Table, Tag, Switch, InputNumber, message } from "antd";
import { useI18n } from "../i18n";
import { updateStoreStatus, setStoreTarget } from "../api/request";

const cardStyle = { borderRadius: 12, border: "none", boxShadow: "0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)" };

function formatMXN(v) {
  if (v >= 1000000) return `$${(v / 1000000).toFixed(1)}M`;
  if (v >= 1000) return `$${(v / 1000).toFixed(1)}K`;
  return `$${v.toFixed(0)}`;
}

// Filter out 2099 target records for revenue/orders calculation
function realSales(sales) {
  return sales.filter((s) => new Date(s.date).getFullYear() !== 2099);
}

export default function StoreTable({ stores, onSelectStore, selectedStore, expanded, onStoreChange }) {
  const { t } = useI18n();
  const [targetEditing, setTargetEditing] = useState(null);
  const [targetValue, setTargetValue] = useState(null);

  const handleStatusChange = async (storeId, checked) => {
    const status = checked ? "active" : "inactive";
    try {
      await updateStoreStatus(storeId, status);
      message.success(t("statusUpdated"));
      onStoreChange?.();
    } catch {
      message.error(t("statusUpdateFailed"));
    }
  };

  const handleTargetSubmit = async (storeId) => {
    if (targetValue == null || isNaN(targetValue)) {
      setTargetEditing(null);
      return;
    }
    try {
      await setStoreTarget(storeId, targetValue);
      message.success(t("targetUpdated"));
      setTargetEditing(null);
      setTargetValue(null);
      onStoreChange?.();
    } catch {
      message.error(t("targetUpdateFailed"));
    }
  };

  const columns = [
    {
      title: t("storeName"), dataIndex: "name", key: "name",
      render: (text, record) => (
        <a onClick={() => onSelectStore(selectedStore === record.id ? null : record.id)}
          style={{ color: selectedStore === record.id ? "#4F46E5" : "#1890ff", fontWeight: selectedStore === record.id ? 600 : 400 }}>
          {text}
        </a>
      ),
    },
    { title: t("city"), dataIndex: "city", key: "city", width: 100 },
    { title: t("manager"), dataIndex: "manager", key: "manager", width: 100 },
    {
      title: t("status"), dataIndex: "status", key: "status", width: 100,
      render: (status, record) => (
        <Switch
          checked={status === "active"}
          onChange={(checked) => handleStatusChange(record.id, checked)}
          checkedChildren={t("statusActive")}
          unCheckedChildren={t("statusInactive")}
          size="small"
        />
      ),
    },
    {
      title: t("revenue30d"), key: "revenue", width: 120,
      render: (_, record) => formatMXN(realSales(record.sales).reduce((sum, s) => sum + s.revenue, 0)),
      sorter: (a, b) => realSales(a.sales).reduce((s, x) => s + x.revenue, 0) - realSales(b.sales).reduce((s, x) => s + x.revenue, 0),
    },
    {
      title: t("orders30d"), key: "orders", width: 100,
      render: (_, record) => realSales(record.sales).reduce((sum, s) => sum + s.orders, 0).toLocaleString(),
      sorter: (a, b) => realSales(a.sales).reduce((s, x) => s + x.orders, 0) - realSales(b.sales).reduce((s, x) => s + x.orders, 0),
    },
    {
      title: t("avgTicketCol"), key: "avgTicket", width: 110,
      render: (_, record) => {
        const rs = realSales(record.sales);
        const totalRev = rs.reduce((s, x) => s + x.revenue, 0);
        const totalOrd = rs.reduce((s, x) => s + x.orders, 0);
        return totalOrd > 0 ? `$${(totalRev / totalOrd).toFixed(0)}` : "-";
      },
    },
    {
      title: t("salesTarget"), key: "target", width: 140,
      render: (_, record) => {
        if (targetEditing === record.id) {
          return (
            <InputNumber
              defaultValue={record.currentTarget || undefined}
              min={0}
              step={1000}
              formatter={(v) => `$${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")}
              parser={(v) => v.replace(/\$\s?|(,*)/g, "")}
              onChange={(v) => setTargetValue(v)}
              onBlur={() => handleTargetSubmit(record.id)}
              onPressEnter={() => handleTargetSubmit(record.id)}
              onKeyDown={(e) => { if (e.key === "Escape") { setTargetEditing(null); setTargetValue(null); } }}
              size="small"
              style={{ width: 120 }}
              autoFocus
            />
          );
        }
        const target = record.currentTarget;
        return (
          <span
            onClick={() => { setTargetEditing(record.id); setTargetValue(record.currentTarget || null); }}
            style={{ cursor: "pointer" }}
          >
            {target ? <span style={{ color: "#4F46E5", fontWeight: 600 }}>{formatMXN(target)}</span> : <span style={{ color: "#d1d5db" }}>+</span>}
          </span>
        );
      },
      sorter: (a, b) => (a.currentTarget || 0) - (b.currentTarget || 0),
    },
  ];

  return (
    <Card title={t("storeList")} style={cardStyle}
      styles={{ header: { borderBottom: "1px solid #f0f0f0", fontSize: 14, fontWeight: 600 } }}>
      <Table columns={columns} dataSource={stores} rowKey="id" size="middle"
        pagination={{ pageSize: expanded ? 15 : 10, showSizeChanger: false }}
        rowClassName={(record) => selectedStore === record.id ? "ant-table-row-selected" : ""}
        style={{ fontSize: 13 }} />
    </Card>
  );
}
