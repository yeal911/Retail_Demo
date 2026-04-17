import React, { useState, useEffect } from "react";
import { Card, Form, Input, Button, Switch, message } from "antd";
import { useI18n } from "../i18n";
import { getConfig, updateConfig } from "../api/request";

const cardStyle = { borderRadius: 12, border: "none", boxShadow: "0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)" };

export default function AIConfigPanel() {
  const { t } = useI18n();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ llmApiUrl: "", modelName: "", apiKey: "", proxyEnabled: false, proxyUrl: "" });

  useEffect(() => {
    getConfig().then((res) => {
      if (res.data.success) {
        const d = res.data.data;
        setForm({
          llmApiUrl: d.llmApiUrl || "",
          modelName: d.modelName || "",
          apiKey: d.hasApiKey ? "••••••••" : "",
          proxyEnabled: d.proxyEnabled || false,
          proxyUrl: d.proxyUrl || "",
        });
      }
    }).catch(() => message.error("Failed to load config")).finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const data = {};
      if (form.llmApiUrl) data.llmApiUrl = form.llmApiUrl;
      if (form.modelName) data.modelName = form.modelName;
      if (form.apiKey && form.apiKey !== "••••••••") data.apiKey = form.apiKey;
      data.proxyEnabled = form.proxyEnabled;
      data.proxyUrl = form.proxyUrl;
      await updateConfig(data);
      message.success(t("configSaved"));
      if (form.apiKey && form.apiKey !== "••••••••") setForm((f) => ({ ...f, apiKey: "••••••••" }));
    } catch {
      message.error(t("configSaveFailed"));
    } finally {
      setSaving(false);
    }
  };

  if (loading) return null;

  return (
    <Card title={t("aiConfig")} style={cardStyle}
      styles={{ header: { borderBottom: "1px solid #f0f0f0", fontSize: 14, fontWeight: 600 } }}>
      <Form layout="vertical" style={{ maxWidth: 600 }}>
        <Form.Item label={t("llmApiUrl")} style={{ marginBottom: 16 }}>
          <Input value={form.llmApiUrl} onChange={(e) => setForm({ ...form, llmApiUrl: e.target.value })} placeholder="https://api.deepseek.com/v1/chat/completions" />
        </Form.Item>
        <Form.Item label={t("modelName")} style={{ marginBottom: 16 }}>
          <Input value={form.modelName} onChange={(e) => setForm({ ...form, modelName: e.target.value })} placeholder="deepseek-chat" />
        </Form.Item>
        <Form.Item label={t("apiKey")} style={{ marginBottom: 16 }}>
          <Input.Password value={form.apiKey} onChange={(e) => setForm({ ...form, apiKey: e.target.value })} placeholder="sk-..." />
        </Form.Item>

        {/* Proxy Settings */}
        <div style={{ borderTop: "1px solid #f0f0f0", paddingTop: 16, marginTop: 8 }}>
          <Form.Item label={t("proxyEnabled")} style={{ marginBottom: 12 }}>
            <Switch checked={form.proxyEnabled} onChange={(checked) => setForm({ ...form, proxyEnabled: checked })} />
          </Form.Item>
          {form.proxyEnabled && (
            <Form.Item label={t("proxyUrl")} style={{ marginBottom: 16 }}>
              <Input value={form.proxyUrl} onChange={(e) => setForm({ ...form, proxyUrl: e.target.value })} placeholder="http://proxy.example.com:8080" />
            </Form.Item>
          )}
        </div>

        <Form.Item>
          <Button type="primary" onClick={handleSave} loading={saving} style={{ borderRadius: 8 }}>{t("save")}</Button>
        </Form.Item>
      </Form>
    </Card>
  );
}
