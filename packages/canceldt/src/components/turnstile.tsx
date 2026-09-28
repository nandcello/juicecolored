"use client";
import Script from "next/script";
import { useCallback, useEffect, useRef } from "react";
type Turnstile = {
  render: (
    element: HTMLElement,
    options: { sitekey: string; action: string; theme: string; size: "compact" },
  ) => string;
  remove: (id: string) => void;
  reset: (id: string) => void;
};
declare global {
  interface Window {
    turnstile?: Turnstile;
  }
}
export function TurnstileCheck({ siteKey, attempt }: { siteKey: string; attempt: number }) {
  const element = useRef<HTMLDivElement>(null),
    widget = useRef<string | undefined>(undefined);
  const render = useCallback(() => {
    if (element.current && window.turnstile && widget.current === undefined)
      widget.current = window.turnstile.render(element.current, {
        sitekey: siteKey,
        action: "canceldt-report",
        theme: "light",
        size: "compact",
      });
  }, [siteKey]);
  useEffect(() => {
    render();
    return () => {
      if (widget.current !== undefined) window.turnstile?.remove(widget.current);
      widget.current = undefined;
    };
  }, [render]);
  useEffect(() => {
    if (attempt && widget.current !== undefined) window.turnstile?.reset(widget.current);
  }, [attempt]);
  return (
    <>
      <Script
        src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
        onReady={render}
      />
      <div ref={element} />
      <noscript>Enable JavaScript to complete the spam check and submit a report.</noscript>
    </>
  );
}
