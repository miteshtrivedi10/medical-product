import { useEffect, useMemo, useRef, useState } from "react";
import {
  createEncounter,
  getEncounter,
  getMe,
  getPatientDetail,
  getPatients,
  login,
  saveEncounter,
  saveMedicalHistory,
  sendPresenceHeartbeat,
} from "./api";

const DEMO_USERS = [
  { username: "ava.clark", password: "Aster@101", label: "Ava Clark" },
  { username: "nolan.reed", password: "Harbor@202", label: "Nolan Reed" },
  { username: "priya.shah", password: "Cedar@303", label: "Priya Shah" },
  { username: "marco.ellis", password: "Pine@404", label: "Marco Ellis" },
  { username: "dana.cho", password: "River@505", label: "Dana Cho" },
];

const STORAGE_KEY = "medical-product-session";
const AI_FAILURE_MESSAGE = "It seems we're encountering difficulty in our AI engine";
const EDIT_WARNING =
  "Another user is editing, I will recommend to wait for clean copy before updating it else your changes may be lost";

function formatTimestamp(value) {
  if (!value) {
    return "Not available";
  }
  return new Date(value).toLocaleString();
}

function SummaryCard({ summary }) {
  return (
    <section className="panel">
      <div className="panel-header">
        <h2>Visit Prep Summary</h2>
        <span className={`summary-chip ${summary.status}`}>{summary.status}</span>
      </div>
      {summary.status === "failed" ? (
        <div className="callout error">{AI_FAILURE_MESSAGE}</div>
      ) : (
        <>
          <div className="summary-block">
            <label>Now</label>
            <p>{summary.patient_status_summary || "No summary generated yet."}</p>
          </div>
          <div className="summary-block">
            <label>Watch</label>
            {summary.watch_items.length ? (
              <ul className="watch-list">
                {summary.watch_items.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            ) : (
              <p>No watch items noted.</p>
            )}
          </div>
          <div className="summary-block">
            <label>Next Visit</label>
            <p>{summary.next_encounter_focus || "No next-visit guidance yet."}</p>
          </div>
        </>
      )}
      <p className="meta-line">Last updated: {formatTimestamp(summary.generated_at)}</p>
    </section>
  );
}

function LoginPage({ onLogin }) {
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
          <p>Secure internal access for patient history review and encounter prep.</p>
        </div>
        <form onSubmit={handleSubmit} className="login-form">
          <label>
            Username
            <input value={username} onChange={(event) => setUsername(event.target.value)} />
          </label>
          <label>
            Password
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </label>
          {error ? <div className="callout error">{error}</div> : null}
          <button type="submit" className="primary-button" disabled={loading}>
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>
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
      </div>
    </div>
  );
}

function AppShell({ session, onLogout }) {
  const [patients, setPatients] = useState([]);
  const [selectedPatientId, setSelectedPatientId] = useState("");
  const [patientDetail, setPatientDetail] = useState(null);
  const [medicalHistoryDraft, setMedicalHistoryDraft] = useState("");
  const [savingMedicalHistory, setSavingMedicalHistory] = useState(false);
  const [medicalHistoryConflict, setMedicalHistoryConflict] = useState(null);
  const [encounterDraft, setEncounterDraft] = useState({ id: null, title: "", text: "", version: 1 });
  const [encounterConflict, setEncounterConflict] = useState(null);
  const [loadingEncounter, setLoadingEncounter] = useState(false);
  const [savingEncounter, setSavingEncounter] = useState(false);
  const [globalError, setGlobalError] = useState("");
  const summaryPollingRef = useRef(null);

  async function loadPatients(nextSelectedPatientId) {
    const payload = await getPatients(session.token);
    setPatients(payload);
    if (!payload.length) {
      setSelectedPatientId("");
      return;
    }

    if (nextSelectedPatientId) {
      setSelectedPatientId(nextSelectedPatientId);
      return;
    }

    if (!selectedPatientId || !payload.some((patient) => patient.id === selectedPatientId)) {
      setSelectedPatientId(payload[0].id);
    }
  }

  async function loadPatientDetail(patientId) {
    if (!patientId) {
      return;
    }

    const payload = await getPatientDetail(session.token, patientId);
    setPatientDetail(payload);
    setMedicalHistoryDraft(payload.medical_history.text);
    setMedicalHistoryConflict(null);

    if (!encounterDraft.id) {
      if (payload.encounters[0]) {
        await loadEncounter(payload.encounters[0].id);
      } else {
        setEncounterDraft({ id: null, title: "", text: "", version: 1 });
      }
    } else if (!payload.encounters.some((encounter) => encounter.id === encounterDraft.id)) {
      setEncounterDraft({ id: null, title: "", text: "", version: 1 });
    }
  }

  async function loadEncounter(encounterId) {
    setLoadingEncounter(true);
    setEncounterConflict(null);
    try {
      const payload = await getEncounter(session.token, encounterId);
      setEncounterDraft({
        id: payload.id,
        title: payload.title,
        text: payload.text,
        version: payload.version,
      });
    } finally {
      setLoadingEncounter(false);
    }
  }

  useEffect(() => {
    let cancelled = false;

    getMe(session.token)
      .then(() => loadPatients())
      .catch((error) => {
        if (!cancelled) {
          setGlobalError(error.message);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [session.token]);

  useEffect(() => {
    let cancelled = false;

    if (!selectedPatientId) {
      return undefined;
    }

    getPatientDetail(session.token, selectedPatientId)
      .then((payload) => {
        if (!cancelled) {
          setPatientDetail(payload);
          setMedicalHistoryDraft(payload.medical_history.text);
          if (!encounterDraft.id && payload.encounters[0]) {
            loadEncounter(payload.encounters[0].id);
          }
        }
      })
      .catch((error) => {
        if (!cancelled) {
          setGlobalError(error.message);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [selectedPatientId]);

  useEffect(() => {
    if (!selectedPatientId) {
      return undefined;
    }

    async function beat() {
      try {
        const payload = await sendPresenceHeartbeat(session.token, selectedPatientId);
        setPatientDetail((current) =>
          current && current.id === selectedPatientId
            ? { ...current, active_editors: payload.active_editors }
            : current,
        );
      } catch (error) {
        setGlobalError(error.message);
      }
    }

    beat();
    const intervalId = window.setInterval(beat, 5000);
    return () => window.clearInterval(intervalId);
  }, [selectedPatientId, session.token]);

  useEffect(() => {
    if (summaryPollingRef.current) {
      window.clearInterval(summaryPollingRef.current);
      summaryPollingRef.current = null;
    }

    if (!patientDetail || patientDetail.latest_summary.status !== "generating") {
      return undefined;
    }

    summaryPollingRef.current = window.setInterval(async () => {
      try {
        const payload = await getPatientDetail(session.token, patientDetail.id);
        setPatientDetail(payload);
      } catch (error) {
        setGlobalError(error.message);
      }
    }, 2500);

    return () => {
      if (summaryPollingRef.current) {
        window.clearInterval(summaryPollingRef.current);
        summaryPollingRef.current = null;
      }
    };
  }, [patientDetail, session.token]);

  const selectedEncounterListItem = useMemo(() => {
    if (!patientDetail || !encounterDraft.id) {
      return null;
    }
    return patientDetail.encounters.find((encounter) => encounter.id === encounterDraft.id) || null;
  }, [patientDetail, encounterDraft.id]);

  async function handleMedicalHistorySave() {
    if (!patientDetail) {
      return;
    }
    setSavingMedicalHistory(true);
    setMedicalHistoryConflict(null);
    setGlobalError("");
    try {
      await saveMedicalHistory(
        session.token,
        patientDetail.id,
        medicalHistoryDraft,
        patientDetail.medical_history.version,
      );
      await loadPatients(patientDetail.id);
      await loadPatientDetail(patientDetail.id);
    } catch (error) {
      if (error.type === "conflict") {
        setMedicalHistoryConflict(error.payload);
      } else {
        setGlobalError(error.message);
      }
    } finally {
      setSavingMedicalHistory(false);
    }
  }

  async function handleEncounterSave() {
    if (!patientDetail) {
      return;
    }
    setSavingEncounter(true);
    setEncounterConflict(null);
    setGlobalError("");
    try {
      if (encounterDraft.id) {
        const payload = await saveEncounter(
          session.token,
          encounterDraft.id,
          encounterDraft.title,
          encounterDraft.text,
          encounterDraft.version,
        );
        await loadPatients(patientDetail.id);
        await loadPatientDetail(patientDetail.id);
        await loadEncounter(payload.id);
      } else {
        const payload = await createEncounter(
          session.token,
          patientDetail.id,
          encounterDraft.title,
          encounterDraft.text,
        );
        await loadPatients(patientDetail.id);
        await loadPatientDetail(patientDetail.id);
        await loadEncounter(payload.id);
      }
    } catch (error) {
      if (error.type === "conflict") {
        setEncounterConflict(error.payload);
      } else {
        setGlobalError(error.message);
      }
    } finally {
      setSavingEncounter(false);
    }
  }

  async function handlePatientSelect(patientId) {
    setSelectedPatientId(patientId);
    setEncounterDraft({ id: null, title: "", text: "", version: 1 });
    setEncounterConflict(null);
    setGlobalError("");
  }

  if (!patientDetail && !selectedPatientId) {
    return <div className="loading-screen">Loading portal...</div>;
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar-header">
          <h1>Care Summary Portal</h1>
          <p>{session.user.display_name}</p>
        </div>
        <button className="secondary-button" onClick={onLogout}>
          Sign Out
        </button>
        <div className="sidebar-section">
          <h2>Patients</h2>
          {patients.map((patient) => (
            <button
              key={patient.id}
              className={`patient-link ${patient.id === selectedPatientId ? "active" : ""}`}
              onClick={() => handlePatientSelect(patient.id)}
            >
              <span>{patient.full_name}</span>
              <small>{patient.summary_status}</small>
            </button>
          ))}
        </div>
      </aside>

      <main className="main-layout">
        {globalError ? <div className="callout error">{globalError}</div> : null}
        {patientDetail ? (
          <>
            <header className="page-header">
              <div>
                <h2>{patientDetail.full_name}</h2>
                <p>DOB: {patientDetail.dob}</p>
              </div>
            </header>

            {patientDetail.active_editors.length ? (
              <div className="callout warning">
                <strong>{EDIT_WARNING}</strong>
                <div>Active editors: {patientDetail.active_editors.map((user) => user.display_name).join(", ")}</div>
              </div>
            ) : null}

            <SummaryCard summary={patientDetail.latest_summary} />

            <section className="grid-layout">
              <section className="panel">
                <div className="panel-header">
                  <h2>Medical History</h2>
                  <button
                    className="primary-button"
                    onClick={handleMedicalHistorySave}
                    disabled={savingMedicalHistory}
                  >
                    {savingMedicalHistory ? "Saving..." : "Save"}
                  </button>
                </div>
                <p className="meta-line">
                  Version {patientDetail.medical_history.version} · Updated by{" "}
                  {patientDetail.medical_history.updated_by} · {formatTimestamp(patientDetail.medical_history.updated_at)}
                </p>
                <textarea
                  className="editor"
                  value={medicalHistoryDraft}
                  onChange={(event) => setMedicalHistoryDraft(event.target.value)}
                />
                {medicalHistoryConflict ? (
                  <div className="callout warning">
                    <div>{medicalHistoryConflict.message}</div>
                    <div>
                      Latest saved by {medicalHistoryConflict.updated_by} at{" "}
                      {formatTimestamp(medicalHistoryConflict.updated_at)}
                    </div>
                    <button
                      className="secondary-button"
                      onClick={() => {
                        setMedicalHistoryDraft(medicalHistoryConflict.current_text);
                        setMedicalHistoryConflict(null);
                      }}
                    >
                      Load Latest Copy
                    </button>
                  </div>
                ) : null}
              </section>

              <section className="panel">
                <div className="panel-header">
                  <h2>Encounter Transcripts</h2>
                  <button
                    className="secondary-button"
                    onClick={() => {
                      setEncounterConflict(null);
                      setEncounterDraft({ id: null, title: "", text: "", version: 1 });
                    }}
                  >
                    New Encounter
                  </button>
                </div>
                <div className="encounter-layout">
                  <div className="encounter-list">
                    {patientDetail.encounters.map((encounter) => (
                      <button
                        key={encounter.id}
                        className={`encounter-link ${encounter.id === encounterDraft.id ? "active" : ""}`}
                        onClick={() => loadEncounter(encounter.id)}
                      >
                        <span>{encounter.title}</span>
                        <small>{formatTimestamp(encounter.updated_at)}</small>
                      </button>
                    ))}
                  </div>
                  <div className="encounter-editor">
                    <label>
                      Title
                      <input
                        value={encounterDraft.title}
                        onChange={(event) =>
                          setEncounterDraft((current) => ({ ...current, title: event.target.value }))
                        }
                      />
                    </label>
                    <p className="meta-line">
                      {encounterDraft.id && selectedEncounterListItem
                        ? `Version ${encounterDraft.version} · Updated by ${selectedEncounterListItem.updated_by} · ${formatTimestamp(selectedEncounterListItem.updated_at)}`
                        : "New encounter draft"}
                    </p>
                    <textarea
                      className="editor encounter-textarea"
                      value={encounterDraft.text}
                      onChange={(event) =>
                        setEncounterDraft((current) => ({ ...current, text: event.target.value }))
                      }
                    />
                    {encounterConflict ? (
                      <div className="callout warning">
                        <div>{encounterConflict.message}</div>
                        <div>
                          Latest saved by {encounterConflict.updated_by} at{" "}
                          {formatTimestamp(encounterConflict.updated_at)}
                        </div>
                        <button
                          className="secondary-button"
                          onClick={() => {
                            setEncounterDraft((current) => ({
                              ...current,
                              title: encounterConflict.current_title || current.title,
                              text: encounterConflict.current_text,
                              version: encounterConflict.current_version,
                            }));
                            setEncounterConflict(null);
                          }}
                        >
                          Load Latest Copy
                        </button>
                      </div>
                    ) : null}
                    <button
                      className="primary-button"
                      disabled={savingEncounter || loadingEncounter || !encounterDraft.title.trim()}
                      onClick={handleEncounterSave}
                    >
                      {savingEncounter ? "Saving..." : encounterDraft.id ? "Save Encounter" : "Create Encounter"}
                    </button>
                  </div>
                </div>
              </section>
            </section>
          </>
        ) : (
          <div className="loading-screen">Loading patient...</div>
        )}
      </main>
    </div>
  );
}

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
