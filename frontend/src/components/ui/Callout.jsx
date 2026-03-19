export function Callout({ variant = "error", children }) {
  return <div className={`callout ${variant}`}>{children}</div>;
}
