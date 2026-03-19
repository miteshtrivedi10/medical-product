export function Card({ children, className = "" }) {
  return <section className={`panel ${className}`}>{children}</section>;
}

export function CardHeader({ title, actions }) {
  return (
    <div className="panel-header">
      <h2>{title}</h2>
      {actions}
    </div>
  );
}
