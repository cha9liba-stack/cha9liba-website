interface FieldProps {
  label: string;
  error?: string;
  children: React.ReactNode;
  className?: string;
}

export default function Field({ label, error, children, className = "" }: FieldProps) {
  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      <label className="text-xs font-medium text-slate-600 uppercase tracking-wide">
        {label}
      </label>
      {children}
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}
