// Runs in the extension's isolated world: sees the DOM, not the page's JS.
// Captures clicks and inputs here, and forwards navigation / network / console /
// error events coming from main-world.ts. Nothing is sent unless recording.
(() => {
  const MAX_TEXT = 100;
  const MAX_VALUE = 200;

  let isRecording = false;

  chrome.storage.local.get("isRecording", (raw) => {
    isRecording = Boolean((raw as StorageShape).isRecording);
    // Page (re)loaded while recording: mark it on the timeline
    if (isRecording) {
      send({
        type: "navigation",
        timestamp: new Date().toISOString(),
        url: location.href,
        data: { kind: "load", from: document.referrer, to: location.href },
      });
    }
  });

  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName === "local" && changes.isRecording) {
      isRecording = Boolean(changes.isRecording.newValue);
    }
  });

  function send(event: BugEvent): void {
    // After the extension is reloaded, this old script loses access to chrome.runtime
    if (!chrome.runtime?.id) {
      stop();
      return;
    }
    if (!isRecording) return;

    try {
      chrome.runtime.sendMessage({ type: "EVENT", event } satisfies RuntimeMessage);
    } catch {
      // "Extension context invalidated" - the page needs a reload
      stop();
    }
  }

  // Short, readable CSS selector: #id, [data-testid], or tag.class1.class2
  function selectorOf(el: Element): string {
    const tag = el.tagName.toLowerCase();
    if (el.id) return `${tag}#${CSS.escape(el.id)}`;

    const testId = el.getAttribute("data-testid");
    if (testId) return `${tag}[data-testid="${testId}"]`;

    const classes = Array.from(el.classList).slice(0, 2).map((c) => `.${CSS.escape(c)}`).join("");
    return tag + classes;
  }

  function textOf(el: Element): string {
    const text = el instanceof HTMLElement ? el.innerText : (el.textContent ?? "");
    return text.trim().replace(/\s+/g, " ").slice(0, MAX_TEXT);
  }

  // ── Click ──
  function handleClick(event: MouseEvent): void {
    if (!(event.target instanceof Element)) return;

    // Prefer the interactive element the user meant (button, link...) over an inner <span>/<svg>
    const el =
      event.target.closest("button, a, input, select, textarea, label, [role='button'], [onclick]") ??
      event.target;

    send({
      type: "click",
      timestamp: new Date().toISOString(),
      url: location.href,
      data: {
        tagName: el.tagName,
        selector: selectorOf(el),
        text: el.getAttribute("aria-label") ?? textOf(el),
        x: Math.round(event.clientX),
        y: Math.round(event.clientY),
      },
    });
  }

  // ── Input (fires once when the value is committed, not on every keystroke) ──
  function handleChange(event: Event): void {
    const el = event.target;
    if (
      !(el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement || el instanceof HTMLSelectElement)
    ) {
      return;
    }

    const inputType = el instanceof HTMLInputElement ? el.type : el instanceof HTMLSelectElement ? el.type : "textarea";

    let value: string;
    if (el instanceof HTMLInputElement && (el.type === "checkbox" || el.type === "radio")) {
      value = String(el.checked);
    } else if (el instanceof HTMLSelectElement) {
      value = Array.from(el.selectedOptions).map((o) => o.text).join(", ");
    } else {
      value = el.value;
    }

    // Passwords never leave the page
    const masked = inputType === "password";

    send({
      type: "input",
      timestamp: new Date().toISOString(),
      url: location.href,
      data: {
        tagName: el.tagName,
        inputType,
        selector: selectorOf(el),
        value: masked ? "[REDACTED]" : value.slice(0, MAX_VALUE),
        masked,
      },
    });
  }

  // ── Events from main-world.ts ──
  function handleBridge(event: MessageEvent): void {
    if (event.source !== window) return;
    const message = event.data as BridgeMessage | undefined;
    if (message?.source !== "buglens-main-world") return;
    send(message.event);
  }

  function stop(): void {
    document.removeEventListener("click", handleClick, true);
    document.removeEventListener("change", handleChange, true);
    window.removeEventListener("message", handleBridge);
  }

  document.addEventListener("click", handleClick, true);
  document.addEventListener("change", handleChange, true);
  window.addEventListener("message", handleBridge);
})();
