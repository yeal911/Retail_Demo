import React, { useState } from "react";
import { Form, Input, Button, Card, Typography, Space, message } from "antd";
import { UserOutlined, LockOutlined } from "@ant-design/icons";
import logo from "../assets/logo.png";
import { login } from "../api/request";
import { useI18n } from "../i18n";

const { Title, Text } = Typography;

export default function Login({ onLogin }) {
  const [loading, setLoading] = useState(false);
  const { t } = useI18n();

  const onFinish = async (values) => {
    setLoading(true);
    try {
      const res = await login(values.username, values.password);
      if (res.data.success) {
        message.success("✓");
        onLogin(res.data.user);
      } else {
        message.error(res.data.message || t("loginError"));
      }
    } catch (err) {
      message.error(err.response?.data?.message || t("loginFailed"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
      }}
    >
      <Card
        style={{ width: 420, borderRadius: 16, boxShadow: "0 20px 60px rgba(0,0,0,0.15)", border: "none" }}
        styles={{ body: { padding: "48px 40px" } }}
      >
        <Space direction="vertical" size="large" style={{ width: "100%" }}>
          <div style={{ textAlign: "center" }}>
            <img src={logo} alt="logo" style={{ width: 56, height: 56, marginBottom: 16 }} />
            <Title level={3} style={{ margin: 0, color: "#1a1a2e" }}>
              {t("loginTitle")}
            </Title>
            <Text type="secondary" style={{ fontSize: 14 }}>
              {t("loginSubtitle")}
            </Text>
          </div>

          <Form name="login" onFinish={onFinish} size="large" autoComplete="off">
            <Form.Item name="username" rules={[{ required: true, message: t("username") }]}>
              <Input prefix={<UserOutlined style={{ color: "#bfbfbf" }} />} placeholder={t("username")} />
            </Form.Item>
            <Form.Item name="password" rules={[{ required: true, message: t("password") }]}>
              <Input.Password prefix={<LockOutlined style={{ color: "#bfbfbf" }} />} placeholder={t("password")} />
            </Form.Item>
            <Form.Item style={{ marginBottom: 0 }}>
              <Button type="primary" htmlType="submit" loading={loading} block
                style={{ height: 48, fontSize: 16, fontWeight: 600, borderRadius: 8 }}>
                {t("login")}
              </Button>
            </Form.Item>
          </Form>

          <div style={{ textAlign: "center" }}>
            <Text type="secondary" style={{ fontSize: 12 }}>
              {t("loginHint")}
            </Text>
          </div>
        </Space>
      </Card>
    </div>
  );
}
