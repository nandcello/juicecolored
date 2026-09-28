"use client";

import { useId, useRef, useState, type PointerEvent } from "react";
import { angleToStep, stepToAngle } from "../lib/fan-direction";
import s from "./fan-direction.module.css";

export function FanDirectionArc({
  position,
  total,
  disabled,
  onCommit,
}: {
  position: number | null;
  total: number;
  disabled: boolean;
  onCommit: (step: number) => Promise<void>;
}) {
  const helpId = useId();
  const [draft, setDraft] = useState<number | null>(null);
  const pointer = useRef<number | null>(null);
  const current = draft ?? position;
  const angle = current === null ? 0 : stepToAngle(current, total);
  const text = current === null ? "Not calibrated" : `${Math.round(angle)}°`;
  const locked = disabled || position === null;
  function fromPointer(event: PointerEvent<HTMLDivElement>) {
    const box = event.currentTarget.getBoundingClientRect();
    const x = ((event.clientX - box.left) / box.width) * 300 - 150;
    const y = 145 - ((event.clientY - box.top) / box.height) * 170;
    return angleToStep((Math.atan2(x, y) * 180) / Math.PI, total);
  }
  async function commit(step: number) {
    setDraft(null);
    await onCommit(step);
  }
  return (
    <div>
      <div className={s.heading}>
        <span>Fan direction</span>
        <output>
          {draft === null ? "Estimated · " : "Target · "}
          {text}
        </output>
      </div>
      <div
        className={s.arc}
        role="slider"
        aria-label="Fan direction"
        aria-orientation="horizontal"
        aria-valuemin={-70}
        aria-valuemax={70}
        aria-valuenow={Math.round(angle)}
        aria-valuetext={current === null ? "Not calibrated" : `${text}, estimated direction`}
        aria-describedby={helpId}
        aria-disabled={locked}
        tabIndex={locked ? -1 : 0}
        onPointerDown={(event) => {
          if (locked || !event.isPrimary || event.button !== 0) return;
          event.preventDefault();
          event.currentTarget.focus();
          pointer.current = event.pointerId;
          event.currentTarget.setPointerCapture(event.pointerId);
          setDraft(fromPointer(event));
        }}
        onPointerMove={(event) => {
          if (!locked && pointer.current === event.pointerId) setDraft(fromPointer(event));
        }}
        onPointerUp={(event) => {
          if (pointer.current !== event.pointerId) return;
          pointer.current = null;
          event.currentTarget.releasePointerCapture(event.pointerId);
          if (!locked) void commit(fromPointer(event));
          else setDraft(null);
        }}
        onPointerCancel={() => {
          pointer.current = null;
          setDraft(null);
        }}
        onLostPointerCapture={() => {
          pointer.current = null;
          setDraft(null);
        }}
        onKeyDown={(event) => {
          if (locked || pointer.current !== null) return;
          const delta = {
            ArrowLeft: -1,
            ArrowDown: -1,
            ArrowRight: 1,
            ArrowUp: 1,
            PageDown: -5,
            PageUp: 5,
          }[event.key];
          if (delta !== undefined || event.key === "Home" || event.key === "End") {
            event.preventDefault();
            setDraft((previous) =>
              event.key === "Home"
                ? 0
                : event.key === "End"
                  ? total
                  : Math.max(0, Math.min(total, (previous ?? position ?? 0) + (delta ?? 0))),
            );
          }
          if (event.key === "Escape") setDraft(null);
        }}
        onKeyUp={(event) => {
          if (
            !locked &&
            draft !== null &&
            [
              "ArrowLeft",
              "ArrowRight",
              "ArrowUp",
              "ArrowDown",
              "Home",
              "End",
              "PageUp",
              "PageDown",
            ].includes(event.key)
          ) {
            event.preventDefault();
            void commit(draft);
          }
        }}
        onBlur={() => setDraft(null)}
      >
        <svg viewBox="0 0 300 170" aria-hidden="true">
          <path d="M 37.24 103.96 A 120 120 0 0 1 262.76 103.96 L 150 145 Z" className={s.sector} />
          <path d="M 37.24 103.96 A 120 120 0 0 1 262.76 103.96" className={s.track} />
          <path d="M 150 145 V 25" className={s.centerLine} />
          {current !== null && (
            <g transform={`rotate(${angle} 150 145)`}>
              <path d="M 150 145 V 25" className={s.needle} />
              <circle cx="150" cy="25" r="12" className={s.handle} />
            </g>
          )}
          <circle cx="150" cy="145" r="7" className={s.pivot} />
        </svg>
      </div>
      <div className={s.labels}>
        <span>Left −70°</span>
        <span>Center 0°</span>
        <span>Right +70°</span>
      </div>
      <p id={helpId} className={s.hint}>
        Top view. Drag and release to aim. Arrow keys move one step.
      </p>
    </div>
  );
}
