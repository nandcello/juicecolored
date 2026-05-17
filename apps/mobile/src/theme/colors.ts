import type { ColorSchemeName } from "react-native";

const APP_COLORS = {
  light: {
    background: "#f7f2ea",
    field: "#ffffff",
    label: "#78716c",
    text: "#1c1917",
    mutedText: "#57534e",
    placeholder: "#a8a29e",
    disabledButton: "#e7e5e4",
    accent: "#d97706",
    onAccent: "#ffffff",
  },
  dark: {
    background: "#11100f",
    field: "#26211d",
    label: "#a8a29e",
    text: "#fafaf9",
    mutedText: "#d6d3d1",
    placeholder: "#78716c",
    disabledButton: "#292524",
    accent: "#d97706",
    onAccent: "#ffffff",
  },
} as const;

export type AppColorScheme = keyof typeof APP_COLORS;
export type AppColors = (typeof APP_COLORS)[AppColorScheme];

export function getAppColors(colorScheme: ColorSchemeName): AppColors {
  return APP_COLORS[colorScheme === "dark" ? "dark" : "light"];
}
