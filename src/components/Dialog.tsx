import { useEffect, useRef, type ReactNode } from "react";
import { X } from "lucide-react";
export function Dialog({
  title,
  close,
  children,
}: {
  title: string;
  close: () => void;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    ref.current?.showModal();
    const d = ref.current;
    return () => d?.close();
  }, []);
  return (
    <dialog
      ref={ref}
      onCancel={close}
      aria-labelledby="dialog-title"
      onClick={(e) => {
        if (e.target === ref.current) close();
      }}
    >
      <header>
        <h2 id="dialog-title">{title}</h2>
        <button className="icon" onClick={close} aria-label="Close dialog">
          <X size={19} />
        </button>
      </header>
      {children}
    </dialog>
  );
}
