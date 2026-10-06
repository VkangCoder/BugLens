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
    // Control heights from the skill: sm 26 / md 32 / lg 38
    controlHeightSM: 26,
    controlHeight: 32,
    controlHeightLG: 38,
  },
  components: {
    Layout: {
      headerBg: lightColors.colorBgLayout,
      siderBg: lightColors.colorBgLayout,
      headerHeight: 48,
      headerPadding: "0 20px",
    },
    // Selected nav item: neutral surface, not the accent (buglens-design)
    Menu: {
      itemSelectedBg: lightColors.colorBorderSecondary,
      itemSelectedColor: lightColors.colorText,
      itemHoverBg: lightColors.colorFillTertiary,
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
      trackBg: lightColors.colorFillTertiary,
      trackPadding: 2,
      itemColor: lightColors.colorTextSecondary,
      itemHoverColor: lightColors.colorText,
      itemHoverBg: "transparent",
      itemSelectedBg: lightColors.colorBgContainer,
      itemSelectedColor: lightColors.colorText,
    },
  },
};
