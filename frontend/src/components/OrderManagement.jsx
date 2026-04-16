import React, { useState, useEffect } from "react";
import { Card, Table, Tag, Select, DatePicker, Spin } from "antd";
import { useI18n } from "../i18n";
import { getOrders, getProducts } from "../api/request";

const { RangePicker } = DatePicker;

const cardStyle = { borderRadius: 12, border: "none", boxShadow: "0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)" };

export default function OrderManagement({ tenantId, stores, refreshKey }) {
  const { t } = useI18n();
  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [storeId, setStoreId] = useState(null);
  const [productId, setProductId] = useState(null);
  const [dateRange, setDateRange] = useState(null);

  const loadData = (p = page, sid = storeId) => {
    setLoading(true);
    const params = { tenantId, page: p, pageSize: 20 };
    if (sid) params.storeId = sid;
    getOrders(params).then((res) => {
      if (res.data.success) { setOrders(res.data.data); setTotal(res.data.total); }
    }).catch(() => {}).finally(() => setLoading(false));
  };

  useEffect(() => {
    if (!tenantId) return;
    setLoading(true);
    getProducts(tenantId).then((res) => {
      if (res.data.success) setProducts(res.data.data);
    }).catch(() => {});
    loadData();
  }, [tenantId, refreshKey]);

  useEffect(() => { if (tenantId) loadData(1, storeId); }, [storeId]);

  const paymentColors = { cash: "green", card: "blue", transfer: "orange" };

  // Client-side filter by product and date range
  const filteredOrders = orders.filter((o) => {
    if (productId) {
      const hasProduct = o.items?.some((item) => item.productId === productId);
      if (!hasProduct) return false;
    }
    if (dateRange && dateRange[0] && dateRange[1]) {
      const orderDate = new Date(o.date);
      if (orderDate < dateRange[0].startOf("day").toDate() || orderDate > dateRange[1].endOf("day").toDate()) return false;
    }
    return true;
  });

  const columns = [
    {
      title: t("orderDate"), dataIndex: "date", key: "date", width: 100,
      render: (v) => new Date(v).toLocaleDateString(),
      sorter: (a, b) => new Date(a.date) - new Date(b.date),
    },
    { title: t("storeName"), key: "store", width: 140, render: (_, r) => r.store?.name || "-" },
    {
      title: t("productName"), key: "products", width: 200,
      render: (_, r) => {
        const names = r.items?.map((item) => item.product?.name).filter(Boolean) || [];
        if (names.length === 0) return "-";
        if (names.length <= 2) return names.join(", ");
        return `${names.slice(0, 2).join(", ")} +${names.length - 2}`;
      },
    },
    { title: t("total"), dataIndex: "total", key: "total", width: 100, render: (v) => `$${v?.toLocaleString()}`, sorter: (a, b) => a.total - b.total },
    {
      title: t("paymentMethod"), dataIndex: "paymentMethod", key: "payment", width: 100,
      render: (v) => <Tag color={paymentColors[v] || "default"}>{v}</Tag>,
    },
    { title: t("items"), key: "items", width: 60, render: (_, r) => r.items?.length || 0 },
  ];

  return (
    <div>
      {/* Filters */}
      <div style={{ marginBottom: 12, display: "flex", gap: 8, flexWrap: "wrap" }}>
        <Select
          value={storeId}
          onChange={setStoreId}
          placeholder={t("filterByStore")}
          allowClear
          showSearch
          optionFilterProp="label"
          style={{ width: 200 }}
          options={stores.map((s) => ({ value: s.id, label: s.name }))}
        />
        <Select
          value={productId}
          onChange={setProductId}
          placeholder={t("filterByProduct")}
          allowClear
          showSearch
          optionFilterProp="label"
          style={{ width: 200 }}
          options={products.map((p) => ({ value: p.id, label: p.name }))}
        />
        <RangePicker
          value={dateRange}
          onChange={setDateRange}
          placeholder={[t("startDate"), t("endDate")]}
          style={{ width: 240 }}
        />
      </div>

      <Card title={`${t("orderList")} (${filteredOrders.length})`} style={cardStyle}
        styles={{ header: { borderBottom: "1px solid #f0f0f0", fontSize: 14, fontWeight: 600 } }}>
        <Table
          columns={columns}
          dataSource={filteredOrders}
          rowKey="id"
          size="middle"
          loading={loading}
          pagination={{ current: page, pageSize: 20, total, onChange: (p) => { setPage(p); loadData(p); } }}
        />
      </Card>
    </div>
  );
}
