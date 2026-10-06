// What the extension records. Applied in background.ts before an event is stored.
export const captureConfig = {
  projectId: "test-project",

  // Stop storing new events after this many (keeps chrome.storage small)
  maxEvents: 2000,

  // Turn a whole event type on or off
  events: {
    click: true,
    input: true,
    navigation: true,
    network: true,
    console: true,
    error: true,
  } satisfies Record<BugEventType, boolean>,

  input: {
    // Passwords are always masked in content.ts. Set true to mask every input value.
    maskAllValues: false,
  },

  console: {
    // Levels to keep. "log" / "info" / "debug" are usually noise.
    levels: ["warn", "error"] as ConsoleLevel[],
  },

  network: {
    // true = only keep failed requests (status 0 or >= 400)
    onlyFailed: false,
    // Requests whose URL contains one of these strings are ignored
    ignoreUrls: ["/sockjs-node", "/__vite", "hot-update"],
  },
};
