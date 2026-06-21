import React from "react";

export const Toast = ({ msg, show, accent }) => {
  if (!show) return null;
  return (
    <div style={{ position: "fixed", top: 24, left: "50%", transform: "translateX(-50%)", background: accent, color: "#fff", padding: "12px 24px", borderRadius: "99px", fontSize: "13px", fontWeight: 700, zIndex: 9000, boxShadow: `0 8px 24px ${accent}50`, whiteSpace: "nowrap" }}>
      {msg}
    </div>
  );
};
export default Toast;
