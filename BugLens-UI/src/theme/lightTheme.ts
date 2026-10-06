import { theme, type ThemeConfig } from "antd";
import { lightColors } from "@/theme/colors";

export const lightTheme: ThemeConfig = {
  algorithm: theme.defaultAlgorithm,
  token: {
    ...lightColors,
    fontFamily: "'Onest', system-ui, sans-serif",
    fontFamilyCode: "'IBM Plex Mono', ui-monospace, monospace",
    fontSize: 13,
    borderRadius: 6,
  },
  components: {
    Layout: {
      headerBg: lightColors.colorBgLayout,
      siderBg: lightColors.colorBgLayout,
      headerHeight: 48,
      headerPadding: "0 20px",
    },
  },
};
