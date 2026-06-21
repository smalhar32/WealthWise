import React from "react";
import { Ic } from "./Ic";

export const Modal = ({ open, onClose, title, p, children, headerAction }) => {
  if (!open) return null;
  return (
    <div className="modal-overlay" onClick={onClose}>
      <style>{`
        .modal-overlay {
          position: fixed;
          inset: 0;
          z-index: 2000;
          display: flex;
          align-items: flex-end;
          justify-content: center;
          animation: fadeInOverlay 0.28s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        @keyframes fadeInOverlay {
          from { background: rgba(8, 10, 20, 0); backdrop-filter: blur(0px); -webkit-backdrop-filter: blur(0px); }
          to { background: rgba(8, 10, 20, 0.6); backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px); }
        }
        .modal-box {
          background: ${p.bg === "#0D0F18" ? "rgba(22, 24, 36, 0.95)" : "rgba(255, 255, 255, 0.95)"};
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border-radius: 24px 24px 0 0;
          padding: 24px 20px 36px;
          width: 100%;
          max-width: 390px;
          border: 1px solid ${p.bg === "#0D0F18" ? "rgba(255, 255, 255, 0.08)" : "rgba(0, 0, 0, 0.06)"};
          animation: slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
          box-sizing: border-box;
        }
        @keyframes slideUp {
          from { transform: translateY(100%); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        @media (min-width: 900px) {
          .modal-overlay {
            align-items: center !important;
          }
          .modal-box {
            border-radius: 20px !important;
            border: 1px solid ${p.bg === "#0D0F18" ? "rgba(255, 255, 255, 0.08)" : "rgba(0, 0, 0, 0.06)"} !important;
            box-shadow: 0 24px 50px rgba(0,0,0,0.3) !important;
            animation: fadeInCenter 0.28s cubic-bezier(0.16, 1, 0.3, 1) forwards !important;
          }
        }
        @keyframes fadeInCenter {
          from { transform: scale(0.96) translateY(10px); opacity: 0; }
          to { transform: scale(1) translateY(0); opacity: 1; }
        }
      `}</style>
      <div className="modal-box animate-fade-in" onClick={e => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
          <div style={{ fontSize: "16px", fontWeight: 800, color: p.text }}>{title}</div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            {headerAction}
            <button onClick={onClose} style={{ background: p.cardAlt, border: "none", borderRadius: "50%", width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
              <Ic n="close" size={16} color={p.textMuted} />
            </button>
          </div>
        </div>
        {children}
      </div>
    </div>
  );
};
export default Modal;
