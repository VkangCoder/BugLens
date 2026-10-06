// Generates mock/sessions.json: CreateSessionRequest bodies for POST /api/v1/sessions.
// Covers every event type and the edge cases the dashboard has to handle.
//
//   node mock/generate-sessions.mjs
//
// Output is deterministic (seeded random), so the file only changes when this script does.
import { writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

// ── Helpers ──
let seed = 42;
function random() {
  seed = (seed * 16807) % 2147483647;
  return (seed - 1) / 2147483646;
}
const pick = (list) => list[Math.floor(random() * list.length)];
const between = (min, max) => Math.round(min + random() * (max - min));

const DAY = 24 * 60 * 60 * 1000;
const NOW = Date.parse("2026-10-07T10:00:00.000Z");

const BROWSERS = [
  { name: "Google Chrome", version: "150" },
  { name: "Google Chrome", version: "149" },
  { name: "Microsoft Edge", version: "150" },
  { name: "Brave", version: "1.84" },
];
const VIEWPORTS = [
  { width: 1440, height: 900 },
  { width: 1920, height: 1080 },
  { width: 1366, height: 768 },
  { width: 1280, height: 720 },
  { width: 2560, height: 1440 },
];

// Builds one session. `steps` are [offsetMs, type, data, url?]
function session({ projectId = "acme-web", daysAgo, hour = 9, initialUrl, durationMs, endedAt, browser, viewport, steps }) {
  const start = NOW - daysAgo * DAY + (hour - 10) * 60 * 60 * 1000 + between(0, 50) * 60 * 1000;
  let currentUrl = initialUrl;
  const events = steps.map(([offset, type, data, url]) => {
    if (type === "navigation") currentUrl = data.to;
    return { type, timestamp: new Date(start + offset).toISOString(), url: url ?? currentUrl, data };
  });
  const lastOffset = steps.length ? steps[steps.length - 1][0] : 0;
  return {
    projectId,
    startedAt: new Date(start).toISOString(),
    endedAt: endedAt === null ? null : new Date(start + Math.max(durationMs ?? 0, lastOffset + 800)).toISOString(),
    initialUrl,
    browser: browser ?? pick(BROWSERS),
    viewport: viewport ?? pick(VIEWPORTS),
    events,
  };
}

// Event builders (shapes match src/types/buglens.d.ts)
const nav = (from, to, kind = "push") => ({ kind, from, to });
const initial = (to) => ({ kind: "initial", from: "", to });
const click = (selector, text, x = between(100, 1200), y = between(80, 800)) => ({
  tagName: selector.match(/^[a-z]+/)?.[0].toUpperCase() ?? "DIV",
  selector,
  text,
  x,
  y,
});
const input = (selector, value, inputType = "text") => ({
  tagName: inputType === "textarea" ? "TEXTAREA" : inputType.startsWith("select") ? "SELECT" : "INPUT",
  inputType,
  selector,
  value: inputType === "password" ? "[REDACTED]" : value,
  masked: inputType === "password",
});
const fetchReq = (method, url, status, duration, error) => ({
  initiator: "fetch",
  method,
  url,
  status,
  duration,
  ...(error ? { error } : {}),
});
const xhr = (method, url, status, duration, error) => ({ ...fetchReq(method, url, status, duration, error), initiator: "xhr" });
const log = (level, message) => ({ level, message });
const jsError = (message, stack, source, line, column) => ({ kind: "error", message, stack, source, line, column });
const rejection = (message, stack) => ({ kind: "unhandledrejection", message, stack });
const resource = (tag, source) => ({ kind: "resource", message: `Failed to load <${tag}>`, source });

const SHOP = "https://checkout.acme.io";
const APP = "https://app.acme.io";
const ADMIN = "https://admin.acme.io";

const sessions = [];

// 1. Checkout crashes after applying a coupon (the skill's reference bug)
sessions.push(
  session({
    daysAgo: 0,
    hour: 9,
    initialUrl: `${SHOP}/cart`,
    browser: BROWSERS[0],
    viewport: VIEWPORTS[0],
    durationMs: 16000,
    steps: [
      [0, "navigation", initial(`${SHOP}/cart`)],
      [1840, "click", click("button.qty-increase", "Quantity +1", 604, 312)],
      [3120, "click", click("input#coupon", "", 520, 340)],
      [4310, "input", input("input#coupon", "SPRING24")],
      [5200, "click", click("button.apply-coupon", "Apply", 712, 340)],
      [5460, "network", fetchReq("POST", `${SHOP}/api/v2/cart/coupon`, 200, 188)],
      [7020, "click", click("a.proceed", "Proceed to checkout", 820, 600)],
      [7110, "navigation", nav(`${SHOP}/cart`, `${SHOP}/checkout`)],
      [7400, "network", fetchReq("GET", `${SHOP}/api/v2/checkout/summary`, 200, 96)],
      [9480, "input", input("input#email", "ana@acme.io", "email")],
      [11200, "input", input("input#password", "hunter2", "password")],
      [12900, "input", input("select#country", "Germany", "select-one")],
      [14650, "click", click("button.checkout-pay", "Pay €48.00", 412, 688)],
      [14720, "console", log("warn", "discount.total is deprecated, use discount.amount")],
      [14760, "network", fetchReq("POST", `${SHOP}/api/v2/orders`, 500, 312)],
      [
        14780,
        "error",
        jsError(
          "TypeError: Cannot read properties of undefined (reading 'id')",
          "TypeError: Cannot read properties of undefined (reading 'id')\n    at applyDiscount (checkout.js:214:31)\n    at submitOrder (checkout.js:388:9)\n    at HTMLButtonElement.onClick (pay-button.js:42:5)",
          `${SHOP}/assets/checkout.js`,
          214,
          31,
        ),
      ],
      [14800, "console", log("error", "Order submit failed: 500 Internal Server Error")],
    ],
  }),
);

// 2. Login rejected: 401 + console error, password masked
sessions.push(
  session({
    daysAgo: 0,
    hour: 8,
    initialUrl: `${APP}/login`,
    browser: BROWSERS[2],
    viewport: VIEWPORTS[1],
    steps: [
      [0, "navigation", initial(`${APP}/login`)],
      [2100, "input", input("input#email", "jkim@acme.io", "email")],
      [4300, "input", input("input#password", "wrong-password", "password")],
      [4900, "input", input("input#remember", "true", "checkbox")],
      [5600, "click", click("button[data-testid=\"login-submit\"]", "Sign in")],
      [5650, "network", fetchReq("POST", `${APP}/api/auth/login`, 401, 142)],
      [5700, "console", log("error", "Login failed: invalid credentials")],
      [9800, "input", input("input#password", "correct-password", "password")],
      [10400, "click", click("button[data-testid=\"login-submit\"]", "Sign in")],
      [10460, "network", fetchReq("POST", `${APP}/api/auth/login`, 200, 211)],
      [10700, "navigation", nav(`${APP}/login`, `${APP}/dashboard`, "replace")],
      [10900, "network", fetchReq("GET", `${APP}/api/me`, 200, 64)],
    ],
  }),
);

// 3. Search results flicker: many requests racing, no JS error (staging)
{
  const steps = [[0, "navigation", initial(`${APP}/search`)]];
  let t = 800;
  const query = "invoice 2026";
  for (let i = 1; i <= query.length; i++) {
    steps.push([t, "input", input("input#search", query.slice(0, i), "search")]);
    steps.push([t + 30, "network", fetchReq("GET", `${APP}/api/search?q=${encodeURIComponent(query.slice(0, i))}`, 200, between(120, 900))]);
    t += between(110, 260);
  }
  for (const filter of ["status-paid", "status-overdue", "year-2026", "status-paid"]) {
    t += between(900, 1600);
    steps.push([t, "click", click(`label.filter-${filter}`, filter.replace("-", ": "))]);
    steps.push([t + 20, "network", fetchReq("GET", `${APP}/api/search?q=invoice&filter=${filter}`, 200, between(200, 1400))]);
    steps.push([t + 40, "navigation", nav(`${APP}/search`, `${APP}/search?q=invoice&filter=${filter}`, "replace")]);
  }
  steps.push([t + 1800, "console", log("warn", "Warning: Each child in a list should have a unique \"key\" prop.")]);
  sessions.push(session({ projectId: "acme-web", daysAgo: 0, hour: 7, initialUrl: `${APP}/search`, steps }));
}

// 4. Upload stuck at 99%: slow XHR, then unhandled promise rejection
sessions.push(
  session({
    daysAgo: 1,
    hour: 15,
    initialUrl: `${APP}/files`,
    browser: BROWSERS[1],
    viewport: VIEWPORTS[2],
    steps: [
      [0, "navigation", initial(`${APP}/files`)],
      [3200, "click", click("button.upload", "Upload files")],
      [5100, "input", input("input#file-picker", "C:\\fakepath\\q3-report.pdf", "file")],
      [5300, "network", xhr("POST", `${APP}/api/files/upload-url`, 200, 180)],
      [62400, "network", xhr("PUT", "https://storage.acme.io/uploads/q3-report.pdf", 0, 57000, "Request failed")],
      [
        62450,
        "error",
        rejection(
          "Error: Upload timed out after 57000 ms",
          "Error: Upload timed out after 57000 ms\n    at XMLHttpRequest.onTimeout (uploader.js:88:15)\n    at finishUpload (uploader.js:140:7)",
        ),
      ],
      [62500, "console", log("error", "Upload failed for q3-report.pdf")],
      [70100, "click", click("button.retry", "Retry")],
    ],
  }),
);

// 5. Broken images and a missing script chunk (resource errors) + hash navigation
sessions.push(
  session({
    daysAgo: 1,
    hour: 11,
    initialUrl: `${SHOP}/products`,
    steps: [
      [0, "navigation", initial(`${SHOP}/products`)],
      [400, "error", resource("img", `${SHOP}/cdn/products/sku-1182.webp`)],
      [420, "error", resource("img", `${SHOP}/cdn/products/sku-1190.webp`)],
      [2600, "click", click("a.tab-reviews", "Reviews")],
      [2610, "navigation", nav(`${SHOP}/products`, `${SHOP}/products#reviews`, "hash")],
      [4100, "click", click("button.load-more", "Load more")],
      [4150, "error", resource("script", `${SHOP}/assets/chunk-reviews.8f1c2.js`)],
      [
        4160,
        "error",
        rejection(
          "ChunkLoadError: Loading chunk 412 failed.",
          "ChunkLoadError: Loading chunk 412 failed.\n(error: https://checkout.acme.io/assets/chunk-reviews.8f1c2.js)\n    at __webpack_require__.f.j (runtime.js:1:2870)",
        ),
      ],
    ],
  }),
);

// 6. Onboarding loops back to step 1 (SPA push / replace / back)
sessions.push(
  session({
    daysAgo: 2,
    hour: 10,
    initialUrl: `${APP}/onboarding/1`,
    steps: [
      [0, "navigation", initial(`${APP}/onboarding/1`)],
      [2200, "input", input("input#company", "Rossi & Co.")],
      [3300, "click", click("button.next", "Continue")],
      [3350, "navigation", nav(`${APP}/onboarding/1`, `${APP}/onboarding/2`)],
      [6100, "input", input("select#team-size", "11-50", "select-one")],
      [7000, "click", click("button.next", "Continue")],
      [7050, "navigation", nav(`${APP}/onboarding/2`, `${APP}/onboarding/3`)],
      [7300, "network", fetchReq("PATCH", `${APP}/api/onboarding`, 409, 233)],
      [7350, "console", log("warn", "Onboarding state conflict, resetting to step 1")],
      [7400, "navigation", nav(`${APP}/onboarding/3`, `${APP}/onboarding/1`, "replace")],
      [9800, "click", click("button.back", "Back")],
      [9810, "navigation", nav(`${APP}/onboarding/1`, `${APP}/onboarding/3`, "pop")],
      [9900, "navigation", nav(`${APP}/onboarding/3`, `${APP}/onboarding/1`, "replace")],
    ],
  }),
);

// 7. Settings form: every input kind (text, textarea, select, checkbox, radio, number, date)
sessions.push(
  session({
    projectId: "acme-admin",
    daysAgo: 2,
    hour: 14,
    initialUrl: `${ADMIN}/settings/profile`,
    steps: [
      [0, "navigation", initial(`${ADMIN}/settings/profile`)],
      [1500, "input", input("input#display-name", "Ana Lima")],
      [3200, "input", input("textarea#bio", "QA lead. Testing the new release.", "textarea")],
      [4800, "input", input("select#timezone", "Europe/Berlin", "select-one")],
      [5600, "input", input("input#notify-email", "true", "checkbox")],
      [6100, "input", input("input#plan-team", "true", "radio")],
      [7400, "input", input("input#seats", "12", "number")],
      [8800, "input", input("input#renewal", "2027-01-01", "date")],
      [9900, "click", click("button[type=\"submit\"]", "Save changes")],
      [9950, "network", fetchReq("PUT", `${ADMIN}/api/settings/profile`, 422, 154)],
      [10000, "console", log("error", "Validation failed: seats must be <= 10 on the Team plan")],
    ],
  }),
);

// 8. Offline / CORS: requests fail before any response (status 0)
sessions.push(
  session({
    daysAgo: 3,
    hour: 16,
    initialUrl: `${APP}/reports`,
    browser: BROWSERS[3],
    steps: [
      [0, "navigation", initial(`${APP}/reports`)],
      [1200, "network", fetchReq("GET", "https://analytics.partner.io/api/v1/reports", 0, 31, "TypeError: Failed to fetch")],
      [1250, "console", log("error", "Access to fetch at 'https://analytics.partner.io/api/v1/reports' has been blocked by CORS policy")],
      [5000, "click", click("button.refresh", "Refresh")],
      [5040, "network", fetchReq("GET", `${APP}/api/reports`, 0, 12, "TypeError: NetworkError when attempting to fetch resource.")],
      [5100, "error", rejection("TypeError: Failed to fetch", "TypeError: Failed to fetch\n    at loadReports (reports.js:22:11)")],
    ],
  }),
);

// 9. Still recording (endedAt null): the extension was closed mid-session
sessions.push(
  session({
    daysAgo: 0,
    hour: 10,
    initialUrl: `${APP}/dashboard`,
    endedAt: null,
    steps: [
      [0, "navigation", initial(`${APP}/dashboard`)],
      [2400, "click", click("a.nav-settings", "Settings")],
      [2450, "navigation", nav(`${APP}/dashboard`, `${APP}/settings`)],
    ],
  }),
);

// 10. Empty session: recording started and stopped immediately
sessions.push(
  session({ projectId: "other-project", daysAgo: 4, hour: 12, initialUrl: "https://example.com/about", durationMs: 3000, steps: [] }),
);

// 11. Long session (~300 events) to test the timeline and the event list
{
  const steps = [[0, "navigation", initial(`${APP}/kanban`)]];
  let t = 500;
  for (let i = 0; i < 300; i++) {
    t += between(150, 1400);
    const roll = random();
    if (roll < 0.45) steps.push([t, "click", click(`div.card[data-id="${between(1, 80)}"]`, `Card ${between(1, 80)}`)]);
    else if (roll < 0.65) steps.push([t, "network", fetchReq(pick(["GET", "PATCH"]), `${APP}/api/cards/${between(1, 80)}`, pick([200, 200, 200, 204, 404]), between(40, 600))]);
    else if (roll < 0.8) steps.push([t, "input", input(`input.card-title-${between(1, 80)}`, `Task ${between(100, 999)}`)]);
    else if (roll < 0.92) steps.push([t, "console", log(pick(["warn", "error", "warn"]), pick(["Drag preview not found", "Slow render: 48ms", "Card 41 not in column"]))]);
    else steps.push([t, "navigation", nav(`${APP}/kanban`, `${APP}/kanban?board=${between(1, 5)}`, "replace")]);
  }
  steps.push([t + 300, "error", jsError("RangeError: Maximum call stack size exceeded", "RangeError: Maximum call stack size exceeded\n    at reorder (board.js:301:12)\n    at reorder (board.js:305:14)", `${APP}/assets/board.js`, 301, 12)]);
  sessions.push(session({ daysAgo: 1, hour: 9, initialUrl: `${APP}/kanban`, steps }));
}

// 12–41. Filler sessions spread over 10 days, so the list has more than one page
const PAGES = ["/dashboard", "/invoices", "/invoices/new", "/customers", "/settings/billing", "/reports", "/help"];
for (let i = 0; i < 30; i++) {
  const page = pick(PAGES);
  const base = i % 4 === 0 ? ADMIN : APP;
  const url = `${base}${page}`;
  const steps = [[0, "navigation", initial(url)]];
  let t = 0;
  const count = between(3, 25);
  for (let j = 0; j < count; j++) {
    t += between(400, 4000);
    const roll = random();
    if (roll < 0.5) steps.push([t, "click", click(pick(["button.primary", "a.nav-link", "button.secondary", "td.row"]), pick(["Save", "Next", "Open", "Cancel", "Details"]))]);
    else if (roll < 0.75) steps.push([t, "network", fetchReq("GET", `${base}/api${page}`, pick([200, 200, 200, 304, 404]), between(30, 700))]);
    else if (roll < 0.9) steps.push([t, "input", input(pick(["input#name", "input#amount", "input#search"]), pick(["Acme GmbH", "1200", "q3"]))]);
    else steps.push([t, "console", log("warn", "Deprecated API: /v1 will be removed in December")]);
  }
  // About 1 in 5 filler sessions ends with a JS error
  if (random() < 0.2) {
    steps.push([t + 200, "error", jsError("TypeError: Cannot read properties of null (reading 'length')", "TypeError: Cannot read properties of null (reading 'length')\n    at renderTable (table.js:57:21)", `${base}/assets/table.js`, 57, 21)]);
  }
  sessions.push(
    session({
      projectId: i % 4 === 0 ? "acme-admin" : "acme-web",
      daysAgo: between(0, 10),
      hour: between(7, 18),
      initialUrl: url,
      steps,
    }),
  );
}

const out = resolve(dirname(fileURLToPath(import.meta.url)), "sessions.json");
writeFileSync(out, JSON.stringify(sessions, null, 2) + "\n");

const eventCount = sessions.reduce((n, s) => n + s.events.length, 0);
const withErrors = sessions.filter((s) => s.events.some((e) => e.type === "error")).length;
console.log(`Wrote ${sessions.length} sessions (${eventCount} events, ${withErrors} with errors) to ${out}`);
