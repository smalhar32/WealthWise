export const darkP = {
  bg: "#0D0F18", outerBg: "#080A12", card: "#161824", cardAlt: "#1C1F30",
  accent: "#00C896", accentWarm: "#FF6B6B", accentBlue: "#4D9EFF",
  accentGold: "#FFB830", accentPink: "#FF6BD6",
  text: "#EDF0FF", textMuted: "#6B7090", border: "#252840",
  navBg: "#0F1120", heroGreen: "linear-gradient(135deg,#0E2D22,#161824)",
  heroRed: "linear-gradient(135deg,#2D1414,#161824)",
  heroBlue: "linear-gradient(135deg,#142040,#161824)",
  shadow: "0 32px 64px rgba(0,0,0,0.7)",
};

export const lightP = {
  bg: "#F6F8FF", outerBg: "#EBEEFA", card: "#FFFFFF", cardAlt: "#EEF1FF",
  accent: "#009970", accentWarm: "#D94040", accentBlue: "#1E6FD9",
  accentGold: "#C07E00", accentPink: "#AA2EA0",
  text: "#181A2E", textMuted: "#6B7280", border: "#D8DCF0",
  navBg: "#FFFFFF", heroGreen: "linear-gradient(135deg,#C8F2E8,#EEF1FF)",
  heroRed: "linear-gradient(135deg,#FFE0E0,#EEF1FF)",
  heroBlue: "linear-gradient(135deg,#D8EAFF,#EEF1FF)",
  shadow: "0 32px 64px rgba(100,110,200,0.12)",
};

export const ms = (p) => ({
  card: {
    background: p.bg === "#0D0F18" ? "rgba(22, 24, 36, 0.75)" : "rgba(255, 255, 255, 0.85)",
    backdropFilter: "blur(16px)",
    WebkitBackdropFilter: "blur(16px)",
    borderRadius: "18px",
    padding: "20px",
    marginBottom: "16px",
    border: `1px solid ${p.bg === "#0D0F18" ? "rgba(255, 255, 255, 0.08)" : "rgba(0, 0, 0, 0.06)"}`,
    boxShadow: p.bg === "#0D0F18" ? "0 8px 32px rgba(0, 0, 0, 0.2)" : "0 8px 32px rgba(100, 110, 200, 0.04)",
    transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)"
  },
  cardAlt: {
    background: p.bg === "#0D0F18" ? "rgba(28, 31, 48, 0.75)" : "rgba(238, 241, 255, 0.85)",
    backdropFilter: "blur(12px)",
    WebkitBackdropFilter: "blur(12px)",
    borderRadius: "14px",
    padding: "16px",
    marginBottom: "12px",
    border: `1px solid ${p.bg === "#0D0F18" ? "rgba(255, 255, 255, 0.08)" : "rgba(0, 0, 0, 0.06)"}`,
    boxShadow: p.bg === "#0D0F18" ? "0 4px 16px rgba(0, 0, 0, 0.15)" : "0 4px 16px rgba(100, 110, 200, 0.02)",
    transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)"
  },
  heroCard: (g, bc) => ({
    background: g,
    borderRadius: "20px",
    padding: "22px",
    marginBottom: "16px",
    border: `1px solid ${bc}`,
    boxShadow: "0 12px 28px rgba(0, 0, 0, 0.15)",
    transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)"
  }),
  row: { display: "flex", alignItems: "center", justifyContent: "space-between" },
  muted: { color: p.textMuted, fontSize: "12px" },
  big: { fontSize: "34px", fontWeight: 800, letterSpacing: "-1px", color: p.text },
  small: { fontSize: "13px", fontWeight: 500, color: p.text },
  label: { fontSize: "10px", color: p.textMuted, letterSpacing: "2px", textTransform: "uppercase", fontWeight: 700, marginBottom: "10px", marginTop: "2px" },
  tag: (c) => ({ background: c + "22", color: c, borderRadius: "20px", padding: "3px 10px", fontSize: "11px", fontWeight: 700, display: "inline-block" }),
  track: { background: p.border, borderRadius: "99px", height: "7px", width: "100%", overflow: "hidden", marginTop: "8px" },
  pill: (c, pct) => ({ height: "100%", width: `${Math.min(Math.max(0, pct), 100)}%`, background: c, borderRadius: "99px", transition: "width 0.7s cubic-bezier(.4,0,.2,1)" }),
  addBtn: (c) => ({
    background: c,
    color: "#fff",
    border: "none",
    borderRadius: "14px",
    padding: "14px 20px",
    width: "100%",
    fontSize: "14px",
    fontWeight: 800,
    cursor: "pointer",
    marginTop: "6px",
    fontFamily: "inherit",
    boxShadow: `0 4px 12px ${c}25`,
    transition: "all 0.2s ease",
    outline: "none"
  }),
  dot: (c) => ({ width: "9px", height: "9px", borderRadius: "50%", background: c, flexShrink: 0 }),
  navBtn: (active, accent) => ({ display: "flex", flexDirection: "column", alignItems: "center", gap: "3px", background: "none", border: "none", color: active ? accent : p.textMuted, fontSize: "9px", fontWeight: active ? 700 : 500, cursor: "pointer", padding: "4px 8px", fontFamily: "inherit" }),
});
