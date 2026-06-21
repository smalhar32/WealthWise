import React from "react";

export const Bar = ({ pct, color, s }) => (
  <div style={s.track}><div style={s.pill(color, pct)} /></div>
);
