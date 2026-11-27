"use client";

import { useSyncExternalStore } from "react";

export const THEME_STORAGE_KEY = "gpt-view-theme";
type Mode = "system" | "light" | "dark";
const OPTIONS: { value: Mode; label: string }[] = [
  { value: "system", label: "Auto" },
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
];

const listeners = new Set<() => void>();

function subscribe(onChange: () => void) {
  listeners.add(onChange);
  window.addEventListener("storage", onChange);
  return () => {
    listeners.delete(onChange);
    window.removeEventListener("storage", onChange);
  };
}

function getSnapshot(): Mode {
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    if (stored === "light" || stored === "dark") return stored;
  } catch {
    // Storage can be blocked; the device setting still applies.
  }
  return "system";
}

// Server render and the first client render both use "Auto"; the stored choice applies after hydration.
const getServerSnapshot = (): Mode => "system";

function choose(next: Mode) {
  const root = document.documentElement;
  root.classList.remove("light", "dark");
  if (next !== "system") root.classList.add(next);
  try {
    if (next === "system") localStorage.removeItem(THEME_STORAGE_KEY);
    else localStorage.setItem(THEME_STORAGE_KEY, next);
  } catch {
    // Ignore: the choice still applies for this visit.
  }
  listeners.forEach((notify) => notify());
}

/** Three-way theme choice. "Auto" follows the device; the choice is kept on this browser only. */
export function ThemeToggle() {
  const mode = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  return (
    <div role="group" aria-label="Colour theme" className="flex border-2 border-ink text-xs font-semibold uppercase tracking-widest">
      {OPTIONS.map((option) => (
        <button
          key={option.value}
          type="button"
          aria-pressed={mode === option.value}
          onClick={() => choose(option.value)}
          className={`px-2.5 py-1.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink ${
            mode === option.value ? "bg-ink text-paper" : "bg-paper text-ink hover:underline"
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
