export function Button({
  children,
  onClick,
  type = "button",
  variant = "primary",
  disabled = false,
  className = "",
}) {
  const classNameMap = {
    primary: "primary-button",
    secondary: "secondary-button",
  };

  return (
    <button
      type={type}
      className={`${classNameMap[variant]} ${className}`}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  );
}
