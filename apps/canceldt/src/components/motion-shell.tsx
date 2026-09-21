"use client";

import type { ReactNode } from "react";

// Default to instant feedback until a pointer is used. Updating the attribute
// avoids rerendering the page just to track how the user is interacting.
export function MotionShell({ children }: { children: ReactNode }) {
  return (
    <div
      className="shell"
      data-input="keyboard"
      onPointerDownCapture={(event) => {
        event.currentTarget.dataset.input = "pointer";
      }}
      onKeyDownCapture={(event) => {
        event.currentTarget.dataset.input = "keyboard";
      }}
    >
      {children}
    </div>
  );
}
