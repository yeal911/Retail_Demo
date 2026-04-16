import React, { useState, useEffect } from "react";
import { Card, Table, Tag, Spin } from "antd";
import { useI18n } from "../i18n";
import { getProducts } from "../api/request";

const cardStyle = { borderRadius: 12, border: "none", boxShadow: "0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)" };

export default function ProductManagement({ tenantId, refreshKey }) {
  const { t } = useI18n();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!tenantId) return;
    setLoading(true);
    getProducts(tenantId)
      .then((pRes) => {
        if (pRes.data.success) setProducts(pRes.data.data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [tenantId, refreshKey]);

  if (loading) return <Spin />;

  const columns = [
    { title: t("productName"), dataIndex: "name", key: "name" },
    { title: "SKU", dataIndex: "sku", key: "sku", width: 120 },
    { title: t("category"), key: "category", width: 120, render: (_, r) => r.category?.name || "-" },
    { title: t("price"), dataIndex: "price", key: "price", width: 100, render: (v) => `$${v?.toLocaleString()}`, sorter: (a, b) => a.price - b.price },
    { title: t("cost"), dataIndex: "cost", key: "cost", width: 100, render: (v) => `$${v?.toLocaleString()}`, sorter: (a, b) => a.cost - b.cost },
    {
      title: t("margin"), key: "margin", width: 80,
      render: (_, r) => {
        const m = r.price > 0 ? ((r.price - r.cost) / r.price * 100).toFixed(1) : 0;
        return <Tag color={m > 40 ? "green" : m > 20 ? "orange" : "red"}>{m}%</Tag>;
      },
      sorter: (a, b) => {
        const ma = a.price > 0 ? (a.price - a.cost) / a.price : 0;
        const mb = b.price > 0 ? (b.price - b.cost) / b.price : 0;
        return ma - mb;
      },
    },
  ];

  return (
    <Card title={t("productList")} style={cardStyle}
      styles={{ header: { borderBottom: "1px solid #f0f0f0", fontSize: 14, fontWeight: 600 } }}>
      <Table columns={columns} dataSource={products} rowKey="id" size="middle" pagination={{ pageSize: 15 }} />
    </Card>
  );
}
