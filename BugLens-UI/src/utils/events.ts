import {
  CircleAlert,
  Compass,
  Globe,
  MousePointerClick,
  Terminal,
  TextCursorInput,
  type LucideIcon,
} from "lucide-react";
import type { BugEvent, BugEventType } from "@/types/session";

// Label, icon and color per event type (buglens-design EventTag)
export const EVENT_META: Record<BugEventType, { label: string; icon: LucideIcon; color: string }> = {
  click: { label: "click", icon: MousePointerClick, color: "var(--event-click)" },
  input: { label: "input", icon: TextCursorInput, color: "var(--event-input)" },
  navigation: { label: "nav", icon: Compass, color: "var(--event-navigation)" },
  network: { label: "fetch", icon: Globe, color: "var(--event-network)" },
  console: { label: "console", icon: Terminal, color: "var(--event-console)" },
  error: { label: "error", icon: CircleAlert, color: "var(--event-error)" },
};

export const EVENT_TYPES = Object.keys(EVENT_META) as BugEventType[];

// 00:04.312 — time since the session started
export function formatOffset(ms: number): string {
  const safe = Math.max(0, ms);
  const m = Math.floor(safe / 60000);
  const s = Math.floor((safe % 60000) / 1000);
  const r = Math.floor(safe % 1000);
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}.${String(r).padStart(3, "0")}`;
}

function pathOf(url: string): string {
  try {
    const { pathname, search } = new URL(url);
    return pathname + search;
  } catch {
    return url;
  }
}

// What the row shows: target (mono, main) + detail (muted)
export function describeEvent(event: BugEvent): { target: string; detail?: string } {
  switch (event.type) {
    case "click":
      // Old sessions have no selector
      return { target: event.data.selector ?? event.data.tagName.toLowerCase(), detail: event.data.text || undefined };
    case "input":
      return { target: event.data.selector, detail: event.data.masked ? undefined : `“${event.data.value}”` };
    case "navigation":
      return { target: pathOf(event.data.to), detail: event.data.kind === "initial" ? "Recording started" : event.data.kind };
    case "network":
      return {
        target: `${event.data.method} ${pathOf(event.data.url)}`,
        detail: `${event.data.status || "failed"} · ${event.data.duration} ms${event.data.error ? ` · ${event.data.error}` : ""}`,
      };
    case "console":
      return { target: `console.${event.data.level}`, detail: event.data.message };
    case "error":
      return { target: event.data.message.split(":")[0] || "Error", detail: event.data.message };
    default: {
      const _exhaustive: never = event;
      return _exhaustive;
    }
  }
}

export function isMasked(event: BugEvent): boolean {
  return event.type === "input" && event.data.masked;
}
