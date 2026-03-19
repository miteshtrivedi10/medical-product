import { useState } from "react";
import { Button, Input, TextArea, Callout } from "./ui";
import { formatTimestamp } from "../utils/format";

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

export function EncounterEditor({
  draft,
  selectedEncounter,
  onTitleChange,
  onTextChange,
  onSave,
  isSaving,
  isLoading,
  conflict,
}) {
  const isEdit = !!draft.id;

  const metaText = isEdit && selectedEncounter
    ? `Version ${draft.version} · Updated by ${selectedEncounter.updated_by} · ${formatTimestamp(selectedEncounter.updated_at)}`
    : "New encounter draft";

  function handleLoadLatest() {
    onLoadLatest({
      title: conflict.current_title || draft.title,
      text: conflict.current_text,
      version: conflict.current_version,
    });
  }

  return (
    <div className="encounter-editor">
      <label>
        Title
        <Input value={draft.title} onChange={onTitleChange} />
      </label>

      <p className="meta-line">{metaText}</p>

      <TextArea
        value={draft.text}
        onChange={onTextChange}
        className="encounter-textarea"
        minRows={8}
      />

      {conflict ? (
        <ConflictWarning conflict={conflict} onLoadLatest={handleLoadLatest} />
      ) : null}

      <Button
        variant="primary"
        disabled={isSaving || isLoading || !draft.title.trim()}
        onClick={onSave}
      >
        {isSaving ? "Saving..." : isEdit ? "Save Encounter" : "Create Encounter"}
      </Button>
    </div>
  );
}
