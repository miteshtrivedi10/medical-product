import { Callout } from "./ui";
import { Sidebar } from "./Sidebar";
import { PatientDetail } from "./PatientDetail";
import { usePatientManagement } from "../hooks/usePatientManagement";

function LoadingScreen({ message }) {
  return <div className="loading-screen">{message}</div>;
}

export function AppShell({ session, onLogout }) {
  const {
    patients,
    selectedPatientId,
    patientDetail,
    medicalHistoryDraft,
    savingMedicalHistory,
    medicalHistoryConflict,
    encounterDraft,
    encounterConflict,
    loadingEncounter,
    savingEncounter,
    globalError,
    handleMedicalHistorySave,
    handleEncounterSave,
    handlePatientSelect,
    handleEncounterSelect,
    handleNewEncounter,
    handleEncounterTitleChange,
    handleEncounterTextChange,
    handleMedicalHistoryLoadLatest,
    handleEncounterLoadLatest,
  } = usePatientManagement(session.token);

  if (!patientDetail && !selectedPatientId) {
    return <LoadingScreen message="Loading portal..." />;
  }

  if (!patientDetail) {
    return <LoadingScreen message="Loading patient..." />;
  }

  return (
    <div className="app-shell">
      <Sidebar
        userName={session.user.display_name}
        patients={patients}
        selectedPatientId={selectedPatientId}
        onSelectPatient={handlePatientSelect}
        onLogout={onLogout}
      />

      <main className="main-layout">
        {globalError ? <Callout variant="error">{globalError}</Callout> : null}

        <PatientDetail
          patientDetail={patientDetail}
          medicalHistoryDraft={medicalHistoryDraft}
          onMedicalHistoryChange={(e) =>
            handleMedicalHistoryLoadLatest(e.target.value)
          }
          onMedicalHistorySave={handleMedicalHistorySave}
          isSavingMedicalHistory={savingMedicalHistory}
          medicalHistoryConflict={medicalHistoryConflict}
          onMedicalHistoryLoadLatest={handleMedicalHistoryLoadLatest}
          encounterDraft={encounterDraft}
          onEncounterSelect={handleEncounterSelect}
          onNewEncounter={handleNewEncounter}
          onEncounterTitleChange={handleEncounterTitleChange}
          onEncounterTextChange={handleEncounterTextChange}
          onEncounterSave={handleEncounterSave}
          isSavingEncounter={savingEncounter}
          loadingEncounter={loadingEncounter}
          encounterConflict={encounterConflict}
          onEncounterLoadLatest={handleEncounterLoadLatest}
        />
      </main>
    </div>
  );
}
