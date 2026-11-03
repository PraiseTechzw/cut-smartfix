import type { TextStyle } from "react-native";

export const colors = {
  primary: "#0055D4",
  primaryDark: "#003F9E",
  primaryMid: "#2D74E8",
  primarySoft: "#EAF2FF",
  accent: "#FBB401",
  accentAccessible: "#8A5A00",
  success: "#15803D",
  successSoft: "#DCFCE7",
  warning: "#D97706",
  danger: "#DC2626",
  dangerSoft: "#FEE2E2",
  info: "#2563EB",
  background: "#F4F7FB",
  surface: "#FFFFFF",
  surfaceMuted: "#F8FAFF",
  border: "#DCE4EF",
  label: "#17233B",
  secondaryLabel: "#536174",
  tertiaryLabel: "#7B879A",
  white: "#FFFFFF",
  black: "#000000",
  onTint: "#FFFFFF",
} as const;

export const statusColors = {
  pending: { background: "#FFF3CD", foreground: "#856404" },
  active: { background: "#DBEAFE", foreground: "#1E40AF" },
  info: { background: "#CCE5FF", foreground: "#004085" },
  highPriority: { background: "#FFE5D0", foreground: "#943C00" },
  success: { background: colors.successSoft, foreground: colors.success },
  danger: { background: colors.dangerSoft, foreground: "#991B1B" },
  neutral: { background: "#F3F4F6", foreground: "#374151" },
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
  row: 12,
  inset: 20,
} as const;

export const type = {
  largeTitle: { fontSize: 32, fontWeight: "700", color: colors.label },
  title: { fontSize: 24, fontWeight: "700", color: colors.label },
  headline: { fontSize: 18, fontWeight: "600", color: colors.label },
  body: { fontSize: 16, fontWeight: "400", color: colors.label },
  subhead: { fontSize: 14, fontWeight: "400", color: colors.secondaryLabel },
  caption: { fontSize: 12, fontWeight: "400", color: colors.secondaryLabel },
} as const satisfies Record<string, TextStyle>;

export const typeScale = {
  micro: 6,
  tiny: 10,
  overline: 11,
  caption: 12,
  footnote: 13,
  subhead: 14,
  callout: 15,
  body: 16,
  bodyLarge: 17,
  headline: 18,
  title3: 20,
  title2: 22,
  title: 24,
  displaySmall: 26,
  display: 28,
  banner: 30,
  displayLarge: 32,
  heroSmall: 36,
  hero: 40,
  heroLarge: 44,
  heroXL: 48,
  billboard: 64,
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  full: 9999,
} as const;

export const motion = {
  fast: 150,
  base: 250,
  slow: 400,
} as const;

export const BRAND_BLUE = colors.primary;
export const BRAND_BLUE_DARK = colors.primaryDark;
export const BRAND_BLUE_MID = colors.primaryMid;
export const BRAND_BLUE_LIGHT = colors.primarySoft;
export const BRAND_GOLD = colors.accent;
export const BRAND_GOLD_DARK = colors.accentAccessible;
export const SUCCESS_GREEN = colors.success;
export const SUCCESS_GREEN_LIGHT = colors.successSoft;
export const BRAND_BACKGROUND = colors.background;
export const BRAND_BORDER = colors.border;
export const BRAND_TEXT = colors.label;
export const BRAND_MUTED = colors.secondaryLabel;
export const BRAND_HINT = colors.tertiaryLabel;
export const BRAND_SURFACE_MUTED = colors.surfaceMuted;
export const DANGER_RED = colors.danger;
