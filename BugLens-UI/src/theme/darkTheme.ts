import { theme, type ThemeConfig } from "antd";
import { darkColors } from "@/theme/colors";

export const darkTheme: ThemeConfig = {
  algorithm: theme.darkAlgorithm,
  token: {
    ...darkColors,
    fontFamily: "'Onest', system-ui, sans-serif",
    fontFamilyCode: "'IBM Plex Mono', ui-monospace, monospace",
    fontSize: 13,
    borderRadius: 6,
  },
  components: {
    Layout: {
      headerBg: darkColors.colorBgLayout,
      siderBg: darkColors.colorBgLayout,
      headerHeight: 48,
      headerPadding: "0 20px",
    },
  },
};
