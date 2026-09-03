export function Button({ variant = "secondary", size, loading, className, children, disabled, ...props }) {
  const cls = ["btn", `btn-${variant}`, size && `btn-${size}`, className].filter(Boolean).join(" ");
  return (
    <button
      className={cls}
      data-loading={loading || undefined}
      aria-busy={loading || undefined}
      disabled={disabled || loading}
      {...props}
    >
      {children}
      <span className="spinner" aria-hidden="true" />
    </button>
  );
}
