import * as stylex from "@stylexjs/stylex";
import { X } from "lucide-react";
import type { ReactNode } from "react";
export const ui = stylex.create({
  button: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingBlock: "11px",
    paddingInline: "16px",
    backgroundColor: { default: "#ffffff", ":hover": "#edf1ec" },
    color: "#232822",
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: "#cbd2ca",
    borderRadius: 10,
    fontSize: 14,
    fontWeight: 500,
    minHeight: 44,
    transition: "background-color .2s",
  },
  primary: {
    backgroundColor: { default: "#315d47", ":hover": "#254b38" },
    color: "#ffffff",
    borderColor: "#315d47",
  },
  ghost: {
    backgroundColor: { default: "transparent", ":hover": "#edf1ec" },
    borderColor: "transparent",
    color: "#526452",
  },
  danger: { color: "#9e392b", borderColor: "#d6b5ae" },
  input: {
    paddingBlock: "12px",
    paddingInline: "14px",
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: "#bcc5ba",
    borderRadius: 9,
    backgroundColor: "#ffffff",
    color: "#232822",
    width: "100%",
  },
  label: {
    display: "flex",
    flexDirection: "column",
    gap: 10,
    fontSize: 14,
    color: "#4d564d",
  },
  muted: { fontSize: 14, lineHeight: 1.8, color: "#626862" },
  sectionTitle: { fontSize: 18, fontWeight: 500, letterSpacing: -0.5 },
  row: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 16,
  },
  stack: { display: "flex", flexDirection: "column", gap: 20 },
  badge: {
    display: "inline-flex",
    alignItems: "center",
    gap: 7,
    fontSize: 13,
    color: "#315d47",
    paddingBlock: "6px",
    paddingInline: "9px",
    backgroundColor: "#edf3eb",
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: "#cbd7ca",
    borderRadius: 7,
  },
});
const s = stylex.create({
  dialog: {
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: "#cbd2ca",
    borderRadius: 12,
    padding: 28,
    backgroundColor: "#ffffff",
    color: "#232822",
    width: "min(460px, calc(100vw - 32px))",
    boxShadow: "0 30px 100px #1a2a1833",
    position: "fixed",
    inset: 0,
    margin: "auto",
    maxHeight: "90dvh",
    overflowY: "auto",
    "::backdrop": { backgroundColor: "#17221766", backdropFilter: "none" },
  },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 16,
    marginBottom: 24,
  },
});
export function Modal({
  title,
  children,
  onClose,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
}) {
  return (
    <dialog
      ref={(node) => {
        node?.showModal();
      }}
      onCancel={onClose}
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          const rect = event.currentTarget.getBoundingClientRect();
          if (
            event.clientX < rect.left ||
            event.clientX > rect.right ||
            event.clientY < rect.top ||
            event.clientY > rect.bottom
          )
            onClose();
        }
      }}
      aria-labelledby="dialog-title"
      {...stylex.props(s.dialog)}
    >
      <div {...stylex.props(s.header)}>
        <h2 id="dialog-title" {...stylex.props(ui.sectionTitle)}>
          {title}
        </h2>
        <button aria-label="Close dialog" onClick={onClose} {...stylex.props(ui.button, ui.ghost)}>
          <X size={18} />
        </button>
      </div>
      {children}
    </dialog>
  );
}
