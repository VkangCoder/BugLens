import { loadEnv } from "./env.js";

function $(id: string): HTMLElement {
  const el = document.getElementById(id);
  if (!el) throw new Error(`Missing #${id} in popup.html`);
  return el;
}

type ViewName = "idle" | "recording" | "uploading" | "failed" | "saved";

const views: Record<ViewName, HTMLElement> = {
  idle: $("view-idle"),
  recording: $("view-recording"),
  uploading: $("view-uploading"),
  failed: $("view-failed"),
  saved: $("view-saved"),
};

const FEED_SIZE = 6;

let state: StorageShape = {};
let timerId: number | undefined;

function formatOffset(ms: number): string {
  const safe = Math.max(0, ms);
  const m = Math.floor(safe / 60000);
  const s = Math.floor((safe % 60000) / 1000);
  const r = Math.floor(safe % 1000);
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}.${String(r).padStart(3, "0")}`;
}

function formatRelative(iso: string): string {
  const minutes = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} h ago`;
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function pluralEvents(n: number): string {
  return `${n} ${n === 1 ? "event" : "events"}`;
}

function currentView(): ViewName {
  if (state.isRecording) return "recording";
  if (state.isUploading) return "uploading";
  if (state.uploadError) return "failed";
  if (state.lastSession && !state.lastSession.seen) return "saved";
  return "idle";
}

// Label + Lucide icon per event type (buglens-design EventTag)
const EVENT_TAGS: Record<BugEventType, { label: string; icon: string }> = {
  click: { label: "click", icon: "mouse-pointer-click" },
  input: { label: "input", icon: "text-cursor-input" },
  navigation: { label: "nav", icon: "compass" },
  network: { label: "fetch", icon: "globe" },
  console: { label: "console", icon: "terminal" },
  error: { label: "error", icon: "circle-alert" },
};

function pathOf(url: string): string {
  try {
    const parsed = new URL(url);
    return parsed.pathname + parsed.search;
  } catch {
    return url;
  }
}

function describeEvent(event: BugEvent): string {
  switch (event.type) {
    case "click":
      return event.data.text ? `${event.data.selector} “${event.data.text}”` : event.data.selector;
    case "input":
      return `${event.data.selector} = ${event.data.value}`;
    case "navigation":
      return pathOf(event.data.to);
    case "network":
      return `${event.data.method} ${pathOf(event.data.url)} · ${event.data.status || "failed"}`;
    case "console":
      return `${event.data.level} · ${event.data.message}`;
    case "error":
      return event.data.message;
    default: {
      const _exhaustive: never = event;
      return _exhaustive;
    }
  }
}

function renderFeed(events: BugEvent[], startedAt?: string): void {
  const feed = $("feed");
  const start = new Date(startedAt ?? Date.now()).getTime();

  feed.replaceChildren(
    ...events
      .slice(-FEED_SIZE)
      .reverse()
      .map((event) => {
        const item = document.createElement("li");
        item.className = "feed-item";

        const time = document.createElement("span");
        time.className = "feed-time";
        time.textContent = formatOffset(
          new Date(event.timestamp).getTime() - start,
        ).slice(0, 7);

        const { label, icon } = EVENT_TAGS[event.type];
        const tag = document.createElement("span");
        tag.className = `event-tag event-tag-${event.type}`;
        tag.innerHTML = `<svg class="icon icon-sm"><use href="#i-${icon}" /></svg>${label}`;

        const targetEl = document.createElement("span");
        targetEl.className = "feed-target";
        targetEl.textContent = describeEvent(event);
        targetEl.title = targetEl.textContent;

        item.append(time, tag, targetEl);
        return item;
      }),
  );

  $("feed-empty").hidden = events.length > 0;
}

function renderElapsed(): void {
  const startedAt = state.session?.startedAt;
  if (!startedAt) return;
  $("elapsed").textContent = formatOffset(
    Date.now() - new Date(startedAt).getTime(),
  ).slice(0, 5);
}

function render(): void {
  const view = currentView();
  for (const [name, el] of Object.entries(views)) {
    el.hidden = name !== view;
  }

  const events = state.events ?? [];

  $("recording-indicator").hidden = view !== "recording";
  clearInterval(timerId);
  if (view === "recording") {
    renderElapsed();
    timerId = setInterval(renderElapsed, 250);
  }

  $("count").textContent = String(events.length);
  renderFeed(events, state.session?.startedAt);

  $("uploading-count").textContent = pluralEvents(events.length);
  $("failed-message").textContent = state.uploadError ?? "";

  const last = state.lastSession;
  $("last-session").textContent = last
    ? `Last session · ${formatRelative(last.savedAt)}`
    : "No sessions yet";
  if (last) {
    $("saved-id").textContent = last.id;
    $("saved-count").textContent = pluralEvents(last.eventCount);
  }
}

async function openDashboard(path = ""): Promise<void> {
  const env = await loadEnv();
  chrome.tabs.create({ url: `${env.DASHBOARD_URL}${path}` });
}

function markSessionSeen(): void {
  if (state.lastSession) {
    chrome.storage.local.set({
      lastSession: { ...state.lastSession, seen: true },
    } satisfies StorageShape);
  }
}

function send(message: RuntimeMessage): void {
  chrome.runtime.sendMessage(message);
}

// ── Actions ──
$("start").addEventListener("click", () => {
  markSessionSeen();
  send({ type: "START_RECORDING" });
});

$("stop").addEventListener("click", () => {
  send({ type: "STOP_RECORDING" });
});

$("retry").addEventListener("click", () => {
  send({ type: "RETRY_UPLOAD" });
});

$("discard").addEventListener("click", () => {
  send({ type: "DISCARD_SESSION" });
});

$("record-another").addEventListener("click", markSessionSeen);

$("open-dashboard").addEventListener("click", (e) => {
  e.preventDefault();
  void openDashboard();
});

$("open-session").addEventListener("click", () => {
  markSessionSeen();
  if (state.lastSession)
    void openDashboard(`/sessions/${state.lastSession.id}`);
});

$("copy-id").addEventListener("click", async () => {
  if (!state.lastSession) return;
  await navigator.clipboard.writeText(state.lastSession.id);
  $("copy-id").title = "Copied";
});

// ── State ──
chrome.tabs.query({ active: true, currentWindow: true }).then(([tab]) => {
  if (!tab?.url) return;
  try {
    const url = new URL(tab.url);
    $("site-url").textContent = url.host + url.pathname;
  } catch {
    $("site-url").textContent = tab.url;
  }
});

chrome.storage.local.get(
  [
    "isRecording",
    "isUploading",
    "uploadError",
    "events",
    "session",
    "lastSession",
  ],
  (raw) => {
    state = raw as StorageShape;
    render();
  },
);

chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName !== "local") return;
  const next = { ...state } as Record<string, unknown>;
  for (const [key, change] of Object.entries(changes)) {
    next[key] = change.newValue;
  }
  state = next as StorageShape;
  render();
});
