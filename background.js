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
      chrome.storage.local.get(["session", "events"], (result) => {
        const { session, events } = result;

        if (!events || events.length === 0) {
          chrome.storage.local.set({ isRecording: false });
          return;
        }

        const body = {
          projectId: "test-project",
          startedAt: session.startedAt,
          endedAt: new Date().toISOString(),
          initialUrl: session.initialUrl,
          browser: session.browser,
          viewport: session.viewport,
          events: events,
        };

        fetch("http://localhost:5084/api/v1/sessions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        })
          .then((res) => {
            if (!res.ok) {
              console.error("Upload failed:", res.status);
              return;
            }
            console.log("Session uploaded");
            chrome.storage.local.set({ isRecording: false });
          })
          .catch((err) => console.error("Upload error:", err));
      });
      break;
  }
});
