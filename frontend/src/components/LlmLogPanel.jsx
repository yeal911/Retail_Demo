import React, { useState, useEffect } from "react";
import { Card, Table, Tag, Empty, Spin, Modal, Button, message } from "antd";
import { DeleteOutlined } from "@ant-design/icons";
import { useI18n } from "../i18n";
import { getLlmLogs, deleteLlmLog } from "../api/request";

const cardStyle = { borderRadius: 12, border: "none", boxShadow: "0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)" };

export default function LlmLogPanel({ tenantId }) {
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
      await deleteLlmLog(id);
      setLogs(logs.filter((l) => l.id !== id));
      message.success("Log deleted");
    } catch { message.error("Failed to delete"); }
  };

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const res = await getLlmLogs(tenantId);
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
      title: t("llmTime"), dataIndex: "createdAt", key: "time", width: 130,
      render: (v) => fmtTime(v),
    },
    {
      title: t("llmType"), dataIndex: "type", key: "type", width: 70,
      render: (v) => <Tag color={v === "agent" ? "purple" : "blue"}>{v}</Tag>,
    },
    {
      title: t("llmModel"), dataIndex: "model", key: "model", width: 120,
    },
    {
      title: t("llmDuration"), dataIndex: "duration", key: "duration", width: 80,
      render: (v) => <span style={{ color: v > 3000 ? "#EF4444" : v > 1000 ? "#F59E0B" : "#10B981" }}>{v}{t("llmMs")}</span>,
      sorter: (a, b) => a.duration - b.duration,
    },
    {
      title: t("llmInput"), dataIndex: "input", key: "input", width: 220,
      render: (v) => (
        <div onDoubleClick={() => showDetail(t("llmInput"), v)}
          style={{ maxHeight: 48, overflow: "hidden", fontSize: 11, whiteSpace: "pre-wrap", wordBreak: "break-all", cursor: "pointer" }}
          title={locale === "es" ? "Doble clic para ver completo" : "Double-click to view full"}>
          {v?.length > 200 ? v.slice(0, 200) + "…" : v}
        </div>
      ),
    },
    {
      title: t("llmOutput"), dataIndex: "output", key: "output",
      render: (v) => (
        <div onDoubleClick={() => showDetail(t("llmOutput"), v)}
          style={{ maxHeight: 60, overflow: "hidden", fontSize: 11, whiteSpace: "pre-wrap", wordBreak: "break-all", cursor: "pointer" }}
          title={locale === "es" ? "Doble clic para ver completo" : "Double-click to view full"}>
          {v?.length > 300 ? v.slice(0, 300) + "…" : v}
        </div>
      ),
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
      <Card title={t("llmLogs")} style={cardStyle}
        styles={{ header: { borderBottom: "1px solid #f0f0f0", fontSize: 14, fontWeight: 600 } }}>
        {logs.length === 0 ? (
          <Empty description={t("llmNoLogs")} />
        ) : (
          <Table columns={columns} dataSource={logs} rowKey="id" size="small"
            pagination={{ pageSize: 15, showSizeChanger: false }}
            scroll={{ x: 900 }} />
        )}
      </Card>
      <Modal title={modalTitle} open={modalOpen} onCancel={() => setModalOpen(false)} footer={null} width={720}
        styles={{ body: { maxHeight: "70vh", overflow: "auto" } }}>
        <pre style={{ whiteSpace: "pre-wrap", wordBreak: "break-all", fontSize: 12, lineHeight: 1.6, margin: 0, fontFamily: "'SF Mono', 'Fira Code', Consolas, monospace" }}>
          {modalContent}
        </pre>
      </Modal>
    </>
  );
}
