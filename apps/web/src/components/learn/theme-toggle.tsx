"use client";

import { useSyncExternalStore } from "react";
import { Monitor, Moon, Sun } from "lucide-react";

import { themeStorageKey as storageKey } from "./theme-script";

type Theme = "light" | "dark" | "system";

const changeEvent = "learn-theme-change";

const options = [
  { value: "light", label: "Light", Icon: Sun },
  { value: "dark", label: "Dark", Icon: Moon },
  { value: "system", label: "System", Icon: Monitor },
] as const;

function readTheme(): Theme {
  const theme = document.documentElement.dataset.theme;
  return theme === "light" || theme === "dark" ? theme : "system";
}

function subscribe(onChange: () => void) {
  const onStorage = (event: StorageEvent) => {
    if (event.key === storageKey) applyTheme(parseTheme(event.newValue), false);
  };
  window.addEventListener(changeEvent, onChange);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener(changeEvent, onChange);
    window.removeEventListener("storage", onStorage);
  };
}

function parseTheme(value: string | null): Theme {
  return value === "light" || value === "dark" ? value : "system";
}

function applyTheme(theme: Theme, persist: boolean) {
  const root = document.documentElement;
  const update = () => {
    if (theme === "system") delete root.dataset.theme;
    else root.dataset.theme = theme;
    window.dispatchEvent(new Event(changeEvent));
  };

  if (persist) {
    try {
      if (theme === "system") localStorage.removeItem(storageKey);
      else localStorage.setItem(storageKey, theme);
    } catch {}
  }

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (persist && !reduceMotion && document.startViewTransition) {
    document.startViewTransition(update);
  } else {
    update();
  }
}

export default function ThemeToggle({ className = "" }: { className?: string }) {
  const theme = useSyncExternalStore(subscribe, readTheme, () => "system" as const);

  return (
    <div className={`theme-toggle ${className}`} role="radiogroup" aria-label="Color theme">
      {options.map(({ value, label, Icon }) => (
        <label key={value} title={label}>
          <input
            className="sr-only"
            type="radio"
            name="learn-theme"
            value={value}
            checked={theme === value}
            onChange={() => applyTheme(value, true)}
          />
          <Icon size={15} strokeWidth={1.8} aria-hidden="true" />
          <span className="sr-only">{label}</span>
        </label>
      ))}
    </div>
  );
}
