import React, { useState, useEffect } from "react";
import { Card, Table, Tag, Select, Spin } from "antd";
import { useI18n } from "../i18n";
import { getProducts, getInventory } from "../api/request";

const cardStyle = { borderRadius: 12, border: "none", boxShadow: "0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)" };

export default function ProductManagement({ tenantId, stores }) {
  const { t } = useI18n();
  const [products, setProducts] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState("products");

  useEffect(() => {
    if (!tenantId) return;
    setLoading(true);
    Promise.all([getProducts(tenantId), getInventory({ tenantId })])
      .then(([pRes, iRes]) => {
        if (pRes.data.success) setProducts(pRes.data.data);
        if (iRes.data.success) setInventory(iRes.data.data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [tenantId]);

  if (loading) return <Spin />;

  const productColumns = [
    { title: t("productName"), dataIndex: "name", key: "name" },
    { title: "SKU", dataIndex: "sku", key: "sku", width: 120 },
    { title: t("category"), key: "category", width: 120, render: (_, r) => r.category?.name || "-" },
    { title: t("price"), dataIndex: "price", key: "price", width: 100, render: (v) => `$${v?.toLocaleString()}` },
    { title: t("cost"), dataIndex: "cost", key: "cost", width: 100, render: (v) => `$${v?.toLocaleString()}` },
    {
      title: t("margin"), key: "margin", width: 80,
      render: (_, r) => {
        const m = r.price > 0 ? ((r.price - r.cost) / r.price * 100).toFixed(1) : 0;
        return <Tag color={m > 40 ? "green" : m > 20 ? "orange" : "red"}>{m}%</Tag>;
      },
    },
  ];

  const invColumns = [
    { title: t("productName"), key: "product", render: (_, r) => r.product?.name || "-" },
    { title: "SKU", key: "sku", render: (_, r) => r.product?.sku || "-" },
    { title: t("storeName"), key: "store", render: (_, r) => r.store?.name || "-" },
    { title: t("quantity"), dataIndex: "quantity", key: "quantity", width: 80 },
    {
      title: t("status"), key: "status", width: 80,
      render: (_, r) => <Tag color={r.quantity <= r.reorderLevel ? "red" : "green"}>{r.quantity <= r.reorderLevel ? t("lowStock") : t("inStock")}</Tag>,
    },
  ];

  return (
    <div>
      <div style={{ marginBottom: 12, display: "flex", gap: 8 }}>
        <Select value={view} onChange={setView} style={{ width: 150 }} options={[
          { value: "products", label: t("productList") },
          { value: "inventory", label: t("inventoryView") },
        ]} />
      </div>
      {view === "products" ? (
        <Card title={t("productList")} style={cardStyle} styles={{ header: { borderBottom: "1px solid #f0f0f0", fontSize: 14, fontWeight: 600 } }}>
          <Table columns={productColumns} dataSource={products} rowKey="id" size="middle" pagination={{ pageSize: 15 }} />
        </Card>
      ) : (
        <Card title={t("inventoryView")} style={cardStyle} styles={{ header: { borderBottom: "1px solid #f0f0f0", fontSize: 14, fontWeight: 600 } }}>
          <Table columns={invColumns} dataSource={inventory} rowKey="id" size="middle" pagination={{ pageSize: 20 }} />
        </Card>
      )}
    </div>
  );
}
