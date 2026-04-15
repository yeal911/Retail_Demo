import React, { useState, useEffect } from "react";
import { Card, Table, Spin } from "antd";
import { useI18n } from "../i18n";
import { getTenants } from "../api/request";

const cardStyle = { borderRadius: 12, border: "none", boxShadow: "0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)" };

export default function TenantManagement() {
  const { t } = useI18n();
  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getTenants().then((res) => {
      if (res.data.success) setTenants(res.data.data);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const columns = [
    { title: t("tenantName"), dataIndex: "name", key: "name" },
    { title: t("storeCount"), key: "stores", render: (_, r) => r._count?.stores || 0 },
    { title: t("userCount"), key: "users", render: (_, r) => r._count?.users || 0 },
  ];

  if (loading) return <Spin />;

  return (
    <Card title={t("tenantManagement")} style={cardStyle}
      styles={{ header: { borderBottom: "1px solid #f0f0f0", fontSize: 14, fontWeight: 600 } }}>
      <Table columns={columns} dataSource={tenants} rowKey="id" size="middle" pagination={false} />
    </Card>
  );
}
