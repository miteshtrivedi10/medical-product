import { useEffect, useRef, useState } from "react";
import {
  getEncounter,
  getPatientDetail,
  getPatients,
  createEncounter,
  saveEncounter,
  saveMedicalHistory,
} from "../api";
import { SUMMARY_POLL_INTERVAL } from "../constants";

export function usePatientManagement(sessionToken) {
  const [patients, setPatients] = useState([]);
  const [selectedPatientId, setSelectedPatientId] = useState("");
  const [patientDetail, setPatientDetail] = useState(null);
  const [medicalHistoryDraft, setMedicalHistoryDraft] = useState("");
  const [savingMedicalHistory, setSavingMedicalHistory] = useState(false);
  const [medicalHistoryConflict, setMedicalHistoryConflict] = useState(null);
  const [encounterDraft, setEncounterDraft] = useState({
    id: null,
    title: "",
    text: "",
    version: 1,
  });
  const [encounterConflict, setEncounterConflict] = useState(null);
  const [loadingEncounter, setLoadingEncounter] = useState(false);
  const [savingEncounter, setSavingEncounter] = useState(false);
  const [globalError, setGlobalError] = useState("");
  const summaryPollingRef = useRef(null);

  async function loadPatients(nextSelectedPatientId) {
    const payload = await getPatients(sessionToken);
    setPatients(payload);

    if (!payload.length) {
      setSelectedPatientId("");
      return;
    }

    if (nextSelectedPatientId) {
      setSelectedPatientId(nextSelectedPatientId);
      return;
    }

    if (
      !selectedPatientId ||
      !payload.some((patient) => patient.id === selectedPatientId)
    ) {
      setSelectedPatientId(payload[0].id);
    }
  }

  async function loadPatientDetail(patientId) {
    if (!patientId) return;

    const payload = await getPatientDetail(sessionToken, patientId);
    setPatientDetail(payload);
    setMedicalHistoryDraft(payload.medical_history.text);
    setMedicalHistoryConflict(null);

    if (!encounterDraft.id) {
      if (payload.encounters[0]) {
        await loadEncounter(payload.encounters[0].id);
      } else {
        setEncounterDraft({ id: null, title: "", text: "", version: 1 });
      }
    } else if (
      !payload.encounters.some((e) => e.id === encounterDraft.id)
    ) {
      setEncounterDraft({ id: null, title: "", text: "", version: 1 });
    }
  }

  async function loadEncounter(encounterId) {
    setLoadingEncounter(true);
    setEncounterConflict(null);
    try {
      const payload = await getEncounter(sessionToken, encounterId);
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
    loadPatients();
  }, []);

  useEffect(() => {
    if (!selectedPatientId) return;
    loadPatientDetail(selectedPatientId);
  }, [selectedPatientId]);

  // Poll for summary updates when status is "generating"
  useEffect(() => {
    if (summaryPollingRef.current) {
      window.clearInterval(summaryPollingRef.current);
      summaryPollingRef.current = null;
    }

    if (!patientDetail || patientDetail.latest_summary?.status !== "generating") {
      return undefined;
    }

    summaryPollingRef.current = window.setInterval(async () => {
      try {
        const payload = await getPatientDetail(sessionToken, patientDetail.id);
        setPatientDetail(payload);
      } catch (error) {
        setGlobalError(error.message);
      }
    }, SUMMARY_POLL_INTERVAL);

    return () => {
      if (summaryPollingRef.current) {
        window.clearInterval(summaryPollingRef.current);
        summaryPollingRef.current = null;
      }
    };
  }, [patientDetail, sessionToken]);

  async function handleMedicalHistorySave() {
    if (!patientDetail) return;

    setSavingMedicalHistory(true);
    setMedicalHistoryConflict(null);
    setGlobalError("");

    try {
      await saveMedicalHistory(
        sessionToken,
        patientDetail.id,
        medicalHistoryDraft,
        patientDetail.medical_history.version
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
    if (!patientDetail) return;

    setSavingEncounter(true);
    setEncounterConflict(null);
    setGlobalError("");

    try {
      if (encounterDraft.id) {
        const payload = await saveEncounter(
          sessionToken,
          encounterDraft.id,
          encounterDraft.title,
          encounterDraft.text,
          encounterDraft.version
        );
        await loadPatients(patientDetail.id);
        await loadPatientDetail(patientDetail.id);
        await loadEncounter(payload.id);
      } else {
        const payload = await createEncounter(
          sessionToken,
          patientDetail.id,
          encounterDraft.title,
          encounterDraft.text
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

  function handlePatientSelect(patientId) {
    setSelectedPatientId(patientId);
    setEncounterDraft({ id: null, title: "", text: "", version: 1 });
    setEncounterConflict(null);
    setGlobalError("");
  }

  function handleEncounterSelect(encounterId) {
    loadEncounter(encounterId);
  }

  function handleNewEncounter() {
    setEncounterConflict(null);
    setEncounterDraft({ id: null, title: "", text: "", version: 1 });
  }

  function handleEncounterTitleChange(event) {
    setEncounterDraft((current) => ({ ...current, title: event.target.value }));
  }

  function handleEncounterTextChange(event) {
    setEncounterDraft((current) => ({ ...current, text: event.target.value }));
  }

  function handleMedicalHistoryLoadLatest(text) {
    setMedicalHistoryDraft(text);
    setMedicalHistoryConflict(null);
  }

  function handleEncounterLoadLatest(data) {
    setEncounterDraft((current) => ({
      ...current,
      title: data.title || current.title,
      text: data.text,
      version: data.version,
    }));
    setEncounterConflict(null);
  }

  return {
    patients,
    selectedPatientId,
    patientDetail,
    setPatientDetail,
    medicalHistoryDraft,
    setMedicalHistoryDraft,
    savingMedicalHistory,
    medicalHistoryConflict,
    encounterDraft,
    setEncounterDraft,
    encounterConflict,
    loadingEncounter,
    savingEncounter,
    globalError,
    setGlobalError,
    handleMedicalHistorySave,
    handleEncounterSave,
    handlePatientSelect,
    handleEncounterSelect,
    handleNewEncounter,
    handleEncounterTitleChange,
    handleEncounterTextChange,
    handleMedicalHistoryLoadLatest,
    handleEncounterLoadLatest,
  };
}
