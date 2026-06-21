import React from "react";

export const Confetti = ({ show }) => {
  if (!show) return null;
  const pieces = Array.from({ length: 24 }, (_, i) => ({
    id: i, color: ["#00C896", "#FF6B6B", "#4D9EFF", "#FFB830", "#FF6BD6"][i % 5],
    x: Math.random() * 100, delay: Math.random() * 0.5, size: 6 + Math.random() * 8,
  }));
  return (
    <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 300, overflow: "hidden" }}>
      <style>{`@keyframes fall{0%{transform:translateY(-20px) rotate(0deg);opacity:1}100%{transform:translateY(110vh) rotate(720deg);opacity:0}}`}</style>
      {pieces.map(pc => (
        <div key={pc.id} style={{ position: "absolute", left: `${pc.x}%`, top: 0, width: pc.size, height: pc.size, background: pc.color, borderRadius: "2px", animation: `fall 2.5s ${pc.delay}s ease-in forwards` }} />
      ))}
    </div>
  );
};
export default Confetti;
