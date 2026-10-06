// Event shapes match the extension (src/types/buglens.d.ts at the repo root)
export interface BugEventBase {
  timestamp: string;
  url: string;
}

export interface BugClickEvent extends BugEventBase {
  type: "click";
  data: { tagName: string; selector: string; text: string; x: number; y: number };
}

export interface BugInputEvent extends BugEventBase {
  type: "input";
  data: { tagName: string; inputType: string; selector: string; value: string; masked: boolean };
}

export interface BugNavigationEvent extends BugEventBase {
  type: "navigation";
  data: { kind: "initial" | "load" | "push" | "replace" | "pop" | "hash"; from: string; to: string };
}

export interface BugNetworkEvent extends BugEventBase {
  type: "network";
  data: {
    initiator: "fetch" | "xhr";
    method: string;
    url: string;
    status: number;
    duration: number;
    error?: string;
  };
}

export interface BugConsoleEvent extends BugEventBase {
  type: "console";
  data: { level: "log" | "info" | "warn" | "error" | "debug"; message: string };
}

export interface BugErrorEvent extends BugEventBase {
  type: "error";
  data: {
    kind: "error" | "unhandledrejection" | "resource";
    message: string;
    stack?: string;
    source?: string;
    line?: number;
    column?: number;
  };
}

export type BugEvent =
  | BugClickEvent
  | BugInputEvent
  | BugNavigationEvent
  | BugNetworkEvent
  | BugConsoleEvent
  | BugErrorEvent;

export type BugEventType = BugEvent["type"];

export interface BrowserInfo {
  name: string;
  version: string;
}

export interface ViewportInfo {
  width: number;
  height: number;
}

// GET /api/v1/sessions/{id}
export interface SessionResponse {
  id: string;
  projectId: string;
  startedAt: string;
  endedAt?: string | null;
  initialUrl: string;
  browser: BrowserInfo;
  viewport: ViewportInfo;
  events: BugEvent[];
  createdAt: string;
}

// One row of GET /api/v1/sessions
export interface SessionSummary {
  id: string;
  projectId: string;
  initialUrl: string;
  startedAt: string;
  endedAt?: string | null;
  browser: BrowserInfo;
  viewport: ViewportInfo;
  eventCount: number;
  errorCount: number;
  createdAt: string;
}

export interface PagedResponse<T> {
  items: T[];
  page: number;
  pageSize: number;
  totalCount: number;
}

export interface SessionListParams {
  page?: number;
  pageSize?: number;
  projectId?: string;
  hasErrors?: boolean;
  search?: string; // part of the URL, or a full session ID
  sort?: SessionSort;
}

export type SessionSort = "newest" | "oldest";
