import { useMemo, useState } from "react";
import { SummaryCard } from "./SummaryCard";
import { MedicalHistoryEditor } from "./MedicalHistoryEditor";
import { EncounterPanel } from "./EncounterPanel";
import { PageHeader } from "./PageHeader";
import { ActiveEditorsWarning } from "./ActiveEditorsWarning";
import { Callout } from "./ui";

export function PatientDetail({
  patientDetail,
  medicalHistoryDraft,
  onMedicalHistoryChange,
  onMedicalHistorySave,
  isSavingMedicalHistory,
  medicalHistoryConflict,
  onMedicalHistoryLoadLatest,
  encounterDraft,
  onEncounterSelect,
  onNewEncounter,
  onEncounterTitleChange,
  onEncounterTextChange,
  onEncounterSave,
  isSavingEncounter,
  loadingEncounter,
  encounterConflict,
  onEncounterLoadLatest,
}) {
  const selectedEncounterListItem = useMemo(() => {
    if (!patientDetail || !encounterDraft.id) {
      return null;
    }
    return (
      patientDetail.encounters.find((e) => e.id === encounterDraft.id) || null
    );
  }, [patientDetail, encounterDraft.id]);

  return (
    <>
      <PageHeader
        patientName={patientDetail.full_name}
        dob={patientDetail.dob}
      />

      <ActiveEditorsWarning activeEditors={patientDetail.active_editors} />

      <SummaryCard summary={patientDetail.latest_summary} />

      <section className="grid-layout">
        <MedicalHistoryEditor
          medicalHistory={patientDetail.medical_history}
          draftText={medicalHistoryDraft}
          onTextChange={onMedicalHistoryChange}
          onSave={onMedicalHistorySave}
          isSaving={isSavingMedicalHistory}
          conflict={medicalHistoryConflict}
          onLoadLatest={onMedicalHistoryLoadLatest}
        />

        <EncounterPanel
          encounters={patientDetail.encounters}
          draft={encounterDraft}
          selectedEncounter={selectedEncounterListItem}
          conflict={encounterConflict}
          isSaving={isSavingEncounter}
          isLoading={loadingEncounter}
          onSelectEncounter={onEncounterSelect}
          onNewEncounter={onNewEncounter}
          onTitleChange={onEncounterTitleChange}
          onTextChange={onEncounterTextChange}
          onSave={onEncounterSave}
          onLoadLatest={onEncounterLoadLatest}
        />
      </section>
    </>
  );
}
