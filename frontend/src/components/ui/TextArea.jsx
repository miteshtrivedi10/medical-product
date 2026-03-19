export function TextArea({ value, onChange, className = "", minRows = 10 }) {
  return (
    <textarea
      className={`editor ${className}`}
      value={value}
      onChange={onChange}
      rows={minRows}
    />
  );
}
