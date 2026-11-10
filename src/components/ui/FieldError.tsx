export function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <p id={id} className="field-error m-0">
      <span className="err-tag" aria-hidden="true">
        ERR
      </span>
      <span>{message}</span>
    </p>
  );
}

export function FormMessage({ message, ok }: { message?: string; ok?: boolean }) {
  if (!message || ok) return null;
  return (
    <div role="alert" className="prose-text flex items-start gap-2 border border-down bg-[var(--down-soft)] px-3 py-2 text-sm/[22px]">
      <span className="err-tag mt-[3px]" aria-hidden="true">
        ERR
      </span>
      <span>{message}</span>
    </div>
  );
}
