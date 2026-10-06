// All BugLens colors live here (values from the buglens-design skill).
// Keys use antd token names, so antd reads them directly and SCSS can use
// them as CSS variables: colorPrimary → var(--ant-color-primary).

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
