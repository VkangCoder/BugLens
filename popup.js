const $ = (id) => document.getElementById(id);

const views = {
  idle: $("view-idle"),
  recording: $("view-recording"),
  uploading: $("view-uploading"),
  failed: $("view-failed"),
  saved: $("view-saved"),
};

const FEED_SIZE = 6;

let state = {};
let timerId;

// 00:04.312 — offset of an event from the start of the session
function formatOffset(ms) {
  const safe = Math.max(0, ms);
  const m = Math.floor(safe / 60000);
  const s = Math.floor((safe % 60000) / 1000);
  const r = Math.floor(safe % 1000);
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}.${String(r).padStart(3, "0")}`;
}

function formatRelative(iso) {
  const minutes = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} h ago`;
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function pluralEvents(n) {
  return `${n} ${n === 1 ? "event" : "events"}`;
}

function currentView() {
  if (state.isRecording) return "recording";
  if (state.isUploading) return "uploading";
  if (state.uploadError) return "failed";
  if (state.lastSession && !state.lastSession.seen) return "saved";
  return "idle";
}

function renderFeed(events, startedAt) {
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

        const tag = document.createElement("span");
        tag.className = "event-tag event-tag-click";
        tag.innerHTML = '<svg class="icon icon-sm"><use href="#i-mouse-pointer-click" /></svg>click';

        const target = document.createElement("span");
        target.className = "feed-target";
        const tagName = (event.data?.tagName ?? "").toLowerCase();
        const text = event.data?.text;
        target.textContent = text ? `${tagName} “${text}”` : tagName;
        target.title = target.textContent;

        item.append(time, tag, target);
        return item;
      }),
  );
  $("feed-empty").hidden = events.length > 0;
}

function renderElapsed() {
  const startedAt = state.session?.startedAt;
  if (!startedAt) return;
  $("elapsed").textContent = formatOffset(Date.now() - new Date(startedAt).getTime()).slice(0, 5);
}

function render() {
  const view = currentView();
  for (const [name, el] of Object.entries(views)) el.hidden = name !== view;

  const events = state.events ?? [];

  $("recording-indicator").hidden = view !== "recording";
  clearInterval(timerId);
  if (view === "recording") {
    renderElapsed();
    timerId = setInterval(renderElapsed, 250);
  }

  $("count").textContent = events.length;
  renderFeed(events, state.session?.startedAt);

  $("uploading-count").textContent = pluralEvents(events.length);
  $("failed-message").textContent = state.uploadError ?? "";

  const last = state.lastSession;
  $("last-session").textContent = last ? `Last session · ${formatRelative(last.savedAt)}` : "No sessions yet";
  if (last) {
    $("saved-id").textContent = last.id;
    $("saved-count").textContent = pluralEvents(last.eventCount);
  }
}

async function openDashboard(path = "") {
  const env = await loadEnv();
  chrome.tabs.create({ url: `${env.DASHBOARD_URL}${path}` });
}

function markSessionSeen() {
  if (state.lastSession) {
    chrome.storage.local.set({ lastSession: { ...state.lastSession, seen: true } });
  }
}

// ── Actions ──
$("start").addEventListener("click", () => {
  markSessionSeen();
  chrome.runtime.sendMessage({ type: "START_RECORDING" });
});

$("stop").addEventListener("click", () => {
  chrome.runtime.sendMessage({ type: "STOP_RECORDING" });
});

$("retry").addEventListener("click", () => {
  chrome.runtime.sendMessage({ type: "RETRY_UPLOAD" });
});

$("discard").addEventListener("click", () => {
  chrome.runtime.sendMessage({ type: "DISCARD_SESSION" });
});

$("record-another").addEventListener("click", markSessionSeen);

$("open-dashboard").addEventListener("click", (e) => {
  e.preventDefault();
  openDashboard();
});

$("open-session").addEventListener("click", () => {
  markSessionSeen();
  openDashboard(`/sessions/${state.lastSession.id}`);
});

$("copy-id").addEventListener("click", async () => {
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
  ["isRecording", "isUploading", "uploadError", "events", "session", "lastSession"],
  (result) => {
    state = result;
    render();
  },
);

chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName !== "local") return;
  for (const [key, { newValue }] of Object.entries(changes)) state[key] = newValue;
  render();
});
