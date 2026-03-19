const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

async function request(path, { method = "GET", token, body } = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (response.status === 409) {
    const payload = await response.json();
    const error = new Error(payload.message || "Version conflict");
    error.type = "conflict";
    error.payload = payload;
    throw error;
  }

  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(payload.detail || "Request failed.");
  }

  if (response.status === 204) {
    return null;
  }

  return response.json();
}

export function login(username, password) {
  return request("/api/auth/login", {
    method: "POST",
    body: { username, password },
  });
}

export function getMe(token) {
  return request("/api/me", { token });
}

export function getPatients(token) {
  return request("/api/patients", { token });
}

export function getPatientDetail(token, patientId) {
  return request(`/api/patients/${patientId}`, { token });
}

export function saveMedicalHistory(token, patientId, text, expectedVersion) {
  return request(`/api/patients/${patientId}/medical-history`, {
    method: "PUT",
    token,
    body: { text, expected_version: expectedVersion },
  });
}

export function createEncounter(token, patientId, title, text) {
  return request(`/api/patients/${patientId}/encounters`, {
    method: "POST",
    token,
    body: { title, text },
  });
}

export function getEncounter(token, encounterId) {
  return request(`/api/encounters/${encounterId}`, { token });
}

export function saveEncounter(token, encounterId, title, text, expectedVersion) {
  return request(`/api/encounters/${encounterId}`, {
    method: "PUT",
    token,
    body: { title, text, expected_version: expectedVersion },
  });
}

export function sendPresenceHeartbeat(token, patientId) {
  return request("/api/presence", {
    method: "POST",
    token,
    body: { patient_id: patientId },
  });
}
