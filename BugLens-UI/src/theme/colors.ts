export const lightColors = {
  colorPrimary: "#218775",
  colorSuccess: "#4d7c2a",
  colorWarning: "#b7791f",
  colorError: "#c8382b",
  colorInfo: "#3466b5",

  colorBgLayout: "#f5f4f1", // page background
  colorBgContainer: "#fbfaf8", // cards, tables, inputs
  colorBgElevated: "#fbfaf8", // dropdowns, modals
  colorFillTertiary: "#eceae6", // hover rows

  colorText: "#1c1b19",
  colorTextSecondary: "#5e5a54",
  colorTextTertiary: "#7c776f",

  colorBorder: "#c6c2ba", // inputs
  colorBorderSecondary: "#dedbd5", // cards, dividers
};

export const darkColors = {
  colorPrimary: "#6fc2af",
  colorSuccess: "#8dbf5e",
  colorWarning: "#e9a93b",
  colorError: "#f0705f",
  colorInfo: "#7ea6e8",

  colorBgLayout: "#141312",
  colorBgContainer: "#1c1b19",
  colorBgElevated: "#252321",
  colorFillTertiary: "#252321",

  colorText: "#eceae6",
  colorTextSecondary: "#a19c93",
  colorTextTertiary: "#7c776f",

  colorBorder: "#45423e",
  colorBorderSecondary: "#2f2d2a",
};

// BugLens-only colors antd has no token for (event types, JSON payloads).
// ThemeProvider sets them as CSS variables: var(--event-click), var(--code-key), ...
export const lightBrandColors = {
  "--event-click": "#218775",
  "--event-input": "#3466b5",
  "--event-navigation": "#9a7432",
  "--event-network": "#7c776f",
  "--event-console": "#8e4f7a",
  "--event-error": "#c8382b",
  "--masked": "#a19c93",
  "--code-bg": "#eceae6",
  "--code-fg": "#2f2d2a",
  "--code-key": "#13594e",
  "--code-string": "#9a7432",
  "--code-number": "#284f8e",
  "--code-null": "#7c776f",
};

export const darkBrandColors: typeof lightBrandColors = {
  "--event-click": "#6fc2af",
  "--event-input": "#7ea6e8",
  "--event-navigation": "#d3ae68",
  "--event-network": "#a19c93",
  "--event-console": "#cc8db8",
  "--event-error": "#f0705f",
  "--masked": "#5e5a54",
  "--code-bg": "#141312",
  "--code-fg": "#dedbd5",
  "--code-key": "#6fc2af",
  "--code-string": "#d3ae68",
  "--code-number": "#7ea6e8",
  "--code-null": "#7c776f",
};
