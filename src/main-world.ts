(() => {
  const MAX_TEXT = 500;

  function post(event: BridgeMessage["event"]): void {
    window.postMessage(
      { source: "buglens-main-world", event } satisfies BridgeMessage,
      "*",
    );
  }

  function now(): string {
    return new Date().toISOString();
  }

  function truncate(text: string): string {
    return text.length > MAX_TEXT ? `${text.slice(0, MAX_TEXT)}…` : text;
  }

  function stringify(value: unknown): string {
    if (typeof value === "string") return value;
    if (value instanceof Error) return `${value.name}: ${value.message}`;
    try {
      return JSON.stringify(value) ?? String(value);
    } catch {
      return String(value);
    }
  }

  function absoluteUrl(url: string | URL): string {
    try {
      return new URL(url, location.href).href;
    } catch {
      return String(url);
    }
  }

  // ── Navigation: SPA route changes, back/forward, hash ──
  let lastUrl = location.href;

  function navigated(kind: BugNavigationEvent["data"]["kind"]): void {
    const to = location.href;
    if (to === lastUrl) return;
    post({
      type: "navigation",
      timestamp: now(),
      url: to,
      data: { kind, from: lastUrl, to },
    });
    lastUrl = to;
  }

  const pushState = history.pushState;
  history.pushState = function (...args: Parameters<History["pushState"]>) {
    pushState.apply(this, args);
    navigated("push");
  };

  const replaceState = history.replaceState;
  history.replaceState = function (
    ...args: Parameters<History["replaceState"]>
  ) {
    replaceState.apply(this, args);
    navigated("replace");
  };

  window.addEventListener("popstate", () => navigated("pop"));
  window.addEventListener("hashchange", () => navigated("hash"));

  // ── Network: fetch ──
  const originalFetch = window.fetch;
  window.fetch = async function (input: RequestInfo | URL, init?: RequestInit) {
    const method = (
      init?.method ?? (input instanceof Request ? input.method : "GET")
    ).toUpperCase();
    const url = absoluteUrl(input instanceof Request ? input.url : input);
    const started = performance.now();

    try {
      const response = await originalFetch.call(this, input, init);
      post({
        type: "network",
        timestamp: now(),
        url: location.href,
        data: {
          initiator: "fetch",
          method,
          url,
          status: response.status,
          duration: Math.round(performance.now() - started),
        },
      });
      return response;
    } catch (err) {
      post({
        type: "network",
        timestamp: now(),
        url: location.href,
        data: {
          initiator: "fetch",
          method,
          url,
          status: 0,
          duration: Math.round(performance.now() - started),
          error: stringify(err),
        },
      });
      throw err;
    }
  };

  // ── Network: XMLHttpRequest ──
  const xhrInfo = new WeakMap<
    XMLHttpRequest,
    { method: string; url: string; started: number }
  >();

  const originalOpen = XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.open = function (
    this: XMLHttpRequest,
    method: string,
    url: string | URL,
    ...rest: unknown[]
  ) {
    xhrInfo.set(this, {
      method: method.toUpperCase(),
      url: absoluteUrl(url),
      started: 0,
    });
    return (originalOpen as (...args: unknown[]) => void).call(
      this,
      method,
      url,
      ...rest,
    );
  } as XMLHttpRequest["open"];

  const originalSend = XMLHttpRequest.prototype.send;
  XMLHttpRequest.prototype.send = function (
    this: XMLHttpRequest,
    body?: Parameters<XMLHttpRequest["send"]>[0],
  ) {
    const info = xhrInfo.get(this);
    if (info) {
      info.started = performance.now();
      this.addEventListener("loadend", () => {
        post({
          type: "network",
          timestamp: now(),
          url: location.href,
          data: {
            initiator: "xhr",
            method: info.method,
            url: info.url,
            status: this.status,
            duration: Math.round(performance.now() - info.started),
            ...(this.status === 0 ? { error: "Request failed" } : {}),
          },
        });
      });
    }
    return originalSend.call(this, body);
  };

  // ── Console ──
  const levels: ConsoleLevel[] = ["log", "info", "warn", "error", "debug"];
  for (const level of levels) {
    const original = console[level];
    console[level] = (...args: unknown[]) => {
      post({
        type: "console",
        timestamp: now(),
        url: location.href,
        data: { level, message: truncate(args.map(stringify).join(" ")) },
      });
      original.apply(console, args);
    };
  }

  // ── Errors: uncaught JS errors and failed resources (img, script, link) ──
  window.addEventListener(
    "error",
    (event: Event) => {
      if (event instanceof ErrorEvent) {
        post({
          type: "error",
          timestamp: now(),
          url: location.href,
          data: {
            kind: "error",
            message: truncate(
              event.error instanceof Error
                ? `${event.error.name}: ${event.error.message}`
                : event.message,
            ),
            stack:
              event.error instanceof Error
                ? truncate(event.error.stack ?? "")
                : undefined,
            source: event.filename,
            line: event.lineno,
            column: event.colno,
          },
        });
        return;
      }

      const target = event.target;
      if (
        target instanceof HTMLElement &&
        target !== document.documentElement
      ) {
        const source =
          (target as HTMLImageElement).src ||
          (target as HTMLLinkElement).href ||
          "";
        post({
          type: "error",
          timestamp: now(),
          url: location.href,
          data: {
            kind: "resource",
            message: `Failed to load <${target.tagName.toLowerCase()}>`,
            source,
          },
        });
      }
    },
    true, // capture phase: resource errors do not bubble
  );

  // ── Errors: promise rejected without .catch() ──
  window.addEventListener("unhandledrejection", (event) => {
    const reason: unknown = event.reason;
    post({
      type: "error",
      timestamp: now(),
      url: location.href,
      data: {
        kind: "unhandledrejection",
        message: truncate(stringify(reason)),
        stack:
          reason instanceof Error ? truncate(reason.stack ?? "") : undefined,
      },
    });
  });
})();
