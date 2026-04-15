import React, { useState, useEffect } from "react";
import { Card, Table, Tag, Select, Spin, Modal } from "antd";
import { useI18n } from "../i18n";
import { getOrders } from "../api/request";

const cardStyle = { borderRadius: 12, border: "none", boxShadow: "0 1px 3px rgba(6,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)" };

export default function OrderManagement({ tenantId, stores }) {
  const { t } = useI18n();
  const [orders, setOrders] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [storeId, setStoreId] = useState(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailItems, setDetailItems] = useState([]);

  const loadData = (p = page, sid = storeId) => {
    setLoading(true);
    const params = { tenantId, page: p, pageSize: 20 };
    if (sid) params.storeId = sid;
    getOrders(params).then((res) => {
      if (res.data.success) { setOrders(res.data.data); setTotal(res.data.total); }
    }).catch(() => {}).finally(() => setLoading(false));
  };

  useEffect(() => { if (tenantId) loadData(); }, [tenantId]);
  useEffect(() => { if (tenantId) loadData(1, storeId); }, [storeId]);

  const paymentColors = { cash: "green", card: "blue", transfer: "orange" };

  const columns = [
    {
      title: t("orderDate"), dataIndex: "date", key: "date", width: 100,
      render: (v) => new Date(v).toLocaleDateString(),
    },
    { title: t("storeName"), key: "store", width: 140, render: (_, r) => r.store?.name || "-" },
    { title: t("total"), dataIndex: "total", key: "total", width: 100, render: (v) => `$${v?.toLocaleString()}` },
    {
      title: t("paymentMethod"), dataIndex: "paymentMethod", key: "payment", width: 100,
      render: (v) => <Tag color={paymentColors[v] || "default"}>{v}</Tag>,
    },
    { title: t("items"), key: "items", width: 60, render: (_, r) => r.items?.length || 0 },
    {
      title: "", key: "action", width: 60,
      render: (_, r) => (
        <a onClick={() => { setDetailItems(r.items || []); setDetailOpen(true); }}>{t("viewDetail")}</a>
      ),
    },
  ];

  const itemColumns = [
    { title: t("productName"), key: "product", render: (_, r) => r.product?.name || "-" },
    { title: t("quantity"), dataIndex: "quantity", key: "quantity", width: 60 },
    { title: t("unitPrice"), dataIndex: "unitPrice", key: "unitPrice", width: 80, render: (v) => `$${v?.toLocaleString()}` },
    { title: t("subtotal"), dataIndex: "subtotal", key: "subtotal", width: 80, render: (v) => `$${v?.toLocaleString()}` },
  ];

  return (
    <div>
      <div style={{ marginBottom: 12 }}>
        <Select
          value={storeId}
          onChange={setStoreId}
          placeholder={t("allStores")}
          allowClear
          style={{ width: 200 }}
          options={stores.map((s) => ({ value: s.id, label: s.name }))}
        />
      </div>
      <Card title={t("orderList")} style={cardStyle} styles={{ header: { borderBottom: "1px solid #f0f0f0", fontSize: 14, fontWeight: 600 } }}>
        <Table
          columns={columns}
          dataSource={orders}
          rowKey="id"
          size="middle"
          loading={loading}
          pagination={{ current: page, pageSize: 20, total, onChange: (p) => { setPage(p); loadData(p); } }}
        />
      </Card>
      <Modal title={t("orderDetail")} open={detailOpen} onCancel={() => setDetailOpen(false)} footer={null} width={600}>
        <Table columns={itemColumns} dataSource={detailItems} rowKey="id" size="small" pagination={false} />
      </Modal>
    </div>
  );
}
