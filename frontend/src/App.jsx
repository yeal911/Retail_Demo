import React, { useState, useEffect } from "react";
import { ConfigProvider, theme, message } from "antd";
import enUS from "antd/locale/en_US";
import esES from "antd/locale/es_ES";
import { I18nProvider, useI18n } from "./i18n";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";

const SESSION_KEY = "retail_copilot_session";
const SESSION_DURATION = 30 * 60 * 1000; // 30 minutes

function saveSession(user) {
  localStorage.setItem(SESSION_KEY, JSON.stringify({ user, timestamp: Date.now() }));
}

function loadSession() {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const session = JSON.parse(raw);
    if (Date.now() - session.timestamp > SESSION_DURATION) {
      localStorage.removeItem(SESSION_KEY);
      return null;
    }
    return session.user;
  } catch {
    return null;
  }
}

function clearSession() {
  localStorage.removeItem(SESSION_KEY);
}

const antdLocales = { en: enUS, es: esES };

function AppInner() {
  const [user, setUser] = useState(() => loadSession());
  const { t, locale } = useI18n();

  useEffect(() => {
    if (user) saveSession(user);
  }, [user]);

  const handleLogout = () => {
    clearSession();
    setUser(null);
  };

  useEffect(() => {
    const interval = setInterval(() => {
      if (user && !loadSession()) {
        setUser(null);
        message.warning(t("sessionExpired"));
      }
    }, 60 * 1000);
    return () => clearInterval(interval);
  }, [user, t]);

  return (
    <ConfigProvider
      locale={antdLocales[locale] || enUS}
      theme={{
        algorithm: theme.defaultAlgorithm,
        token: {
          colorPrimary: "#4F46E5",
          borderRadius: 8,
          fontFamily:
            '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
        },
      }}
    >
      {user ? (
        <Dashboard user={user} onLogout={handleLogout} />
      ) : (
        <Login onLogin={(u) => { saveSession(u); setUser(u); }} />
      )}
    </ConfigProvider>
  );
}

export default function App() {
  return (
    <I18nProvider>
      <AppInner />
    </I18nProvider>
  );
}
