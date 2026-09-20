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
    backgroundColor: { default: "#232a23", ":hover": "#30392b" },
    color: "#dce4d5",
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: "#384031",
    borderRadius: 10,
    fontSize: 12,
    fontWeight: 500,
    transition: "background-color .2s",
  },
  primary: {
    backgroundColor: { default: "#d8edaa", ":hover": "#e5f5c3" },
    color: "#29351e",
    borderColor: "#d8edaa",
  },
  ghost: {
    backgroundColor: { default: "transparent", ":hover": "#252d24" },
    borderColor: "transparent",
    color: "#9da794",
  },
  danger: { color: "#ecb3a7", borderColor: "#6a473d" },
  input: {
    paddingBlock: "12px",
    paddingInline: "14px",
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: "#394133",
    borderRadius: 9,
    backgroundColor: "#171d17",
    color: "#e7eddf",
    width: "100%",
  },
  label: {
    display: "flex",
    flexDirection: "column",
    gap: 10,
    fontSize: 12,
    color: "#a9b49f",
  },
  muted: { fontSize: 12, lineHeight: 1.8, color: "#929e88" },
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
    fontSize: 10,
    color: "#bccda6",
    paddingBlock: "6px",
    paddingInline: "9px",
    backgroundColor: "#a5c6770c",
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: "#46513b",
    borderRadius: 7,
  },
});
const s = stylex.create({
  dialog: {
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: "#414b37",
    borderRadius: 20,
    padding: 28,
    backgroundColor: "#1b221b",
    color: "#e7eddf",
    width: "min(460px, calc(100vw - 32px))",
    boxShadow: "0 30px 100px #0009",
    position: "fixed",
    inset: 0,
    margin: "auto",
    maxHeight: "90dvh",
    overflowY: "auto",
    "::backdrop": { backgroundColor: "#070a07b0", backdropFilter: "blur(8px)" },
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
