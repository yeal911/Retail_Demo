import React, { useState, useEffect } from "react";
import { Card, Table, Tag, Empty, Spin, Modal, Button, message } from "antd";
import { DeleteOutlined } from "@ant-design/icons";
import { useI18n } from "../i18n";
import { getMcpLogs, deleteMcpLog } from "../api/request";

const cardStyle = { borderRadius: 12, border: "none", boxShadow: "0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)" };
const toolColors = { updateStoreStatus: "orange", setSalesTarget: "blue", sendNotification: "green" };

export default function McpLogPanel({ tenantId }) {
  const { t, locale } = useI18n();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalTitle, setModalTitle] = useState("");
  const [modalContent, setModalContent] = useState("");

  const showDetail = (title, content) => {
    setModalTitle(title);
    setModalContent(content);
    setModalOpen(true);
  };

  const handleDelete = async (id) => {
    try {
      await deleteMcpLog(id);
      setLogs(logs.filter((l) => l.id !== id));
      message.success("Log deleted");
    } catch { message.error("Failed to delete"); }
  };

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const res = await getMcpLogs(tenantId);
        if (res.data.success) setLogs(res.data.data);
      } catch {} finally { setLoading(false); }
    };
    fetchLogs();
    const interval = setInterval(fetchLogs, 10000);
    return () => clearInterval(interval);
  }, []);

  const fmtTime = (iso) => new Date(iso).toLocaleString(locale === "es" ? "es-MX" : "en-US", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit" });

  const columns = [
    {
      title: t("mcpTime"), dataIndex: "createdAt", key: "time", width: 130,
      render: (v) => fmtTime(v),
    },
    {
      title: t("mcpTool"), dataIndex: "tool", key: "tool", width: 160,
      render: (v) => <Tag color={toolColors[v] || "default"}>{v}</Tag>,
    },
    {
      title: t("mcpParams"), dataIndex: "params", key: "params", width: 260,
      render: (v) => {
        try {
          const obj = JSON.parse(v);
          const text = Object.entries(obj).map(([k, val]) => `${k}: ${val}`).join("\n");
          return (
            <div onDoubleClick={() => showDetail(t("mcpParams"), text)}
              style={{ fontSize: 11, lineHeight: 1.5, cursor: "pointer" }}
              title={locale === "es" ? "Doble clic para ver completo" : "Double-click to view full"}>
              {Object.entries(obj).map(([k, val]) => <div key={k}><b>{k}:</b> {String(val)}</div>)}
            </div>
          );
        } catch { return v; }
      },
    },
    {
      title: t("mcpResult"), dataIndex: "result", key: "result",
      render: (v) => {
        try {
          const obj = JSON.parse(v);
          return (
            <div onDoubleClick={() => showDetail(t("mcpResult"), JSON.stringify(obj, null, 2))}
              style={{ fontSize: 11, lineHeight: 1.5, cursor: "pointer" }}
              title={locale === "es" ? "Doble clic para ver completo" : "Double-click to view full"}>
              <Tag color={obj.success ? "success" : "error"} style={{ marginBottom: 4 }}>{obj.success ? "✓" : "✗"}</Tag>
              <span>{obj.message}</span>
            </div>
          );
        } catch { return v; }
      },
    },
    {
      title: "", key: "action", width: 50,
      render: (_, record) => (
        <Button type="text" danger icon={<DeleteOutlined />} size="small" onClick={() => handleDelete(record.id)} title={locale === "es" ? "Eliminar" : "Delete"} />
      ),
    },
  ];

  if (loading) return <div style={{ textAlign: "center", padding: 40 }}><Spin /></div>;

  return (
    <>
      <Card title={t("mcpLogs")} style={cardStyle}
        styles={{ header: { borderBottom: "1px solid #f0f0f0", fontSize: 14, fontWeight: 600 } }}>
        {logs.length === 0 ? (
          <Empty description={t("mcpNoLogs")} />
        ) : (
          <Table columns={columns} dataSource={logs} rowKey="id" size="small"
            pagination={{ pageSize: 15, showSizeChanger: false }}
            scroll={{ x: 800 }} />
        )}
      </Card>
      <Modal title={modalTitle} open={modalOpen} onCancel={() => setModalOpen(false)} footer={null} width={640}
        styles={{ body: { maxHeight: "70vh", overflow: "auto" } }}>
        <pre style={{ whiteSpace: "pre-wrap", wordBreak: "break-all", fontSize: 12, lineHeight: 1.6, margin: 0, fontFamily: "'SF Mono', 'Fira Code', Consolas, monospace" }}>
          {modalContent}
        </pre>
      </Modal>
    </>
  );
}
