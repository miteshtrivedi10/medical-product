export function PatientList({ patients, selectedPatientId, onSelect }) {
  return (
    <div className="sidebar-section">
      <h2>Patients</h2>
      {patients.map((patient) => (
        <button
          key={patient.id}
          className={`patient-link ${patient.id === selectedPatientId ? "active" : ""}`}
          onClick={() => onSelect(patient.id)}
        >
          <span>{patient.full_name}</span>
          <small>{patient.summary_status}</small>
        </button>
      ))}
    </div>
  );
}
