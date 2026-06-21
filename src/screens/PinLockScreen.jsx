import React, { useState, useEffect } from "react";
import { Capacitor } from "@capacitor/core";
import { NativeBiometric } from "@capgo/capacitor-native-biometric";
import { hashPin } from "../utils/helpers";

export function PinLockScreen({ p, savedPin, biometric, onUnlock, toast, securityQuestion, securityAnswerHash, monthlySalary, onResetPin }) {
  const [entry, setEntry] = useState("");
  const [shake, setShake] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [showBio, setShowBio] = useState(biometric);
  const [bioState, setBioState] = useState("waiting"); // "waiting", "scanning", "success", "error"
  const [recoveryMode, setRecoveryMode] = useState(false);
  const [recoveryAnswer, setRecoveryAnswer] = useState("");
  const [recoveryError, setRecoveryError] = useState("");

  const handleRecoverySubmit = () => {
    if (securityQuestion) {
      if (hashPin(recoveryAnswer.toLowerCase().trim()) === securityAnswerHash) {
        onResetPin();
        onUnlock();
        if (toast) toast("PIN reset successfully! 🔓 Please configure a new PIN in Security Settings.");
      } else {
        setRecoveryError("Incorrect answer. Please try again.");
      }
    } else {
      const parsedSalary = parseFloat(monthlySalary);
      const parsedInput = parseFloat(recoveryAnswer.trim());
      if (!isNaN(parsedSalary) && !isNaN(parsedInput) && parsedInput === parsedSalary) {
        onResetPin();
        onUnlock();
        if (toast) toast("PIN reset successfully! 🔓 Please configure a new PIN in Security Settings.");
      } else {
        setRecoveryError("Incorrect monthly salary. Please try again.");
      }
    }
  };

  const handleKey = (k) => {
    if (k === "del") { setEntry(e => e.slice(0, -1)); return; }
    const next = entry + k;
    setEntry(next);
    if (next.length === 4) {
      if (hashPin(next) === savedPin) {
        onUnlock();
      } else {
        setShake(true);
        setAttempts(a => a + 1);
        setTimeout(() => { setShake(false); setEntry(""); }, 600);
      }
    }
  };

  const triggerBioScan = async () => {
    setBioState("scanning");
    try {
      // Check if we're on a native platform with biometric support
      if (Capacitor.isNativePlatform()) {
        const result = await NativeBiometric.isAvailable();
        if (result.isAvailable) {
          await NativeBiometric.verifyIdentity({
            reason: "Verify your identity to access WealthWise",
            title: "WealthWise Security",
            subtitle: "Biometric Authentication",
            description: "Place your finger on the sensor to unlock",
            useFallback: false,
            maxAttempts: 3,
          });
          // If verifyIdentity resolves, authentication succeeded
          setBioState("success");
          setTimeout(() => {
            onUnlock();
          }, 600);
        } else {
          // No biometric hardware available — fall back to PIN
          setBioState("error");
        }
      } else {
        // Running in browser — show error and fall back to PIN
        setBioState("error");
      }
    } catch (e) {
      // User cancelled or biometric failed
      console.warn("Biometric auth failed:", e);
      setBioState("error");
    }
  };

  useEffect(() => {
    if (biometric) {
      triggerBioScan();
    }
  }, [biometric]);

  const keys = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "del"];

  const sM = {
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
    })
  };

  if (recoveryMode) {
    const question = securityQuestion;
    return (
      <div style={{ position: "fixed", inset: 0, background: p.bg, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", zIndex: 9999, padding: "24px", boxSizing: "border-box" }}>
        <div style={{ 
          background: p.card, 
          border: `1px solid ${p.border}`, 
          borderRadius: "24px", 
          padding: "32px 24px", 
          width: "100%", 
          maxWidth: "360px", 
          textAlign: "center", 
          boxShadow: p.shadow,
          display: "flex",
          flexDirection: "column",
          gap: "20px",
          boxSizing: "border-box"
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", justifyContent: "center" }}>
            <span style={{ fontSize: "24px" }}>🔑</span>
            <h2 style={{ fontSize: "18px", fontWeight: 800, color: p.text, margin: 0 }}>Reset App PIN</h2>
          </div>

          <p style={{ fontSize: "12px", color: p.textMuted, margin: 0, lineHeight: "1.4" }}>
            {question 
              ? "Answer your security question below to reset your PIN and access the application."
              : "No recovery question configured. Please enter your Monthly Salary to verify identity and reset your PIN."
            }
          </p>

          <div style={{ textAlign: "left" }}>
            <div style={{ fontSize: "11px", color: p.textMuted, fontWeight: 700, marginBottom: "8px", textTransform: "uppercase", letterSpacing: "1px" }}>
              {question ? "Security Question" : "Verification Question"}
            </div>
            <div style={{ fontSize: "13px", fontWeight: 700, color: p.text, background: p.cardAlt, padding: "12px", borderRadius: "12px", border: `1px solid ${p.border}`, marginBottom: "16px" }}>
              {question ? question : "What is your configured Monthly Salary (₹)?"}
            </div>

            <div style={{ fontSize: "11px", color: p.textMuted, fontWeight: 700, marginBottom: "6px", textTransform: "uppercase", letterSpacing: "1px" }}>
              Your Answer
            </div>
            <input
              type={question ? "text" : "number"}
              placeholder={question ? "Enter answer" : "e.g. 50000"}
              value={recoveryAnswer}
              onChange={e => {
                setRecoveryAnswer(e.target.value);
                setRecoveryError("");
              }}
              style={{ 
                width: "100%", 
                padding: "12px 14px", 
                background: p.cardAlt, 
                border: `1px solid ${recoveryError ? p.accentWarm : p.border}`, 
                borderRadius: "12px", 
                color: p.text, 
                fontFamily: "inherit", 
                fontSize: "13px", 
                outline: "none", 
                boxSizing: "border-box" 
              }}
            />
            {recoveryError && (
              <div style={{ color: p.accentWarm, fontSize: "11px", fontWeight: 600, marginTop: "6px" }}>
                ⚠️ {recoveryError}
              </div>
            )}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginTop: "10px" }}>
            <button
              onClick={() => {
                setRecoveryMode(false);
                setRecoveryAnswer("");
                setRecoveryError("");
              }}
              style={{ 
                background: "transparent", 
                color: p.textMuted, 
                border: `1px solid ${p.border}`, 
                borderRadius: "14px", 
                padding: "12px", 
                fontSize: "13px", 
                fontWeight: "700", 
                cursor: "pointer",
                fontFamily: "inherit"
              }}
            >
              Cancel
            </button>
            <button
              onClick={handleRecoverySubmit}
              style={{
                background: p.accent,
                color: "#fff",
                border: "none",
                borderRadius: "14px",
                padding: "12px",
                fontSize: "13px",
                fontWeight: 800,
                cursor: "pointer",
                fontFamily: "inherit",
                boxShadow: `0 4px 12px ${p.accent}25`
              }}
            >
              Verify & Reset
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ position: "fixed", inset: 0, background: p.bg, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", zIndex: 9999, gap: "28px" }}>
      {/* Biometric overlay */}
      {showBio && (
        <div style={{
          position: "absolute",
          inset: 0,
          background: "rgba(13, 15, 24, 0.95)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 10000,
          backdropFilter: "blur(10px)",
          animation: "fadeIn 0.3s ease"
        }}>
          <div style={{
            background: p.card,
            border: `1px solid ${p.border}`,
            borderRadius: "24px",
            padding: "32px 24px",
            width: "88%",
            maxWidth: "320px",
            textAlign: "center",
            boxShadow: p.shadow,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "20px"
          }}>
            <div style={{ fontSize: "20px", fontWeight: 800, color: p.text }}>Security Lock</div>
            
            <div 
              onClick={bioState === "waiting" || bioState === "error" ? triggerBioScan : null}
              style={{
                width: 90,
                height: 90,
                borderRadius: "50%",
                background: bioState === "success" ? p.accent + "22" : (bioState === "error" ? p.accentWarm + "22" : p.cardAlt),
                border: `2px dashed ${bioState === "success" ? p.accent : (bioState === "error" ? p.accentWarm : p.border)}`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: bioState === "waiting" || bioState === "error" ? "pointer" : "default",
                position: "relative",
                transition: "all 0.3s ease"
              }}
            >
              {bioState === "scanning" && (
                <div style={{
                  position: "absolute",
                  inset: -8,
                  borderRadius: "50%",
                  border: `2px solid ${p.accent}`,
                  opacity: 0.8,
                  animation: "pulseRing 1.5s infinite"
                }} />
              )}
              
              {bioState === "success" ? (
                <svg style={{ width: 42, height: 42, animation: "popIn 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)" }} viewBox="0 0 24 24" fill="none" stroke={p.accent} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
              ) : bioState === "error" ? (
                <svg style={{ width: 40, height: 40 }} viewBox="0 0 24 24" fill="none" stroke={p.accentWarm} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
              ) : (
                <svg style={{ width: 44, height: 44, animation: "fingerprintPulse 2s infinite" }} viewBox="0 0 24 24" fill="none" stroke={p.accent} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18.9 7.2A9.97 9.97 0 0 0 12 4a9.97 9.97 0 0 0-6.9 3.2"/>
                  <path d="M3.6 11.2a9.98 9.98 0 0 0-.1 1.3c0 1.2.2 2.3.5 3.4"/>
                  <path d="M20.5 11.5c0-.4 0-.8-.1-1.2"/>
                  <path d="M7.5 8.8A6 6 0 0 1 12 7c2 0 3.8 1 4.9 2.5"/>
                  <path d="M6 12.5c0 2 .5 3.8 1.4 5.4"/>
                  <path d="M18 12c0 1.5-.3 2.9-.8 4.2"/>
                  <path d="M9 12.8a3 3 0 0 1 3-3.3c1.5 0 2.7 1.1 3 2.5"/>
                  <path d="M12 12v4.5c0 1.1-.4 2.1-1 2.9"/>
                  <path d="M15 14.5c0 1.3-.3 2.5-.8 3.5"/>
                </svg>
              )}
            </div>

            <div>
              <div style={{ fontSize: "14px", fontWeight: 700, color: p.text }}>
                {bioState === "scanning" ? "Scanning Biometrics..." : (bioState === "success" ? "Unlocked Successfully!" : "Biometric Unlock")}
              </div>
              <div style={{ fontSize: "11px", color: p.textMuted, marginTop: "6px" }}>
                {bioState === "scanning" ? "Place finger on scanner" : (bioState === "success" ? "Opening your wallet..." : "Verify fingerprint or Face ID to access WealthWise")}
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "10px", width: "100%", marginTop: "10px" }}>
              {bioState === "error" && (
                <button onClick={triggerBioScan} style={{ ...sM.addBtn(p.accent), padding: "10px 14px", fontSize: "13px" }}>
                  Try Again
                </button>
              )}
              <button 
                onClick={() => setShowBio(false)} 
                style={{ 
                  background: "transparent", 
                  color: p.accentBlue, 
                  border: `1px solid ${p.accentBlue}30`, 
                  borderRadius: "14px", 
                  padding: "10px 14px", 
                  fontSize: "13px", 
                  fontWeight: 700, 
                  cursor: "pointer", 
                  fontFamily: "inherit",
                  transition: "all 0.2s" 
                }}
              >
                Use PIN Instead
              </button>
            </div>
          </div>
        </div>
      )}

      <div style={{ fontSize: "40px" }}>🔐</div>
      <div style={{ fontSize: "20px", fontWeight: 800, color: p.text }}>Enter PIN</div>
      {attempts > 0 && <div style={{ fontSize: "12px", color: p.accentWarm }}>Incorrect PIN — try again</div>}
      <div style={{ display: "flex", gap: "16px", animation: shake ? "shake 0.5s" : "none" }}>
        {[0, 1, 2, 3].map(i => (
          <div key={i} style={{ width: 16, height: 16, borderRadius: "50%", background: entry.length > i ? p.accent : p.border, transition: "background 0.15s" }} />
        ))}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 72px)", gap: "12px" }}>
        {keys.map((k, i) => k === "" ? <div key={i} /> : (
          <button key={i} onClick={() => handleKey(k)}
            style={{ width: 72, height: 72, borderRadius: "50%", background: k === "del" ? p.cardAlt : p.card, border: `1px solid ${p.border}`, fontSize: k === "del" ? "18px" : "22px", fontWeight: 700, color: p.text, cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", justifyContent: "center" }}>
            {k === "del" ? "⌫" : k}
          </button>
        ))}
      </div>
      {biometric && !showBio && (
        <button 
          onClick={() => { setShowBio(true); setBioState("waiting"); triggerBioScan(); }}
          style={{ 
            background: "transparent", 
            color: p.accentBlue, 
            border: `1px solid ${p.accentBlue}30`, 
            borderRadius: "14px", 
            padding: "10px 20px", 
            fontSize: "13px", 
            fontWeight: 700, 
            cursor: "pointer", 
            fontFamily: "inherit",
            transition: "all 0.2s",
            display: "flex",
            alignItems: "center",
            gap: "8px",
            marginTop: "4px"
          }}
        >
          <svg style={{ width: 18, height: 18 }} viewBox="0 0 24 24" fill="none" stroke={p.accentBlue} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18.9 7.2A9.97 9.97 0 0 0 12 4a9.97 9.97 0 0 0-6.9 3.2"/>
            <path d="M3.6 11.2a9.98 9.98 0 0 0-.1 1.3c0 1.2.2 2.3.5 3.4"/>
            <path d="M20.5 11.5c0-.4 0-.8-.1-1.2"/>
            <path d="M7.5 8.8A6 6 0 0 1 12 7c2 0 3.8 1 4.9 2.5"/>
            <path d="M6 12.5c0 2 .5 3.8 1.4 5.4"/>
            <path d="M18 12c0 1.5-.3 2.9-.8 4.2"/>
            <path d="M9 12.8a3 3 0 0 1 3-3.3c1.5 0 2.7 1.1 3 2.5"/>
            <path d="M12 12v4.5c0 1.1-.4 2.1-1 2.9"/>
            <path d="M15 14.5c0 1.3-.3 2.5-.8 3.5"/>
          </svg>
          Use Biometric
        </button>
      )}
      <button
        onClick={() => setRecoveryMode(true)}
        style={{
          background: "transparent",
          color: p.textMuted,
          border: "none",
          fontSize: "12px",
          fontWeight: 600,
          cursor: "pointer",
          marginTop: "12px",
          fontFamily: "inherit",
          textDecoration: "underline"
        }}
      >
        Forgot PIN?
      </button>
      <style>{`
        @keyframes shake { 0%,100%{transform:translateX(0)} 20%,60%{transform:translateX(-8px)} 40%,80%{transform:translateX(8px)} }
        @keyframes fadeIn { from{opacity:0} to{opacity:1} }
        @keyframes popIn { from{transform:scale(0.5); opacity:0} to{transform:scale(1); opacity:1} }
        @keyframes pulseRing {
          0% { transform: scale(1); opacity: 0.8; }
          100% { transform: scale(1.3); opacity: 0; }
        }
        @keyframes fingerprintPulse {
          0%, 100% { opacity: 0.7; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.05); }
        }
      `}</style>
    </div>
  );
}

export default PinLockScreen;
