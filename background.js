importScripts("env.js");

function uploadSession() {
  chrome.storage.local.get(["session", "events"], ({ session, events }) => {
    if (!session || !events || events.length === 0) {
      chrome.storage.local.set({ isUploading: false });
      return;
    }

    const body = {
      projectId: "test-project",
      startedAt: session.startedAt,
      endedAt: session.endedAt ?? new Date().toISOString(),
      initialUrl: session.initialUrl,
      browser: session.browser,
      viewport: session.viewport,
      events: events,
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

        const created = await res.json();
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
        });
      })
      .catch((err) => {
        console.error("Upload error:", err);
        // Keep session and events in storage so the upload can be retried
        chrome.storage.local.set({
          isUploading: false,
          uploadError: err.message,
        });
      });
  });
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  switch (message.type) {
    case "CLICK":
      chrome.storage.local.get(["isRecording", "events"], (result) => {
        if (!result.isRecording) {
          return;
        }

        const events = result.events ?? [];

        events.push({
          type: "click",
          timestamp: message.data.timestamp,
          url: message.data.url,
          data: {
            tagName: message.data.tagName,
            text: message.data.text,
          },
        });

        chrome.storage.local.set({ events });
        console.log("CLICK recorded:", events.length);
      });
      break;

    case "START_RECORDING":
      chrome.tabs.query({ active: true, currentWindow: true }).then(([tab]) => {
        chrome.storage.local.set({
          isRecording: true,
          isUploading: false,
          uploadError: null,
          events: [],
          session: {
            startedAt: new Date().toISOString(),
            initialUrl: tab?.url ?? "",
            browser: { name: "Chrome", version: "0" },
            viewport: { width: 0, height: 0 },
          },
        });
        console.log("Recording started");
      });
      break;

    case "STOP_RECORDING":
      chrome.storage.local.get(["session"], ({ session }) => {
        chrome.storage.local.set(
          {
            isRecording: false,
            isUploading: true,
            uploadError: null,
            session: session
              ? { ...session, endedAt: new Date().toISOString() }
              : session,
          },
          uploadSession,
        );
      });
      break;

    case "RETRY_UPLOAD":
      chrome.storage.local.set(
        { isUploading: true, uploadError: null },
        uploadSession,
      );
      break;

    case "DISCARD_SESSION":
      chrome.storage.local.set({
        isUploading: false,
        uploadError: null,
        events: [],
        session: null,
      });
      break;
  }
});
