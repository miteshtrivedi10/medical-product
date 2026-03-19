import { useState } from "react";
import { Card, CardHeader, Button } from "./ui";
import { EncounterList } from "./EncounterList";
import { EncounterEditor } from "./EncounterEditor";

export function EncounterPanel({
  encounters,
  draft,
  selectedEncounter,
  conflict,
  isSaving,
  isLoading,
  onSelectEncounter,
  onNewEncounter,
  onTitleChange,
  onTextChange,
  onSave,
  onLoadLatest,
}) {
  return (
    <Card>
      <CardHeader
        title="Encounter Transcripts"
        actions={
          <Button variant="secondary" onClick={onNewEncounter}>
            New Encounter
          </Button>
        }
      />

      <div className="encounter-layout">
        <EncounterList
          encounters={encounters}
          selectedEncounterId={draft.id}
          onSelect={onSelectEncounter}
        />

        <EncounterEditor
          draft={draft}
          selectedEncounter={selectedEncounter}
          onTitleChange={onTitleChange}
          onTextChange={onTextChange}
          onSave={onSave}
          isSaving={isSaving}
          isLoading={isLoading}
          conflict={conflict}
          onLoadLatest={onLoadLatest}
        />
      </div>
    </Card>
  );
}
