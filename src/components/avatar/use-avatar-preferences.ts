"use client";

import { useMemo, useSyncExternalStore } from "react";
import type { Manifest } from "@/lib/avatar/types";

export interface AvatarPreferences {
  profile: string;
  name: string;
  role: "everyday" | "paperwork" | "shopping";
  tone: "calm" | "direct" | "warm";
}
const KEY = "avatar-studio-preferences-v1";
const CHANGE = "avatar-preferences-change";
let memory: string | null = null;
const subscribe = (notify: () => void) => {
  window.addEventListener("storage", notify);
  window.addEventListener(CHANGE, notify);
  return () => { window.removeEventListener("storage", notify); window.removeEventListener(CHANGE, notify); };
};
const snapshot = () => { try { return localStorage.getItem(KEY) ?? memory; } catch { return memory; } };
const defaults = (profiles: Manifest[]): AvatarPreferences => ({
  profile: profiles[0].profile, name: profiles[0].profile === "desk" ? "Alex" : profiles[0].label.split(" · ")[0], role: "everyday", tone: "calm",
});

export function useAvatarPreferences(profiles: Manifest[]) {
  const raw = useSyncExternalStore(subscribe, snapshot, () => null);
  const preferences = useMemo(() => {
    const base = defaults(profiles);
    try {
      const saved = JSON.parse(raw ?? "null");
      if (!saved) return base;
      // Retire the former studio and office looks while preserving the user's name and focus.
      if ((saved.profile === "studio" || saved.profile === "office") && profiles.some((p) => p.profile === "desk")) saved.profile = "desk";
      if (!profiles.some((p) => p.profile === saved.profile)) return base;
      if (typeof saved.name !== "string" || !/^[\p{L}\p{M}\p{N}][\p{L}\p{M}\p{N} '\u2019-]{0,31}$/u.test(saved.name.trim())) return base;
      if (!["everyday", "paperwork", "shopping"].includes(saved.role) || !["calm", "direct", "warm"].includes(saved.tone)) return base;
      return { profile: saved.profile, name: saved.name.trim(), role: saved.role, tone: saved.tone } as AvatarPreferences;
    } catch { return base; }
  }, [raw, profiles]);
  function save(value: AvatarPreferences) {
    memory = JSON.stringify(value);
    try { localStorage.setItem(KEY, memory); } catch { /* The selection still lasts for this page session. */ }
    window.dispatchEvent(new Event(CHANGE));
  }
  return { preferences, save };
}
