// Tokens de la identidad visual de Plann.
// Fuente: PLANN-IDENTIDAD-VISUAL.md — no inventar valores nuevos aquí, traducirlos.

export const color = {
  pink: "#E9417F",
  ink: "#151510",
  cream: "#FDF7EF",

  bg: "#0B0B0A",
  bgCanvas: "#14141A",

  text: "#FDF7EF",
  text2: "rgba(253,247,239,0.74)",
  text3: "rgba(253,247,239,0.56)",
  text4: "rgba(253,247,239,0.46)",
  iconOff: "rgba(253,247,239,0.42)",

  white: "#FFFFFF",
};

export const glass = {
  card: {
    background: "rgba(255,255,255,0.055)",
    border: "rgba(255,255,255,0.10)",
  },
  field: {
    background: "rgba(255,255,255,0.09)",
    border: "rgba(255,255,255,0.12)",
  },
  panel: {
    background: "rgba(255,255,255,0.07)",
    border: "rgba(255,255,255,0.125)",
  },
  bar: {
    background: "rgba(255,255,255,0.05)",
    border: "rgba(255,255,255,0.10)",
  },
  circleButton: {
    background: "rgba(255,255,255,0.14)",
    border: "rgba(255,255,255,0.18)",
  },
};

export const glow = {
  buttonShadow: {
    shadowColor: color.pink,
    shadowOpacity: 0.42,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 0 },
  },
  chipShadow: {
    shadowColor: color.pink,
    shadowOpacity: 0.4,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 0 },
  },
  pinShadow: {
    shadowColor: color.pink,
    shadowOpacity: 0.6,
    shadowRadius: 26,
    shadowOffset: { width: 0, height: 6 },
  },
  cardInsetLight: "rgba(255,255,255,0.10)",
};

export const radius = {
  screen: 22,
  cardLarge: 20,
  card: 16,
  field: 13,
  thumbnail: 11,
  pill: 999,
};

export const spacing = {
  screenX: 20,
  cardGap: 12,
  sectionGap: 18,
  cardPadding: 13,
  minTap: 44,
};

// Nombres de familia tal cual los expone @expo-google-fonts/manrope y el asset local de Newake.
export const fontFamily = {
  regular: "Manrope_400Regular",
  medium: "Manrope_500Medium",
  semiBold: "Manrope_600SemiBold",
  bold: "Manrope_700Bold",
  extraBold: "Manrope_800ExtraBold",
  display: "Newake",
};

export const type = {
  screenTitle: { fontFamily: fontFamily.extraBold, fontSize: 26, letterSpacing: -0.5, color: color.text },
  contentTitle: { fontFamily: fontFamily.extraBold, fontSize: 25, letterSpacing: -0.5, color: color.text },
  heroTitle: { fontFamily: fontFamily.extraBold, fontSize: 21, letterSpacing: -0.3, color: color.text },
  section: { fontFamily: fontFamily.extraBold, fontSize: 18, letterSpacing: -0.3, color: color.text },
  listItemTitle: { fontFamily: fontFamily.bold, fontSize: 15.5, color: color.text },
  body: { fontFamily: fontFamily.regular, fontSize: 14, lineHeight: 21.7, color: color.text2 },
  meta: { fontFamily: fontFamily.semiBold, fontSize: 12.5, color: color.text3 },
  eyebrow: {
    fontFamily: fontFamily.extraBold,
    fontSize: 11,
    letterSpacing: 0.55,
    color: color.pink,
    textTransform: "uppercase" as const,
  },
  price: { fontFamily: fontFamily.extraBold, fontSize: 18, color: color.text },
  tabLabel: { fontFamily: fontFamily.semiBold, fontSize: 10, color: color.iconOff },
  tabLabelActive: { fontFamily: fontFamily.bold, fontSize: 10, color: color.pink },
};

export const ambientHaloColors = [
  "rgba(233,65,127,0.15)",
  "rgba(233,65,127,0.085)",
] as const;
