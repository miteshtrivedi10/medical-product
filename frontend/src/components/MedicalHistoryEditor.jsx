import { useState } from "react";
import { Card, CardHeader, Button, TextArea, Callout } from "./ui";
import { formatTimestamp } from "../utils/format";
import { EDIT_WARNING } from "../constants";

function ConflictWarning({ conflict, onLoadLatest }) {
  return (
    <Callout variant="warning">
      <div>{conflict.message}</div>
      <div>
        Latest saved by {conflict.updated_by} at{" "}
        {formatTimestamp(conflict.updated_at)}
      </div>
      <Button variant="secondary" onClick={onLoadLatest}>
        Load Latest Copy
      </Button>
    </Callout>
  );
}

export function MedicalHistoryEditor({
  medicalHistory,
  draftText,
  onTextChange,
  onSave,
  isSaving,
  conflict,
  onLoadLatest,
}) {
  return (
    <Card>
      <CardHeader
        title="Medical History"
        actions={
          <Button onClick={onSave} disabled={isSaving}>
            {isSaving ? "Saving..." : "Save"}
          </Button>
        }
      />

      <p className="meta-line">
        Version {medicalHistory.version} · Updated by {medicalHistory.updated_by}{" "}
        · {formatTimestamp(medicalHistory.updated_at)}
      </p>

      <TextArea value={draftText} onChange={onTextChange} />

      {conflict ? (
        <ConflictWarning
          conflict={conflict}
          onLoadLatest={() => onLoadLatest(conflict.current_text)}
        />
      ) : null}
    </Card>
  );
}
