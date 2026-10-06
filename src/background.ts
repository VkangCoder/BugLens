import { captureConfig } from "./config.js";
import { loadEnv } from "./env.js";

// ── Recording filters (see config.ts) ──
function shouldKeep(event: BugEvent): boolean {
  if (!captureConfig.events[event.type]) return false;

  switch (event.type) {
    case "console":
      return captureConfig.console.levels.includes(event.data.level);
    case "network": {
      const { url, status } = event.data;
      if (captureConfig.network.ignoreUrls.some((part) => url.includes(part))) return false;
      return !captureConfig.network.onlyFailed || status === 0 || status >= 400;
    }
    default:
      return true;
  }
}

function applyMasking(event: BugEvent): BugEvent {
  if (event.type === "input" && captureConfig.input.maskAllValues && !event.data.masked) {
    return { ...event, data: { ...event.data, value: "[REDACTED]", masked: true } };
  }
  return event;
}

// Events can arrive in bursts (network, console). Appending one at a time
// avoids two get/set calls overwriting each other and losing events.
let writeQueue: Promise<void> = Promise.resolve();

function appendEvent(event: BugEvent): void {
  writeQueue = writeQueue
    .then(async () => {
      const { isRecording, events = [] } = (await chrome.storage.local.get(["isRecording", "events"])) as StorageShape;
      if (!isRecording || events.length >= captureConfig.maxEvents) return;
      await chrome.storage.local.set({ events: [...events, event] } satisfies StorageShape);
    })
    .catch((err: unknown) => console.error("Failed to store event:", err));
}

// ── Session metadata ──
function getBrowserInfo(): BrowserInfo {
  // e.g. [{ brand: "Google Chrome", version: "150" }, { brand: "Chromium", ... }, { brand: "Not=A?Brand", ... }]
  const brands = (navigator as Navigator & { userAgentData?: { brands: { brand: string; version: string }[] } })
    .userAgentData?.brands;
  const main =
    brands?.find((b) => !/not.?a.?brand/i.test(b.brand) && b.brand !== "Chromium") ??
    brands?.find((b) => b.brand === "Chromium");
  if (main) return { name: main.brand, version: main.version };

  const match = navigator.userAgent.match(/Chrome\/([\d.]+)/);
  return { name: "Chrome", version: match?.[1] ?? "unknown" };
}

// ── Upload ──
function uploadSession(): void {
  chrome.storage.local.get(["session", "events"], (raw) => {
    const { session, events } = raw as StorageShape;

    if (!session || !events || events.length === 0) {
      chrome.storage.local.set({ isUploading: false } satisfies StorageShape);
      return;
    }

    const body = {
      projectId: captureConfig.projectId,
      startedAt: session.startedAt,
      endedAt: session.endedAt ?? new Date().toISOString(),
      initialUrl: session.initialUrl,
      browser: session.browser,
      viewport: session.viewport,
      events,
    };

    loadEnv()
      .then((env) =>
        fetch(`${env.API_BASE_URL}/api/v1/sessions`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        }),
      )
      .then(async (res) => {
        if (!res.ok) throw new Error(`Upload failed with status ${res.status}`);

        const created = (await res.json()) as { id: string };
        console.log("Session uploaded");

        chrome.storage.local.set({
          isUploading: false,
          uploadError: null,
          events: [],
          session: null,
          lastSession: {
            id: created.id,
            eventCount: events.length,
            savedAt: new Date().toISOString(),
            seen: false,
          },
        } satisfies StorageShape);
      })
      .catch((err: unknown) => {
        const messageText = err instanceof Error ? err.message : String(err);
        console.error("Upload error:", messageText);
        chrome.storage.local.set({
          isUploading: false,
          uploadError: messageText,
        } satisfies StorageShape);
      });
  });
}

// ── Messages from content.ts and popup.ts ──
chrome.runtime.onMessage.addListener((message: RuntimeMessage) => {
  switch (message.type) {
    case "EVENT":
      if (shouldKeep(message.event)) appendEvent(applyMasking(message.event));
      break;

    case "START_RECORDING":
      chrome.tabs.query({ active: true, currentWindow: true }).then(([tab]) => {
        const startedAt = new Date().toISOString();
        const initialUrl = tab?.url ?? "";

        const session: SessionMeta = {
          startedAt,
          initialUrl,
          browser: getBrowserInfo(),
          viewport: { width: tab?.width ?? 0, height: tab?.height ?? 0 },
        };

        // First event: where the recording started
        const initial: BugNavigationEvent = {
          type: "navigation",
          timestamp: startedAt,
          url: initialUrl,
          data: { kind: "initial", from: "", to: initialUrl },
        };

        chrome.storage.local.set({
          isRecording: true,
          isUploading: false,
          uploadError: null,
          events: captureConfig.events.navigation ? [initial] : [],
          session,
        } satisfies StorageShape);
        console.log("Recording started");
      });
      break;

    case "STOP_RECORDING":
      // Wait for events still being written before uploading
      writeQueue = writeQueue.then(async () => {
        const { session } = (await chrome.storage.local.get("session")) as StorageShape;
        await chrome.storage.local.set({
          isRecording: false,
          isUploading: true,
          uploadError: null,
          session: session ? { ...session, endedAt: new Date().toISOString() } : session,
        } satisfies StorageShape);
        uploadSession();
      });
      break;

    case "RETRY_UPLOAD":
      chrome.storage.local.set({ isUploading: true, uploadError: null } satisfies StorageShape, uploadSession);
      break;

    case "DISCARD_SESSION":
      chrome.storage.local.set({
        isUploading: false,
        uploadError: null,
        events: [],
        session: null,
      } satisfies StorageShape);
      break;

    default: {
      const _exhaustive: never = message;
      void _exhaustive;
    }
  }
});
