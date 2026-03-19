export function formatTimestamp(value) {
  if (!value) {
    return "Not available";
  }
  return new Date(value).toLocaleString();
}
