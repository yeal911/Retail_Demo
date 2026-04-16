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
  const [sorter, setSorter] = useState({ field: "date", order: "desc" });

  const loadData = (p = page, sid = storeId, pid = productId, dr = dateRange, s = sorter) => {
    setLoading(true);
    const params = { tenantId, page: p, pageSize: 20 };
    if (sid) params.storeId = sid;
    if (pid) params.productId = pid;
    if (dr && dr[0] && dr[1]) {
      params.startDate = dr[0].startOf("day").toISOString();
      params.endDate = dr[1].endOf("day").toISOString();
    }
    if (s.field) {
      params.sortBy = s.field;
      params.sortOrder = s.order === "ascend" ? "asc" : "desc";
    }
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

  useEffect(() => { if (tenantId) loadData(1, storeId, productId, dateRange, sorter); }, [storeId, productId, dateRange, sorter]);

  const paymentColors = { cash: "green", card: "blue", transfer: "orange" };

  const columns = [
    {
      title: t("orderDate"), dataIndex: "date", key: "date", width: 100,
      render: (v) => new Date(v).toLocaleDateString(),
      sorter: true,
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
    {
      title: t("total"), dataIndex: "total", key: "total", width: 100,
      render: (v) => `$${v?.toLocaleString()}`,
      sorter: true,
    },
    {
      title: t("paymentMethod"), dataIndex: "paymentMethod", key: "paymentMethod", width: 100,
      render: (v) => <Tag color={paymentColors[v] || "default"}>{v}</Tag>,
      sorter: true,
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

      <Card title={`${t("orderList")} (${total})`} style={cardStyle}
        styles={{ header: { borderBottom: "1px solid #f0f0f0", fontSize: 14, fontWeight: 600 } }}>
        <Table
          columns={columns}
          dataSource={orders}
          rowKey="id"
          size="middle"
          loading={loading}
          onChange={(_pagination, _filters, sort) => {
            const newSorter = sort.field ? { field: sort.field, order: sort.order } : { field: "date", order: "desc" };
            setSorter(newSorter);
            setPage(1);
          }}
          pagination={{ current: page, pageSize: 20, total, onChange: (p) => { setPage(p); loadData(p); } }}
        />
      </Card>
    </div>
  );
}
