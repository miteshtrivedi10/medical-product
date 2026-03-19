import { formatTimestamp } from "../utils/format";

export function EncounterListItem({ encounter, isActive, onClick }) {
  return (
    <button
      className={`encounter-link ${isActive ? "active" : ""}`}
      onClick={onClick}
    >
      <span>{encounter.title}</span>
      <small>{formatTimestamp(encounter.updated_at)}</small>
    </button>
  );
}

export function EncounterList({ encounters, selectedEncounterId, onSelect }) {
  return (
    <div className="encounter-list">
      {encounters.map((encounter) => (
        <EncounterListItem
          key={encounter.id}
          encounter={encounter}
          isActive={encounter.id === selectedEncounterId}
          onClick={() => onSelect(encounter.id)}
        />
      ))}
    </div>
  );
}
