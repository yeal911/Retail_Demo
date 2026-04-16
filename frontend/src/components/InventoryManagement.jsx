import React, { useState, useEffect } from "react";
import { Card, Table, Tag, Select, Input, Spin, Row, Col, Statistic } from "antd";
import { InboxOutlined, WarningOutlined } from "@ant-design/icons";
import { useI18n } from "../i18n";
import { getInventory, getProducts } from "../api/request";

const cardStyle = { borderRadius: 12, border: "none", boxShadow: "0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)" };

export default function InventoryManagement({ tenantId, stores, refreshKey }) {
  const { t } = useI18n();
  const [inventory, setInventory] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStore, setFilterStore] = useState(null);
  const [filterProduct, setFilterProduct] = useState(null);

  useEffect(() => {
    if (!tenantId) return;
    setLoading(true);
    Promise.all([getInventory({ tenantId }), getProducts(tenantId)])
      .then(([iRes, pRes]) => {
        if (iRes.data.success) setInventory(iRes.data.data);
        if (pRes.data.success) setProducts(pRes.data.data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [tenantId, refreshKey]);

  if (loading) return <Spin />;

  const lowStockCount = inventory.filter((i) => i.quantity <= i.reorderLevel).length;
  const outOfStockCount = inventory.filter((i) => i.quantity === 0).length;
  const totalQuantity = inventory.reduce((sum, i) => sum + i.quantity, 0);

  const filtered = inventory.filter((i) => {
    if (filterStore && i.storeId !== filterStore) return false;
    if (filterProduct && i.productId !== filterProduct) return false;
    return true;
  });

  const columns = [
    { title: t("productName"), key: "product", render: (_, r) => r.product?.name || "-", sorter: (a, b) => (a.product?.name || "").localeCompare(b.product?.name || "") },
    { title: "SKU", key: "sku", width: 110, render: (_, r) => r.product?.sku || "-" },
    { title: t("storeName"), key: "store", width: 160, render: (_, r) => r.store?.name || "-", sorter: (a, b) => (a.store?.name || "").localeCompare(b.store?.name || "") },
    {
      title: t("quantity"), dataIndex: "quantity", key: "quantity", width: 80,
      sorter: (a, b) => a.quantity - b.quantity,
    },
    {
      title: t("status"), key: "status", width: 90,
      render: (_, r) => {
        if (r.quantity === 0) return <Tag color="red">{t("outOfStock")}</Tag>;
        if (r.quantity <= r.reorderLevel) return <Tag color="orange">{t("lowStock")}</Tag>;
        return <Tag color="green">{t("inStock")}</Tag>;
      },
      sorter: (a, b) => a.quantity - b.quantity,
    },
  ];

  return (
    <div>
      {/* Summary */}
      <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
        <Col span={6}>
          <Card style={{ borderRadius: 12, border: "none", boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }} styles={{ body: { padding: "12px 16px" } }}>
            <Statistic title={t("inventoryView")} value={inventory.length}
              valueStyle={{ color: "#4F46E5", fontSize: 24, fontWeight: 700 }}
              prefix={<InboxOutlined />} />
          </Card>
        </Col>
        <Col span={6}>
          <Card style={{ borderRadius: 12, border: "none", boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }} styles={{ body: { padding: "12px 16px" } }}>
            <Statistic title={t("lowStock")} value={lowStockCount}
              valueStyle={{ color: lowStockCount > 0 ? "#F59E0B" : "#10B981", fontSize: 24, fontWeight: 700 }}
              prefix={<WarningOutlined />} />
          </Card>
        </Col>
        <Col span={6}>
          <Card style={{ borderRadius: 12, border: "none", boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }} styles={{ body: { padding: "12px 16px" } }}>
            <Statistic title={t("outOfStock")} value={outOfStockCount}
              valueStyle={{ color: outOfStockCount > 0 ? "#EF4444" : "#10B981", fontSize: 24, fontWeight: 700 }} />
          </Card>
        </Col>
        <Col span={6}>
          <Card style={{ borderRadius: 12, border: "none", boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }} styles={{ body: { padding: "12px 16px" } }}>
            <Statistic title={t("totalQuantity")} value={totalQuantity}
              valueStyle={{ color: "#8B5CF6", fontSize: 24, fontWeight: 700 }}
              formatter={(v) => v.toLocaleString()} />
          </Card>
        </Col>
      </Row>

      {/* Filters */}
      <div style={{ marginBottom: 12, display: "flex", gap: 8 }}>
        <Select
          value={filterStore}
          onChange={setFilterStore}
          placeholder={t("filterByStore")}
          allowClear
          showSearch
          optionFilterProp="label"
          style={{ width: 200 }}
          options={stores.map((s) => ({ value: s.id, label: s.name }))}
        />
        <Select
          value={filterProduct}
          onChange={setFilterProduct}
          placeholder={t("filterByProduct")}
          allowClear
          showSearch
          optionFilterProp="label"
          style={{ width: 200 }}
          options={products.map((p) => ({ value: p.id, label: p.name }))}
        />
      </div>

      <Card title={`${t("inventoryView")} (${filtered.length})`} style={cardStyle}
        styles={{ header: { borderBottom: "1px solid #f0f0f0", fontSize: 14, fontWeight: 600 } }}>
        <Table columns={columns} dataSource={filtered} rowKey="id" size="middle"
          pagination={{ pageSize: 20, showSizeChanger: true }} />
      </Card>
    </div>
  );
}
