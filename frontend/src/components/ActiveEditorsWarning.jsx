import { Callout } from "./ui";
import { EDIT_WARNING } from "../constants";

export function ActiveEditorsWarning({ activeEditors }) {
  if (!activeEditors || !activeEditors.length) {
    return null;
  }

  const editorNames = activeEditors.map((user) => user.display_name).join(", ");

  return (
    <Callout variant="warning">
      <strong>{EDIT_WARNING}</strong>
      <div>Active editors: {editorNames}</div>
    </Callout>
  );
}
