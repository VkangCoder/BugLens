export const captureConfig = {
  maxEvents: 2000,

  events: {
    click: true,
    input: true,
    navigation: true,
    network: true,
    console: true,
    error: true,
  } satisfies Record<BugEventType, boolean>,

  input: {
    maskAllValues: false,
  },

  console: {
    levels: ["warn", "error"] as ConsoleLevel[],
  },

  network: {
    onlyFailed: false,
    ignoreUrls: ["/sockjs-node", "/__vite", "hot-update"],
  },
};
