// 1. Recorded events (stored in chrome.storage, uploaded to the API)
interface BugEventBase {
  timestamp: string; // ISO 8601
  url: string;
}

// User clicked an element
interface BugClickEvent extends BugEventBase {
  type: "click";
  data: {
    tagName: string;
    selector: string; // e.g. button#pay, a.nav-link, [data-testid="submit"]
    text: string;
    x: number;
    y: number;
  };
}

// User changed the value of an input, textarea or select
interface BugInputEvent extends BugEventBase {
  type: "input";
  data: {
    tagName: string;
    inputType: string; // text, email, password, checkbox, select-one, textarea...
    selector: string;
    value: string;
    masked: boolean; // true when the value was replaced before storing
  };
}

// Page load or URL change (SPA route change, back/forward, hash)
interface BugNavigationEvent extends BugEventBase {
  type: "navigation";
  data: {
    kind: "initial" | "load" | "push" | "replace" | "pop" | "hash";
    from: string;
    to: string;
  };
}

// fetch() or XMLHttpRequest made by the page
interface BugNetworkEvent extends BugEventBase {
  type: "network";
  data: {
    initiator: "fetch" | "xhr";
    method: string;
    url: string;
    status: number; // 0 when the request failed before a response
    duration: number; // ms
    error?: string; // network error message (CORS, offline, aborted...)
  };
}

// console.* called by the page
interface BugConsoleEvent extends BugEventBase {
  type: "console";
  data: {
    level: ConsoleLevel;
    message: string;
  };
}

// Uncaught JS error, unhandled promise rejection, or failed resource load
interface BugErrorEvent extends BugEventBase {
  type: "error";
  data: {
    kind: "error" | "unhandledrejection" | "resource";
    message: string;
    stack?: string;
    source?: string; // file (error) or resource URL (resource)
    line?: number;
    column?: number;
  };
}

type ConsoleLevel = "log" | "info" | "warn" | "error" | "debug";

type BugEvent =
  | BugClickEvent
  | BugInputEvent
  | BugNavigationEvent
  | BugNetworkEvent
  | BugConsoleEvent
  | BugErrorEvent;

type BugEventType = BugEvent["type"];

// 2. Session metadata (buffer in chrome.storage)
interface BrowserInfo {
  name: string;
  version: string;
}

interface ViewportInfo {
  width: number;
  height: number;
}

interface SessionMeta {
  startedAt: string;
  endedAt?: string;
  initialUrl: string;
  browser: BrowserInfo;
  viewport: ViewportInfo;
}

interface LastSession {
  id: string;
  eventCount: number;
  savedAt: string;
  seen: boolean;
}

// 3. Shape of chrome.storage.local
interface StorageShape {
  isRecording?: boolean;
  isUploading?: boolean;
  uploadError?: string | null;
  events?: BugEvent[];
  session?: SessionMeta | null;
  lastSession?: LastSession | null;
}

// 4. Message protocol (content/popup → background)
interface EventMessage {
  type: "EVENT";
  event: BugEvent;
}

interface StartRecordingMessage {
  type: "START_RECORDING";
}
interface StopRecordingMessage {
  type: "STOP_RECORDING";
}
interface RetryUploadMessage {
  type: "RETRY_UPLOAD";
}
interface DiscardSessionMessage {
  type: "DISCARD_SESSION";
}

type RuntimeMessage =
  | EventMessage
  | StartRecordingMessage
  | StopRecordingMessage
  | RetryUploadMessage
  | DiscardSessionMessage;

// 5. Bridge: main-world.js (page context) → content.js via window.postMessage
interface BridgeMessage {
  source: "buglens-main-world";
  event: BugNavigationEvent | BugNetworkEvent | BugConsoleEvent | BugErrorEvent;
}

interface EnvConfig {
  API_BASE_URL: string;
  DASHBOARD_URL: string;
}
