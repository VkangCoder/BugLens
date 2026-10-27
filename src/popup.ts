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
        time.textContent = formatOffset(new Date(event.timestamp).getTime() - start).slice(0, 7);

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
  $("elapsed").textContent = formatOffset(Date.now() - new Date(startedAt).getTime()).slice(0, 5);
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

  // Start recording only with a key the API has accepted (empty, wrong or still being checked → disabled)
  const keyReady = Boolean(state.ingestKey?.trim()) && state.ingestKeyValidated === true;
  const startButton = $("start") as HTMLButtonElement;
  startButton.disabled = !keyReady;
  startButton.title = keyReady ? "" : "Enter a valid Ingest Key to start recording";

  const retryButton = $("retry") as HTMLButtonElement;
  retryButton.disabled = !keyReady;
  retryButton.title = keyReady ? "" : "Enter a valid Ingest Key to retry the upload";

  const projectName = keyReady ? state.ingestProject?.name : undefined;
  const projectChip = $("project-chip");
  projectChip.hidden = !projectName;
  projectChip.textContent = projectName ?? "";
  projectChip.title = projectName ? `Sessions are saved to project ${projectName}` : "";

  $("count").textContent = String(events.length);
  renderFeed(events, state.session?.startedAt);

  $("uploading-count").textContent = pluralEvents(events.length);
  $("failed-message").textContent = state.uploadError ?? "";

  const last = state.lastSession;
  $("last-session").textContent = last ? `Last session · ${formatRelative(last.savedAt)}` : "No sessions yet";
  if (last) {
    $("saved-id").textContent = last.id;
    $("saved-count").textContent = last.projectName
      ? `${pluralEvents(last.eventCount)} · ${last.projectName}`
      : pluralEvents(last.eventCount);
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
$("start").addEventListener("click", async () => {
  const { ingestKey, ingestKeyValidated } = (await chrome.storage.local.get([
    "ingestKey",
    "ingestKeyValidated",
  ])) as StorageShape;

  if (!ingestKey?.trim() || ingestKeyValidated !== true) {
    const status = $("key-status");
    status.textContent = "The Ingest Key has not been authenticated by the API. Please enter a valid key..";
    status.dataset.state = "error";

    ($("ingest-key") as HTMLInputElement).focus();
    return;
  }

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
  if (state.lastSession) void openDashboard(`/sessions/${state.lastSession.id}`);
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
    "ingestKey",
    "ingestKeyValidated",
    "ingestProject",
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

const domainsInput = $("domains") as HTMLInputElement;

chrome.storage.local.get("allowedDomains", (raw) => {
  domainsInput.value = ((raw as StorageShape).allowedDomains ?? []).join(", ");
});

domainsInput.addEventListener("change", () => {
  const list = domainsInput.value
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  chrome.storage.local.set({ allowedDomains: list } satisfies StorageShape);
});

// The API rejected the key (401/403). Only this clears the saved key; network errors and 5xx keep it.
class InvalidKeyError extends Error {}

const KEY_STORAGE = ["ingestKey", "ingestKeyValidated", "ingestProject"] as const;

async function validateIngestKey(key: string): Promise<IngestProject> {
  const env = await loadEnv();

  const response = await fetch(`${env.API_BASE_URL}/api/v1/ingest/validate-key`, {
    method: "POST",
    headers: {
      "X-Api-Key": key,
    },
    cache: "no-store",
  });

  if (response.status === 401 || response.status === 403) {
    throw new InvalidKeyError("Ingest Key is invalid or revoked.");
  }

  if (!response.ok) {
    throw new Error(`Could not verify the key (HTTP ${response.status}).`);
  }

  const result = (await response.json()) as { valid?: boolean; projectId?: string; projectName?: string };

  if (result.valid !== true) {
    throw new InvalidKeyError("The API did not accept this Ingest Key.");
  }

  return { id: result.projectId ?? "", name: result.projectName ?? "Unknown project" };
}

function setupIngestKey(inputId: string, saveId: string, toggleId: string, statusId: string): void {
  const input = $(inputId) as HTMLInputElement;
  const saveButton = $(saveId) as HTMLButtonElement;
  const toggleButton = $(toggleId) as HTMLButtonElement;
  const status = $(statusId);

  let validationTimer: ReturnType<typeof setTimeout> | undefined;
  // Per input, so the idle and failed views don't cancel each other's check
  let validationVersion = 0;

  function setStatus(message: string, stateName: "success" | "error" | "" = ""): void {
    status.textContent = message;

    if (stateName) {
      status.dataset.state = stateName;
    } else {
      delete status.dataset.state;
    }
  }

  // Typing never touches storage: the saved key is only replaced once the API accepts a new one,
  // and only removed when the API rejects that same key (401/403) or Save is pressed on an empty field.
  async function readSaved(): Promise<StorageShape> {
    return (await chrome.storage.local.get(["ingestKey", "ingestKeyValidated"])) as StorageShape;
  }

  async function checkAndSaveKey(key: string): Promise<void> {
    const version = ++validationVersion;

    if (!key) {
      await chrome.storage.local.remove([...KEY_STORAGE]);
      if (version !== validationVersion) {
        return;
      }
      setStatus("Ingest Key removed.", "error");
      return;
    }

    setStatus("Checking key with API...");

    try {
      const project = await validateIngestKey(key);

      if (version !== validationVersion || input.value.trim() !== key) {
        return;
      }

      await chrome.storage.local.set({
        ingestKey: key,
        ingestKeyValidated: true,
        ingestProject: project,
      } satisfies StorageShape);

      setStatus(`Valid key · project ${project.name}.`, "success");
    } catch (error: unknown) {
      if (version !== validationVersion || input.value.trim() !== key) {
        return;
      }

      const saved = await readSaved();
      const otherKeyInUse = saved.ingestKeyValidated === true && saved.ingestKey !== key;

      if (error instanceof InvalidKeyError) {
        if (otherKeyInUse) {
          setStatus(`${error.message} The saved key is still in use.`, "error");
          return;
        }

        await chrome.storage.local.remove([...KEY_STORAGE]);
        setStatus(error.message, "error");
        return;
      }

      // API offline, restarting or 5xx: keep the key instead of wiping it
      const reason =
        error instanceof Error && !(error instanceof TypeError) ? error.message : "Could not reach the API.";

      if (saved.ingestKey === key && saved.ingestKeyValidated === true) {
        setStatus(`${reason} Using the saved key.`, "error");
        return;
      }

      if (otherKeyInUse) {
        setStatus(`${reason} The saved key is still in use; press Save to check the new one.`, "error");
        return;
      }

      // No working key yet: keep this one, but don't allow recording until the API accepts it
      await chrome.storage.local.set({ ingestKey: key, ingestKeyValidated: false } satisfies StorageShape);
      await chrome.storage.local.remove("ingestProject");
      setStatus(`${reason} Key saved; press Save to check again.`, "error");
    }
  }

  input.addEventListener("input", () => {
    validationVersion++;

    if (validationTimer) {
      clearTimeout(validationTimer);
    }

    const key = input.value.trim();

    if (!key) {
      void readSaved().then((saved) => {
        setStatus(
          saved.ingestKey
            ? "The saved key is still in use. Press Save with an empty field to remove it."
            : "Please enter the Ingest Key.",
        );
      });
      return;
    }

    setStatus("Awaiting key verification...");

    validationTimer = setTimeout(() => {
      void checkAndSaveKey(key);
    }, 500);
  });

  saveButton.addEventListener("click", () => {
    if (validationTimer) {
      clearTimeout(validationTimer);
    }

    void checkAndSaveKey(input.value.trim());
  });

  toggleButton.addEventListener("click", () => {
    const show = input.type === "password";

    input.type = show ? "text" : "password";
    toggleButton.textContent = show ? "Hide" : "Show";
    toggleButton.setAttribute("aria-label", show ? "Hide Ingest Key" : "Show Ingest Key");
  });

  void chrome.storage.local.get("ingestKey").then((raw) => {
    const key = (raw as StorageShape).ingestKey ?? "";

    if (key) {
      input.value = key;
      void checkAndSaveKey(key);
    } else {
      setStatus("Ingest Key not configured.");
    }
  });
}

setupIngestKey("ingest-key", "save-key", "toggle-key", "key-status");
setupIngestKey("failed-ingest-key", "save-failed-key", "toggle-failed-key", "failed-key-status");
