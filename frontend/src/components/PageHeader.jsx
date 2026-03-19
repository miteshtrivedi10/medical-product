export function PageHeader({ patientName, dob }) {
  return (
    <header className="page-header">
      <div>
        <h2>{patientName}</h2>
        <p>DOB: {dob}</p>
      </div>
    </header>
  );
}
