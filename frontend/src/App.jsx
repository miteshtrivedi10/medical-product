import { useState } from "react";
import { STORAGE_KEY } from "./constants";
import { LoginPage } from "./components/LoginPage";
import { AppShell } from "./components/AppShell";

export default function App() {
  const [session, setSession] = useState(() => {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  });

  function handleLogin(payload) {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    setSession(payload);
  }

  function handleLogout() {
    window.localStorage.removeItem(STORAGE_KEY);
    setSession(null);
  }

  if (!session) {
    return <LoginPage onLogin={handleLogin} />;
  }

  return <AppShell session={session} onLogout={handleLogout} />;
}
