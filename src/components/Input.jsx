import React from "react";

export const Input = ({ label, value, onChange, type = "text", placeholder, p }) => {
  return (
    <div style={{ marginBottom: "14px" }}>
      <div style={{ fontSize: "11px", color: p.textMuted, fontWeight: 600, marginBottom: "6px", textTransform: "uppercase", letterSpacing: "1px" }}>{label}</div>
      <input
        type={type}
        value={value}
        onChange={e => onChange && onChange(e.target.value)}
        placeholder={placeholder}
        style={{
          width: "100%",
          background: p.cardAlt,
          border: `1px solid ${p.border}`,
          borderRadius: "12px",
          padding: "12px 14px",
          color: p.text,
          fontSize: "14px",
          fontFamily: "inherit",
          outline: "none",
          boxSizing: "border-box",
          transition: "all 0.2s ease"
        }}
        onFocus={(e) => {
          e.target.style.borderColor = p.accent;
          e.target.style.boxShadow = `0 0 0 3px ${p.accent}20`;
        }}
        onBlur={(e) => {
          e.target.style.borderColor = p.border;
          e.target.style.boxShadow = "none";
        }}
      />
    </div>
  );
};
export default Input;
