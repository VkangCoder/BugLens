export interface BugEventBase {
  timestamp: string;
  url: string;
}

export interface ClickEvent extends BugEventBase {
  type: "click";
  data: {
    tagName: string;
    text: string;
  };
}
export interface NetworkEvent extends BugEventBase {
  type: "network";
  data: { method: string; url: string; status: number; duration: number };
}
export type BugEvent = ClickEvent | NetworkEvent;

export interface BrowserInfo {
  name: string;
  version: string;
}

export interface ViewportInfo {
  width: number;
  height: number;
}

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
