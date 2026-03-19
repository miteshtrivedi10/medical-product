import { useState } from "react";
import { Button, Input, Callout } from "./ui";
import { login } from "../api";
import { DEMO_USERS } from "../constants";

function DemoCredentialsTable() {
  return (
    <div className="demo-credentials">
      <h2>Demo Accounts</h2>
      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>Username</th>
            <th>Password</th>
          </tr>
        </thead>
        <tbody>
          {DEMO_USERS.map((account) => (
            <tr key={account.username}>
              <td>{account.label}</td>
              <td>{account.username}</td>
              <td>{account.password}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function LoginPage({ onLogin }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event) {
    event.preventDefault();
    setLoading(true);
    setError("");

    try {
      const payload = await login(username, password);
      onLogin(payload);
    } catch (loginError) {
      setError(loginError.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-shell">
      <div className="login-card">
        <div className="login-intro">
          <h1>Care Summary Portal</h1>
          <p>
            Secure internal access for patient history review and encounter
            prep.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          <label>
            Username
            <Input value={username} onChange={(e) => setUsername(e.target.value)} />
          </label>

          <label>
            Password
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>

          {error ? <Callout variant="error">{error}</Callout> : null}

          <Button type="submit" variant="primary" disabled={loading}>
            {loading ? "Signing in..." : "Sign In"}
          </Button>
        </form>

        <DemoCredentialsTable />
      </div>
    </div>
  );
}
