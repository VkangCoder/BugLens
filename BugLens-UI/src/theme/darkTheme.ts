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
    // Control heights from the skill: sm 26 / md 32 / lg 38
    controlHeightSM: 26,
    controlHeight: 32,
    controlHeightLG: 38,
  },
  components: {
    Layout: {
      headerBg: darkColors.colorBgLayout,
      siderBg: darkColors.colorBgLayout,
      headerHeight: 48,
      headerPadding: "0 20px",
    },
    // Selected nav item: neutral surface, not the accent (buglens-design)
    Menu: {
      itemSelectedBg: darkColors.colorBorderSecondary,
      itemSelectedColor: darkColors.colorText,
      itemHoverBg: darkColors.colorFillTertiary,
      collapsedWidth: 40, // 56px collapsed sidebar minus 8px padding each side
    },
    // Focus: accent border + 3px accent-subtle halo
    Input: {
      paddingInlineSM: 9,
      activeShadow: "0 0 0 3px color-mix(in srgb, var(--ant-color-primary) 15%, transparent)",
    },
    Select: {
      activeOutlineColor: "color-mix(in srgb, var(--ant-color-primary) 15%, transparent)",
    },
    // Track on surface-2, selected item on surface-1 (border + ring added in SCSS)
    Segmented: {
      trackBg: darkColors.colorFillTertiary,
      trackPadding: 2,
      itemColor: darkColors.colorTextSecondary,
      itemHoverColor: darkColors.colorText,
      itemHoverBg: "transparent",
      itemSelectedBg: darkColors.colorBgContainer,
      itemSelectedColor: darkColors.colorText,
    },
  },
};
