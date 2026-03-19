import { Card, CardHeader, Callout } from "./ui";
import { formatTimestamp } from "../utils/format";
import { AI_FAILURE_MESSAGE } from "../constants";

function SummaryBlock({ label, children }) {
  return (
    <div className="summary-block">
      <label>{label}</label>
      {children}
    </div>
  );
}

function WatchList({ items }) {
  if (!items.length) {
    return <p>No watch items noted.</p>;
  }

  return (
    <ul className="watch-list">
      {items.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  );
}

export function SummaryCard({ summary }) {
  const {
    status,
    patient_status_summary,
    watch_items,
    next_encounter_focus,
    generated_at,
  } = summary;

  return (
    <Card>
      <CardHeader
        title="Visit Prep Summary"
        actions={<span className={`summary-chip ${status}`}>{status}</span>}
      />

      {status === "failed" ? (
        <Callout variant="error">{AI_FAILURE_MESSAGE}</Callout>
      ) : (
        <>
          <SummaryBlock label="Now">
            <p>{patient_status_summary || "No summary generated yet."}</p>
          </SummaryBlock>

          <SummaryBlock label="Watch">
            <WatchList items={watch_items} />
          </SummaryBlock>

          <SummaryBlock label="Next Visit">
            <p>{next_encounter_focus || "No next-visit guidance yet."}</p>
          </SummaryBlock>
        </>
      )}

      <p className="meta-line">Last updated: {formatTimestamp(generated_at)}</p>
    </Card>
  );
}
