import { Button } from "./ui";
import { PatientList } from "./PatientList";

export function Sidebar({ userName, patients, selectedPatientId, onSelectPatient, onLogout }) {
  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <h1>Care Summary Portal</h1>
        <p>{userName}</p>
      </div>

      <Button variant="secondary" onClick={onLogout}>
        Sign Out
      </Button>

      <PatientList
        patients={patients}
        selectedPatientId={selectedPatientId}
        onSelect={onSelectPatient}
      />
    </aside>
  );
}
