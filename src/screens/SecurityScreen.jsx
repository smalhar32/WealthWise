import React, { useState, useEffect } from "react";
import { Filesystem, Directory, Encoding } from "@capacitor/filesystem";
import { Share } from "@capacitor/share";
import { Capacitor } from "@capacitor/core";
import { Ic } from "../components/Ic";
import { hashPin } from "../utils/helpers";
import { getStorageItem, setStorageItem, removeStorageItem } from "../utils/storage";
import { initiateOAuthFlow, uploadBackup, downloadBackup, DEFAULT_CLIENT_ID } from "../utils/gdrive";

const validateImportData = (data) => {
  const errors = [];
  const isString = (val) => typeof val === "string";

  for (const key of Object.keys(data)) {
    if (!key.startsWith("ww_")) continue;
    
    let parsedVal;
    try {
      parsedVal = JSON.parse(data[key]);
    } catch (e) {
      parsedVal = data[key];
    }

    if (key === "ww_userName") {
      if (parsedVal !== null && parsedVal !== undefined && !isString(parsedVal)) {
        errors.push("User Name (ww_userName) must be text.");
      }
    }
    else if (key === "ww_monthlySalary") {
      const num = parseFloat(parsedVal);
      if (isNaN(num)) {
        errors.push("Monthly Salary (ww_monthlySalary) must be a valid number.");
      }
    }
    else if (key === "ww_monthlySalaries") {
      if (parsedVal && typeof parsedVal === "object" && !Array.isArray(parsedVal)) {
        Object.entries(parsedVal).forEach(([k, val]) => {
          if (isNaN(parseFloat(val))) {
            errors.push(`Monthly salary for ${k} (ww_monthlySalaries) must be a valid number.`);
          }
        });
      } else {
        errors.push("Monthly Salaries (ww_monthlySalaries) must be a key-value object.");
      }
    }
    else if (key === "ww_pin") {
      if (parsedVal && !isString(parsedVal)) {
        errors.push("PIN (ww_pin) must be text.");
      }
    }
    else if (key === "ww_biometric" || key === "ww_backup") {
      const b = parsedVal === true || parsedVal === "true" || parsedVal === false || parsedVal === "false";
      if (!b) {
        errors.push(`${key} must be a boolean (true/false).`);
      }
    }
    else if (key === "ww_streak") {
      const num = parseInt(parsedVal, 10);
      if (isNaN(num)) {
        errors.push("Streak (ww_streak) must be a number.");
      }
    }
    else if (key === "ww_prevNetWorth") {
      const num = parseFloat(parsedVal);
      if (isNaN(num)) {
        errors.push("Previous Net Worth (ww_prevNetWorth) must be a number.");
      }
    }
    else if (key === "ww_categories") {
      if (!Array.isArray(parsedVal)) {
        errors.push("Categories (ww_categories) must be an array.");
      } else {
        parsedVal.forEach((cat, idx) => {
          const catLabel = cat.name ? `Category '${cat.name}'` : `Category at index ${idx}`;
          if (!cat.name || !isString(cat.name)) {
            errors.push(`${catLabel} is missing a valid name.`);
          }
          if (cat.budget !== undefined && isNaN(parseFloat(cat.budget))) {
            errors.push(`${catLabel} budget must be a valid number.`);
          }
          if (cat.spent !== undefined && isNaN(parseFloat(cat.spent))) {
            errors.push(`${catLabel} spent must be a valid number.`);
          }
        });
      }
    }
    else if (key === "ww_txns") {
      if (!Array.isArray(parsedVal)) {
        errors.push("Transactions (ww_txns) must be an array.");
      } else {
        parsedVal.forEach((t, idx) => {
          const tLabel = t.name || t.cat || `Transaction at index ${idx}`;
          if (t.amount === undefined || isNaN(parseFloat(t.amount))) {
            errors.push(`Transaction '${tLabel}' amount must be a valid number.`);
          }
        });
      }
    }
    else if (key === "ww_pots") {
      if (!Array.isArray(parsedVal)) {
        errors.push("Savings Pots (ww_pots) must be an array.");
      } else {
        parsedVal.forEach((pot, idx) => {
          const pLabel = pot.name || `Pot at index ${idx}`;
          if (pot.bankAmount !== undefined && isNaN(parseFloat(pot.bankAmount))) {
            errors.push(`Savings Pot '${pLabel}' bank amount must be a valid number.`);
          }
          if (pot.cashAmount !== undefined && isNaN(parseFloat(pot.cashAmount))) {
            errors.push(`Savings Pot '${pLabel}' cash amount must be a valid number.`);
          }
          if (pot.amount !== undefined && isNaN(parseFloat(pot.amount))) {
            errors.push(`Savings Pot '${pLabel}' total amount must be a valid number.`);
          }
        });
      }
    }
    else if (key === "ww_inv") {
      if (!Array.isArray(parsedVal)) {
        errors.push("Investments (ww_inv) must be an array.");
      } else {
        parsedVal.forEach((inv, idx) => {
          const iLabel = inv.name || `Investment at index ${idx}`;
          if (inv.amount !== undefined && isNaN(parseFloat(inv.amount))) {
            errors.push(`Investment '${iLabel}' amount must be a valid number.`);
          }
          if (inv.invested !== undefined && isNaN(parseFloat(inv.invested))) {
            errors.push(`Investment '${iLabel}' invested cost must be a valid number.`);
          }
          if (inv.current !== undefined && isNaN(parseFloat(inv.current))) {
            errors.push(`Investment '${iLabel}' current value must be a valid number.`);
          }
          if (inv.shares !== undefined && isNaN(parseFloat(inv.shares))) {
            errors.push(`Investment '${iLabel}' shares must be a valid number.`);
          }
          if (inv.buyPrice !== undefined && isNaN(parseFloat(inv.buyPrice))) {
            errors.push(`Investment '${iLabel}' buy price must be a valid number.`);
          }
          if (inv.currentPrice !== undefined && isNaN(parseFloat(inv.currentPrice))) {
            errors.push(`Investment '${iLabel}' current price must be a valid number.`);
          }
        });
      }
    }
    else if (key === "ww_goals") {
      if (!Array.isArray(parsedVal)) {
        errors.push("Goals (ww_goals) must be an array.");
      } else {
        parsedVal.forEach((goal, idx) => {
          const gLabel = goal.name || `Goal at index ${idx}`;
          if (goal.target !== undefined && isNaN(parseFloat(goal.target))) {
            errors.push(`Goal '${gLabel}' target must be a valid number.`);
          }
          if (goal.saved !== undefined && isNaN(parseFloat(goal.saved))) {
            errors.push(`Goal '${gLabel}' saved amount must be a valid number.`);
          }
        });
      }
    }
    else if (key === "ww_debts") {
      if (!Array.isArray(parsedVal)) {
        errors.push("Debts (ww_debts) must be an array.");
      } else {
        parsedVal.forEach((debt, idx) => {
          const dLabel = debt.name || `Debt at index ${idx}`;
          if (debt.amount !== undefined && isNaN(parseFloat(debt.amount))) {
            errors.push(`Debt '${dLabel}' amount must be a valid number.`);
          }
          if (debt.rate !== undefined && isNaN(parseFloat(debt.rate))) {
            errors.push(`Debt '${dLabel}' rate must be a valid number.`);
          }
          if (debt.emi !== undefined && isNaN(parseFloat(debt.emi))) {
            errors.push(`Debt '${dLabel}' EMI must be a valid number.`);
          }
        });
      }
    }
    else if (key === "ww_savingsHistory" || key === "ww_investmentsHistory" || key === "ww_loansHistory") {
      if (!Array.isArray(parsedVal)) {
        errors.push(`Passbook list (${key}) must be an array.`);
      } else {
        parsedVal.forEach((h, idx) => {
          const entryLabel = h.name || h.desc || `Entry at index ${idx}`;
          if (h.amount !== undefined && isNaN(parseFloat(h.amount))) {
            errors.push(`Passbook entry '${entryLabel}' amount must be a valid number.`);
          }
        });
      }
    }
  }

  return errors;
};

const DB_KEYS = [
  "ww_monthlySalaries",
  "ww_dashboardMode",
  "ww_onboarded",
  "ww_isDark",
  "ww_userName",
  "ww_monthlySalary",
  "ww_pin",
  "ww_biometric",
  "ww_backup",
  "ww_txns",
  "ww_categories",
  "ww_pots",
  "ww_inv",
  "ww_goals",
  "ww_debts",
  "ww_streak",
  "ww_prevNetWorth",
  "ww_savingsHistory",
  "ww_investmentsHistory",
  "ww_loansHistory",
  "ww_lastResetMonth",
  "ww_securityQuestion",
  "ww_securityAnswerHash"
];

export function SecurityScreen({
  width,
  isMobile,
  isTablet,
  isDesktop,
  p,
  s,
  toast,
  pin,
  setPin,
  biometric,
  setBiometric,
  backup,
  setBackup,
  hashedPin,
  setHashedPin,
  securityQuestion,
  setSecurityQuestion,
  securityAnswerHash,
  setSecurityAnswerHash,
  gToken,
  setGToken,
  isLoading
}) {
  const pinSet = !!hashedPin;
  const [isChangingPin, setIsChangingPin] = useState(false);
  
  // Local form states for the recovery question settings
  const [editSecurityQuestion, setEditSecurityQuestion] = useState("What was the name of your first pet?");
  const [customQuestion, setCustomQuestion] = useState("");
  const [securityAnswer, setSecurityAnswer] = useState("");

  const [lastSync, setLastSync] = useState("");
  const [autoBackup, setAutoBackup] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [clientId, setClientId] = useState(DEFAULT_CLIENT_ID);

  useEffect(() => {
    const loadSyncSettings = async () => {
      const syncTime = await getStorageItem("ww_gdrive_last_sync", "");
      setLastSync(syncTime);
      const isAuto = await getStorageItem("ww_gdrive_autobackup", "false");
      setAutoBackup(isAuto === "true");
      let savedClientId = await getStorageItem("ww_gdrive_client_id", DEFAULT_CLIENT_ID);
      if (savedClientId === "1057421376822-0lq2b8f8jkhn63u4m6ebr29o3b839vve.apps.googleusercontent.com") {
        savedClientId = DEFAULT_CLIENT_ID;
        await setStorageItem("ww_gdrive_client_id", DEFAULT_CLIENT_ID);
      }
      setClientId(savedClientId);
    };
    loadSyncSettings();
  }, []);

  const handleSaveClientId = async (val) => {
    setClientId(val);
    await setStorageItem("ww_gdrive_client_id", val);
  };

  const handleCopyRedirectUri = () => {
    navigator.clipboard.writeText(`${window.location.origin}/`);
    toast("Redirect URI copied to clipboard! 📋");
  };

  const [createPinDigits, setCreatePinDigits] = useState(["", "", "", ""]);
  const [confirmCreatePinDigits, setConfirmCreatePinDigits] = useState(["", "", "", ""]);
  const [shakeCreate, setShakeCreate] = useState(false);

  const [changePinDigits, setChangePinDigits] = useState(["", "", "", ""]);
  const [confirmChangePinDigits, setConfirmChangePinDigits] = useState(["", "", "", ""]);
  const [shakeChange, setShakeChange] = useState(false);

  const handlePinChange = (i, v, pinType) => {
    const cleanVal = v.replace(/[^0-9]/g, "").slice(-1);
    
    if (pinType === "create") {
      const nextDigits = [...createPinDigits];
      nextDigits[i] = cleanVal;
      setCreatePinDigits(nextDigits);
      if (cleanVal && i < 3) {
        const nextInput = document.getElementById(`create-pin-${i + 1}`);
        if (nextInput) nextInput.focus();
      } else if (cleanVal && i === 3) {
        const nextInput = document.getElementById(`confirm-create-pin-0`);
        if (nextInput) nextInput.focus();
      }
    } else if (pinType === "confirm-create") {
      const nextDigits = [...confirmCreatePinDigits];
      nextDigits[i] = cleanVal;
      setConfirmCreatePinDigits(nextDigits);
      if (cleanVal && i < 3) {
        const nextInput = document.getElementById(`confirm-create-pin-${i + 1}`);
        if (nextInput) nextInput.focus();
      }
    } else if (pinType === "change") {
      const nextDigits = [...changePinDigits];
      nextDigits[i] = cleanVal;
      setChangePinDigits(nextDigits);
      if (cleanVal && i < 3) {
        const nextInput = document.getElementById(`change-pin-${i + 1}`);
        if (nextInput) nextInput.focus();
      } else if (cleanVal && i === 3) {
        const nextInput = document.getElementById(`confirm-change-pin-0`);
        if (nextInput) nextInput.focus();
      }
    } else if (pinType === "confirm-change") {
      const nextDigits = [...confirmChangePinDigits];
      nextDigits[i] = cleanVal;
      setConfirmChangePinDigits(nextDigits);
      if (cleanVal && i < 3) {
        const nextInput = document.getElementById(`confirm-change-pin-${i + 1}`);
        if (nextInput) nextInput.focus();
      }
    }
  };

  const handleKeyDown = (i, e, pinType) => {
    if (e.key === "Backspace") {
      let nextDigits;
      if (pinType === "create") nextDigits = [...createPinDigits];
      else if (pinType === "confirm-create") nextDigits = [...confirmCreatePinDigits];
      else if (pinType === "change") nextDigits = [...changePinDigits];
      else if (pinType === "confirm-change") nextDigits = [...confirmChangePinDigits];

      if (nextDigits[i] === "") {
        if (i > 0) {
          const prevInput = document.getElementById(`${pinType}-pin-${i - 1}`);
          if (prevInput) {
            prevInput.focus();
            const updated = [...nextDigits];
            updated[i - 1] = "";
            if (pinType === "create") setCreatePinDigits(updated);
            else if (pinType === "confirm-create") setConfirmCreatePinDigits(updated);
            else if (pinType === "change") setChangePinDigits(updated);
            else if (pinType === "confirm-change") setConfirmChangePinDigits(updated);
          }
        } else if (i === 0) {
          if (pinType === "confirm-create") {
            const prevInput = document.getElementById("create-pin-3");
            if (prevInput) {
              prevInput.focus();
              const updated = [...createPinDigits];
              updated[3] = "";
              setCreatePinDigits(updated);
            }
          } else if (pinType === "confirm-change") {
            const prevInput = document.getElementById("change-pin-3");
            if (prevInput) {
              prevInput.focus();
              const updated = [...changePinDigits];
              updated[3] = "";
              setChangePinDigits(updated);
            }
          }
        }
      } else {
        const updated = [...nextDigits];
        updated[i] = "";
        if (pinType === "create") setCreatePinDigits(updated);
        else if (pinType === "confirm-create") setConfirmCreatePinDigits(updated);
        else if (pinType === "change") setChangePinDigits(updated);
        else if (pinType === "confirm-change") setConfirmChangePinDigits(updated);
      }
    }
  };

  const submitCreatePin = async () => {
    const pinStr = createPinDigits.join("");
    const confirmStr = confirmCreatePinDigits.join("");
    const qText = editSecurityQuestion === "custom" ? customQuestion.trim() : editSecurityQuestion;
    const ansText = securityAnswer.trim();
    
    if (pinStr.length < 4) {
      toast("Please enter a 4-digit PIN! 🔐");
      setShakeCreate(true);
      setTimeout(() => setShakeCreate(false), 500);
      return;
    }
    
    if (confirmStr.length < 4) {
      toast("Please confirm your PIN! 🔐");
      setShakeCreate(true);
      setTimeout(() => setShakeCreate(false), 500);
      return;
    }

    if (!qText || !ansText) {
      toast("Please set a security recovery question and answer! ⚠️");
      setShakeCreate(true);
      setTimeout(() => setShakeCreate(false), 500);
      return;
    }
    
    if (pinStr === confirmStr) {
      const hashed = hashPin(pinStr);
      const ansHash = hashPin(ansText.toLowerCase());
      await setStorageItem("ww_pin", hashed);
      await setStorageItem("ww_securityQuestion", qText);
      await setStorageItem("ww_securityAnswerHash", ansHash);
      setPin(createPinDigits);
      setHashedPin(hashed);
      setSecurityQuestion(qText);
      setSecurityAnswerHash(ansHash);
      setCreatePinDigits(["", "", "", ""]);
      setConfirmCreatePinDigits(["", "", "", ""]);
      setSecurityAnswer("");
      setCustomQuestion("");
      toast("PIN and Recovery question set successfully! 🔒");
    } else {
      toast("PINs do not match! ❌");
      setShakeCreate(true);
      setTimeout(() => setShakeCreate(false), 500);
    }
  };

  const submitChangePin = async () => {
    const pinStr = changePinDigits.join("");
    const confirmStr = confirmChangePinDigits.join("");
    const qText = editSecurityQuestion === "custom" ? customQuestion.trim() : editSecurityQuestion;
    const ansText = securityAnswer.trim();
    
    if (pinStr.length < 4) {
      toast("Please enter a 4-digit PIN! 🔐");
      setShakeChange(true);
      setTimeout(() => setShakeChange(false), 500);
      return;
    }
    
    if (confirmStr.length < 4) {
      toast("Please confirm your PIN! 🔐");
      setShakeChange(true);
      setTimeout(() => setShakeChange(false), 500);
      return;
    }

    if (!qText || !ansText) {
      toast("Please enter a security question and answer! ⚠️");
      setShakeChange(true);
      setTimeout(() => setShakeChange(false), 500);
      return;
    }
    
    if (pinStr === confirmStr) {
      const hashed = hashPin(pinStr);
      const ansHash = hashPin(ansText.toLowerCase());
      await setStorageItem("ww_pin", hashed);
      await setStorageItem("ww_securityQuestion", qText);
      await setStorageItem("ww_securityAnswerHash", ansHash);
      setPin(changePinDigits);
      setHashedPin(hashed);
      setSecurityQuestion(qText);
      setSecurityAnswerHash(ansHash);
      setChangePinDigits(["", "", "", ""]);
      setConfirmChangePinDigits(["", "", "", ""]);
      setSecurityAnswer("");
      setCustomQuestion("");
      setIsChangingPin(false);
      toast("PIN changed successfully! 🔒");
    } else {
      toast("PINs do not match! ❌");
      setShakeChange(true);
      setTimeout(() => setShakeChange(false), 500);
    }
  };

  const removePin = async () => {
    const ok = window.confirm("Are you sure you want to remove the App PIN Lock? Biometrics and PIN recovery will also be disabled.");
    if (ok) {
      await removeStorageItem("ww_pin");
      await removeStorageItem("ww_securityQuestion");
      await removeStorageItem("ww_securityAnswerHash");
      setHashedPin("");
      setSecurityQuestion("");
      setSecurityAnswerHash("");
      setPin(["", "", "", ""]);
      setBiometric(false);
      toast("PIN, Biometrics, and recovery question removed");
    }
  };

  const collectBackupData = async () => {
    const data = {};
    for (const key of DB_KEYS) {
      const val = await getStorageItem(key, null);
      if (val !== null) {
        data[key] = val;
      }
    }
    return data;
  };

  const handleCloudBackup = async () => {
    if (!gToken) return;
    try {
      setIsSyncing(true);
      toast("Uploading backup to Google Drive... ☁️");
      const backupData = await collectBackupData();
      const success = await uploadBackup(gToken, backupData);
      if (success) {
        const nowStr = new Date().toLocaleString();
        await setStorageItem("ww_gdrive_last_sync", nowStr);
        setLastSync(nowStr);
        toast("Backup uploaded successfully! ☁️✅");
      }
    } catch (err) {
      toast(`Backup failed: ${err.message || err} ⚠️`);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleCloudRestore = async () => {
    if (!gToken) return;
    const ok = window.confirm("Are you sure you want to restore from Google Drive? This will OVERWRITE your current local data!");
    if (!ok) return;
    try {
      setIsSyncing(true);
      toast("Downloading backup from Google Drive... ☁️");
      const backupData = await downloadBackup(gToken);
      if (!backupData) {
        toast("No backup found on Google Drive! ⚠️");
        return;
      }
      const keys = Object.keys(backupData).filter(k => k.startsWith("ww_"));
      if (keys.length === 0) {
        toast("Downloaded backup is empty or invalid! ⚠️");
        return;
      }

      // Validate import data schema
      const errors = validateImportData(backupData);
      if (errors.length > 0) {
        alert("Restore rejected due to validation errors:\n\n" + errors.map(err => `• ${err}`).join("\n"));
        return;
      }

      for (const key of keys) {
        await setStorageItem(key, backupData[key]);
      }
      // Clear old localStorage keys to prevent mixups
      localStorage.clear();
      toast("Data restored! Reloading... 🔄");
      setTimeout(() => window.location.reload(), 1000);
    } catch (err) {
      toast(`Restore failed: ${err.message || err} ⚠️`);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleToggleAutoBackup = async () => {
    const next = !autoBackup;
    setAutoBackup(next);
    await setStorageItem("ww_gdrive_autobackup", next ? "true" : "false");
    toast(next ? "Auto-backup enabled! ☁️🔄" : "Auto-backup disabled");
  };

  const handleUnlinkGDrive = async () => {
    const ok = window.confirm("Disconnect from Google Drive Cloud Backup?");
    if (!ok) return;
    await removeStorageItem("ww_gdrive_token");
    await removeStorageItem("ww_gdrive_token_expiry");
    await removeStorageItem("ww_gdrive_last_sync");
    await removeStorageItem("ww_gdrive_autobackup");
    setGToken(null);
    setLastSync("");
    setAutoBackup(false);
    toast("Disconnected from Google Drive! ☁️🔌");
  };

  const renderLeft = () => (
    <>
      <div style={s.label}>Privacy & Security</div>
      <div style={s.heroCard(p.heroBlue, p.accentBlue + "40")}>
        <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
          <Ic n="shield" size={28} color={p.accentBlue} />
          <div>
            <div style={{ fontSize: "15px", fontWeight: 800, color: p.text }}>Your data is private</div>
            <div style={s.muted}>All data is stored locally in your browser's localStorage. Never shared.</div>
          </div>
        </div>
      </div>

      {/* PIN Section */}
      <div style={s.card}>
        {!pinSet ? (
          <div>
            <div style={{ fontSize: "13px", fontWeight: 700, color: p.text, marginBottom: "4px" }}>🔐 Create App PIN</div>
            <div style={{ ...s.muted, marginBottom: "14px" }}>Set a 4-digit PIN to lock your app</div>
            <div style={{ display: "flex", flexDirection: "column", gap: "16px", animation: shakeCreate ? "shake 0.5s" : "none" }}>
              <div>
                <div style={{ fontSize: "11px", color: p.textMuted, fontWeight: 700, marginBottom: "6px", textTransform: "uppercase", letterSpacing: "1px" }}>Enter PIN</div>
                <div style={{ display: "flex", gap: "10px", justifyContent: "center" }}>
                  {createPinDigits.map((d, i) => (
                    <input
                      key={i}
                      id={`create-pin-${i}`}
                      type="password"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      value={d}
                      onChange={e => handlePinChange(i, e.target.value, "create")}
                      onKeyDown={e => handleKeyDown(i, e, "create")}
                      maxLength={1}
                      style={{ width: "48px", height: "48px", textAlign: "center", fontSize: "20px", background: p.cardAlt, border: `2px solid ${d ? p.accent : p.border}`, borderRadius: "12px", color: p.text, fontFamily: "inherit", outline: "none" }}
                    />
                  ))}
                </div>
              </div>

              <div>
                <div style={{ fontSize: "11px", color: p.textMuted, fontWeight: 700, marginBottom: "6px", textTransform: "uppercase", letterSpacing: "1px" }}>Confirm PIN</div>
                <div style={{ display: "flex", gap: "10px", justifyContent: "center" }}>
                  {confirmCreatePinDigits.map((d, i) => (
                    <input
                      key={i}
                      id={`confirm-create-pin-${i}`}
                      type="password"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      value={d}
                      onChange={e => handlePinChange(i, e.target.value, "confirm-create")}
                      onKeyDown={e => handleKeyDown(i, e, "confirm-create")}
                      maxLength={1}
                      style={{ width: "48px", height: "48px", textAlign: "center", fontSize: "20px", background: p.cardAlt, border: `2px solid ${d ? p.accent : p.border}`, borderRadius: "12px", color: p.text, fontFamily: "inherit", outline: "none" }}
                    />
                  ))}
                </div>
              </div>

              <div>
                <div style={{ fontSize: "11px", color: p.textMuted, fontWeight: 700, marginBottom: "6px", textTransform: "uppercase", letterSpacing: "1px" }}>Security Question (for PIN recovery)</div>
                <select
                  value={editSecurityQuestion}
                  onChange={e => setEditSecurityQuestion(e.target.value)}
                  style={{ width: "100%", padding: "10px", background: p.cardAlt, border: `1px solid ${p.border}`, borderRadius: "12px", color: p.text, fontFamily: "inherit", fontSize: "13px", outline: "none", marginBottom: "8px" }}
                >
                  <option value="What was the name of your first pet?">What was the name of your first pet?</option>
                  <option value="What city were you born in?">What city were you born in?</option>
                  <option value="What was your first school's name?">What was your first school's name?</option>
                  <option value="What is your mother's maiden name?">What is your mother's maiden name?</option>
                  <option value="custom">Write a custom question...</option>
                </select>
                {editSecurityQuestion === "custom" && (
                  <input
                    type="text"
                    placeholder="Enter custom security question"
                    value={customQuestion}
                    onChange={e => setCustomQuestion(e.target.value)}
                    style={{ width: "100%", padding: "10px 14px", background: p.cardAlt, border: `1px solid ${p.border}`, borderRadius: "12px", color: p.text, fontFamily: "inherit", fontSize: "13px", outline: "none", marginBottom: "8px", boxSizing: "border-box" }}
                  />
                )}
                <input
                  type="text"
                  placeholder="Answer (case-insensitive)"
                  value={securityAnswer}
                  onChange={e => setSecurityAnswer(e.target.value)}
                  style={{ width: "100%", padding: "10px 14px", background: p.cardAlt, border: `1px solid ${p.border}`, borderRadius: "12px", color: p.text, fontFamily: "inherit", fontSize: "13px", outline: "none", boxSizing: "border-box" }}
                />
              </div>

              <button
                onClick={submitCreatePin}
                style={{ ...s.addBtn(p.accent), marginTop: "8px", fontSize: "14px", fontWeight: "800" }}
              >
                Create PIN
              </button>
            </div>
          </div>
        ) : isChangingPin ? (
          <div>
            <div style={{ fontSize: "13px", fontWeight: 700, color: p.text, marginBottom: "4px" }}>🔐 Change App PIN</div>
            <div style={{ ...s.muted, marginBottom: "14px" }}>Enter your new 4-digit PIN below</div>
            <div style={{ display: "flex", flexDirection: "column", gap: "16px", animation: shakeChange ? "shake 0.5s" : "none" }}>
              <div>
                <div style={{ fontSize: "11px", color: p.textMuted, fontWeight: 700, marginBottom: "6px", textTransform: "uppercase", letterSpacing: "1px" }}>Enter New PIN</div>
                <div style={{ display: "flex", gap: "10px", justifyContent: "center" }}>
                  {changePinDigits.map((d, i) => (
                    <input
                      key={i}
                      id={`change-pin-${i}`}
                      type="password"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      value={d}
                      onChange={e => handlePinChange(i, e.target.value, "change")}
                      onKeyDown={e => handleKeyDown(i, e, "change")}
                      maxLength={1}
                      style={{ width: "48px", height: "48px", textAlign: "center", fontSize: "20px", background: p.cardAlt, border: `2px solid ${d ? p.accent : p.border}`, borderRadius: "12px", color: p.text, fontFamily: "inherit", outline: "none" }}
                    />
                  ))}
                </div>
              </div>

              <div>
                <div style={{ fontSize: "11px", color: p.textMuted, fontWeight: 700, marginBottom: "6px", textTransform: "uppercase", letterSpacing: "1px" }}>Confirm New PIN</div>
                <div style={{ display: "flex", gap: "10px", justifyContent: "center" }}>
                  {confirmChangePinDigits.map((d, i) => (
                    <input
                      key={i}
                      id={`confirm-change-pin-${i}`}
                      type="password"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      value={d}
                      onChange={e => handlePinChange(i, e.target.value, "confirm-change")}
                      onKeyDown={e => handleKeyDown(i, e, "confirm-change")}
                      maxLength={1}
                      style={{ width: "48px", height: "48px", textAlign: "center", fontSize: "20px", background: p.cardAlt, border: `2px solid ${d ? p.accent : p.border}`, borderRadius: "12px", color: p.text, fontFamily: "inherit", outline: "none" }}
                    />
                  ))}
                </div>
              </div>

              <div>
                <div style={{ fontSize: "11px", color: p.textMuted, fontWeight: 700, marginBottom: "6px", textTransform: "uppercase", letterSpacing: "1px" }}>Security Question (for PIN recovery)</div>
                <select
                  value={editSecurityQuestion}
                  onChange={e => setEditSecurityQuestion(e.target.value)}
                  style={{ width: "100%", padding: "10px", background: p.cardAlt, border: `1px solid ${p.border}`, borderRadius: "12px", color: p.text, fontFamily: "inherit", fontSize: "13px", outline: "none", marginBottom: "8px" }}
                >
                  <option value="What was the name of your first pet?">What was the name of your first pet?</option>
                  <option value="What city were you born in?">What city were you born in?</option>
                  <option value="What was your first school's name?">What was your first school's name?</option>
                  <option value="What is your mother's maiden name?">What is your mother's maiden name?</option>
                  <option value="custom">Write a custom question...</option>
                </select>
                {editSecurityQuestion === "custom" && (
                  <input
                    type="text"
                    placeholder="Enter custom security question"
                    value={customQuestion}
                    onChange={e => setCustomQuestion(e.target.value)}
                    style={{ width: "100%", padding: "10px 14px", background: p.cardAlt, border: `1px solid ${p.border}`, borderRadius: "12px", color: p.text, fontFamily: "inherit", fontSize: "13px", outline: "none", marginBottom: "8px", boxSizing: "border-box" }}
                  />
                )}
                <input
                  type="text"
                  placeholder="Answer (case-insensitive)"
                  value={securityAnswer}
                  onChange={e => setSecurityAnswer(e.target.value)}
                  style={{ width: "100%", padding: "10px 14px", background: p.cardAlt, border: `1px solid ${p.border}`, borderRadius: "12px", color: p.text, fontFamily: "inherit", fontSize: "13px", outline: "none", boxSizing: "border-box" }}
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginTop: "8px" }}>
                <button
                  onClick={() => {
                    setIsChangingPin(false);
                    setChangePinDigits(["", "", "", ""]);
                    setConfirmChangePinDigits(["", "", "", ""]);
                    setSecurityAnswer("");
                    setCustomQuestion("");
                  }}
                  style={{ background: "transparent", color: p.textMuted, border: `1px solid ${p.border}`, borderRadius: "14px", padding: "10px", fontSize: "13px", fontWeight: "700", cursor: "pointer" }}
                >
                  Cancel
                </button>
                <button
                  onClick={submitChangePin}
                  style={s.addBtn(p.accent)}
                >
                  Change PIN
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div>
            <div style={{ fontSize: "13px", fontWeight: 700, color: p.text, marginBottom: "4px" }}>🔐 App PIN Lock</div>
            <div style={{ ...s.muted, marginBottom: "14px" }}>Your app lock is configured and active.</div>
            <div style={{ ...s.tag(p.accent), display: "block", textAlign: "center", padding: "6px 12px", fontSize: "12px", fontWeight: "700" }}>✓ PIN is set</div>
            <div style={{ marginTop: "14px", fontSize: "11px", color: p.textMuted }}>
              <strong>Recovery Question:</strong> {securityQuestion || "None configured"}
            </div>
            {!securityQuestion && (
              <div style={{ background: p.accentGold + "18", border: `1px solid ${p.accentGold}40`, borderRadius: "12px", padding: "12px", marginTop: "12px" }}>
                <div style={{ fontSize: "11px", fontWeight: 700, color: p.accentGold, marginBottom: "4px" }}>⚠️ Setup PIN Recovery Question</div>
                <div style={{ ...s.muted, fontSize: "10px", marginBottom: "8px" }}>Configure a recovery question to regain access to your account if you forget your PIN.</div>
                <select
                  value={editSecurityQuestion}
                  onChange={e => setEditSecurityQuestion(e.target.value)}
                  style={{ width: "100%", padding: "8px", background: p.cardAlt, border: `1px solid ${p.border}`, borderRadius: "10px", color: p.text, fontFamily: "inherit", fontSize: "12px", outline: "none", marginBottom: "8px" }}
                >
                  <option value="What was the name of your first pet?">What was the name of your first pet?</option>
                  <option value="What city were you born in?">What city were you born in?</option>
                  <option value="What was your first school's name?">What was your first school's name?</option>
                  <option value="What is your mother's maiden name?">What is your mother's maiden name?</option>
                  <option value="custom">Write a custom question...</option>
                </select>
                {editSecurityQuestion === "custom" && (
                  <input
                    type="text"
                    placeholder="Enter custom security question"
                    value={customQuestion}
                    onChange={e => setCustomQuestion(e.target.value)}
                    style={{ width: "100%", padding: "8px 12px", background: p.cardAlt, border: `1px solid ${p.border}`, borderRadius: "10px", color: p.text, fontFamily: "inherit", fontSize: "12px", outline: "none", marginBottom: "8px", boxSizing: "border-box" }}
                  />
                )}
                <input
                  type="text"
                  placeholder="Answer (case-insensitive)"
                  value={securityAnswer}
                  onChange={e => setSecurityAnswer(e.target.value)}
                  style={{ width: "100%", padding: "8px 12px", background: p.cardAlt, border: `1px solid ${p.border}`, borderRadius: "10px", color: p.text, fontFamily: "inherit", fontSize: "12px", outline: "none", boxSizing: "border-box", marginBottom: "8px" }}
                />
                <button
                  onClick={async () => {
                    const qText = editSecurityQuestion === "custom" ? customQuestion.trim() : editSecurityQuestion;
                    const ansText = securityAnswer.trim();
                    if (!qText || !ansText) {
                      toast("Please enter a valid question and answer! ⚠️");
                      return;
                    }
                    const ansHash = hashPin(ansText.toLowerCase());
                    await setStorageItem("ww_securityQuestion", qText);
                    await setStorageItem("ww_securityAnswerHash", ansHash);
                    setSecurityQuestion(qText);
                    setSecurityAnswerHash(ansHash);
                    toast("Recovery question configured! 🔒");
                    setSecurityAnswer("");
                    setCustomQuestion("");
                  }}
                  style={{ ...s.addBtn(p.accent), padding: "8px 12px", fontSize: "11px", marginTop: "4px" }}
                >
                  Save Recovery Question
                </button>
              </div>
            )}
            <div style={{ display: "flex", gap: "12px", justifyContent: "center", marginTop: "16px" }}>
              <button
                onClick={() => {
                  setIsChangingPin(true);
                  setTimeout(() => {
                    const firstInput = document.getElementById("change-pin-0");
                    if (firstInput) firstInput.focus();
                  }, 100);
                }}
                style={{ background: p.accent, color: "#fff", border: "none", borderRadius: "10px", padding: "8px 14px", fontSize: "12px", fontWeight: "700", cursor: "pointer" }}
              >
                Change PIN
              </button>
              <button
                onClick={removePin}
                style={{ background: "transparent", color: p.accentWarm, border: `1px solid ${p.accentWarm}`, borderRadius: "10px", padding: "8px 14px", fontSize: "12px", fontWeight: "700", cursor: "pointer" }}
              >
                Remove PIN
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );

  const renderRight = () => (
    <>
      {/* Biometric */}
      <div style={{ ...s.cardAlt, ...s.row, opacity: pinSet ? 1 : 0.5, transition: "opacity 0.2s" }}>
        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          <div style={{ fontSize: "20px" }}>👆</div>
          <div>
            <div style={s.small}>Biometric Lock</div>
            <div style={s.muted}>Use fingerprint or Face ID</div>
          </div>
        </div>
        <button
          onClick={() => {
            if (!pinSet) {
              toast("Please set a PIN first! 🔐");
              return;
            }
            const next = !biometric;
            setBiometric(next);
            toast(next ? "Biometric enabled! 👆" : "Biometric disabled");
          }}
          disabled={!pinSet}
          style={{
            width: 44,
            height: 24,
            borderRadius: "99px",
            background: biometric ? p.accent : p.border,
            border: "none",
            cursor: pinSet ? "pointer" : "not-allowed",
            position: "relative",
            transition: "background 0.2s"
          }}
        >
          <div style={{ position: "absolute", top: 2, left: biometric ? 22 : 2, width: 20, height: 20, borderRadius: "50%", background: "#fff", transition: "left 0.2s" }} />
        </button>
      </div>

      {/* Google Drive Cloud Sync */}
      <div style={s.label}>Cloud Backup</div>
      <div style={s.card}>
        <div style={{ display: "flex", gap: "10px", alignItems: "center", marginBottom: "12px" }}>
          <div style={{ fontSize: "20px" }}>☁️</div>
          <div>
            <div style={{ ...s.small, fontWeight: 800 }}>Google Drive Sync</div>
            <div style={{ ...s.muted, fontSize: "11px" }}>
              {gToken ? "Connected to Google account" : "Sync across devices securely"}
            </div>
          </div>
        </div>

        {gToken ? (
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#00C896" }} />
                <span style={{ fontSize: "11px", color: p.text, fontWeight: 700 }}>Google Drive Connected</span>
              </div>
              <button
                onClick={handleUnlinkGDrive}
                style={{
                  background: "transparent",
                  border: `1px solid ${p.accentWarm}30`,
                  borderRadius: "8px",
                  padding: "4px 8px",
                  fontSize: "10px",
                  fontWeight: 700,
                  color: p.accentWarm,
                  cursor: "pointer"
                }}
              >
                Disconnect
              </button>
            </div>

            {lastSync && (
              <div style={{ fontSize: "10px", color: p.textMuted }}>
                Last Synced: <span style={{ color: p.text, fontWeight: 600 }}>{lastSync}</span>
              </div>
            )}

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
              <button
                onClick={handleCloudBackup}
                disabled={isSyncing}
                style={{
                  ...s.addBtn(p.accent),
                  margin: 0,
                  fontSize: "12px",
                  padding: "10px 12px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "6px",
                  opacity: isSyncing ? 0.6 : 1
                }}
              >
                <Ic n="export" size={12} color="#fff" /> {isSyncing ? "Syncing..." : "Back Up Now"}
              </button>
              <button
                onClick={handleCloudRestore}
                disabled={isSyncing}
                style={{
                  ...s.addBtn(p.accentBlue),
                  margin: 0,
                  fontSize: "12px",
                  padding: "10px 12px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "6px",
                  opacity: isSyncing ? 0.6 : 1
                }}
              >
                <Ic n="import" size={12} color="#fff" /> Restore
              </button>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 12px", background: p.cardAlt, borderRadius: "12px", border: `1px solid ${p.border}` }}>
              <div>
                <div style={{ fontSize: "11px", fontWeight: 700, color: p.text }}>Auto-Backup</div>
                <div style={{ fontSize: "9px", color: p.textMuted }}>Upload changes automatically</div>
              </div>
              <button
                onClick={handleToggleAutoBackup}
                style={{
                  width: 36,
                  height: 20,
                  borderRadius: "99px",
                  background: autoBackup ? p.accent : p.border,
                  border: "none",
                  cursor: "pointer",
                  position: "relative",
                  transition: "background 0.2s"
                }}
              >
                <div style={{ position: "absolute", top: 2, left: autoBackup ? 18 : 2, width: 16, height: 16, borderRadius: "50%", background: "#fff", transition: "left 0.2s" }} />
              </button>
            </div>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            <p style={{ fontSize: "11px", color: p.textMuted, margin: 0, lineHeight: "1.4" }}>
              Connect your Google account to securely backup and sync your financial data across all your devices using your private Google Drive App Folder.
            </p>

            <div style={{ background: p.cardAlt, padding: "12px", borderRadius: "12px", border: `1px solid ${p.border}`, display: "flex", flexDirection: "column", gap: "8px" }}>
              <div style={{ fontSize: "11px", fontWeight: 700, color: p.text }}>Google OAuth Credentials</div>
              
              <div style={{ fontSize: "10px", color: p.textMuted, lineHeight: "1.3" }}>
                To avoid authorization errors, configure your Google Cloud Console project with this Redirect URI:
              </div>
              
              <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                <div style={{ flex: 1, padding: "8px 12px", background: p.border + "30", borderRadius: "8px", fontSize: "10px", color: p.text, fontFamily: "monospace", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {window.location.origin}/
                </div>
                <button
                  onClick={handleCopyRedirectUri}
                  style={{
                    background: "transparent",
                    border: `1px solid ${p.border}`,
                    borderRadius: "8px",
                    padding: "6px 10px",
                    fontSize: "10px",
                    fontWeight: 700,
                    color: p.text,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "4px"
                  }}
                >
                  Copy
                </button>
              </div>

              <div style={{ marginTop: "4px" }}>
                <div style={{ fontSize: "10px", fontWeight: 700, color: p.textMuted, marginBottom: "4px" }}>Google Client ID:</div>
                <input
                  type="text"
                  placeholder="Enter Google Client ID"
                  value={clientId}
                  onChange={e => handleSaveClientId(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "8px 10px",
                    background: "transparent",
                    border: `1px solid ${p.border}`,
                    borderRadius: "8px",
                    color: p.text,
                    fontFamily: "inherit",
                    fontSize: "11px",
                    outline: "none",
                    boxSizing: "border-box"
                  }}
                />
              </div>

              {clientId !== DEFAULT_CLIENT_ID && (
                <button
                  onClick={() => handleSaveClientId(DEFAULT_CLIENT_ID)}
                  style={{
                    background: "transparent",
                    border: "none",
                    color: p.accentBlue,
                    fontSize: "10px",
                    fontWeight: 700,
                    cursor: "pointer",
                    alignSelf: "flex-end",
                    padding: "2px 0"
                  }}
                >
                  Reset to Default ID
                </button>
              )}
            </div>

            <button
              onClick={() => initiateOAuthFlow(clientId)}
              style={{
                ...s.addBtn(p.accentBlue),
                margin: 0,
                fontSize: "13px",
                padding: "12px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px"
              }}
            >
              ☁️ Link Google Drive
            </button>
          </div>
        )}
      </div>

      <div style={{ ...s.cardAlt, border: `1px solid ${p.accent}30` }}>
        <div style={{ fontSize: "12px", fontWeight: 700, color: p.accent }}>🔒 Local-First Storage</div>
        <div style={{ ...s.muted, marginTop: "4px" }}>Your financial data is stored locally on your device (browser local IndexedDB / Preferences). We never upload it to any server, ensuring full privacy.</div>
      </div>

      {/* Data Backup & Restore */}
      <div style={s.label}>Data Backup</div>
      <div style={s.card}>
        <div style={{ fontSize: "13px", fontWeight: 700, color: p.text, marginBottom: "4px" }}>📦 Export & Import Data</div>
        <div style={{ ...s.muted, marginBottom: "14px" }}>Back up all your financial data or restore it on a new device.</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
          <button
            onClick={async () => {
              try {
                const data = await collectBackupData();
                const json = JSON.stringify(data, null, 2);
                const fileName = `WealthWise_Backup_${new Date().toISOString().slice(0, 10)}.json`;

                if (Capacitor.isNativePlatform()) {
                  const result = await Filesystem.writeFile({
                    path: fileName,
                    data: json,
                    directory: Directory.Cache,
                    encoding: Encoding.UTF8,
                  });
                  await Share.share({
                    title: "WealthWise Backup",
                    text: "My WealthWise financial data backup.",
                    url: result.uri,
                    dialogTitle: "Share Backup",
                  });
                  toast("Backup shared successfully! 📦");
                } else {
                  const blob = new Blob([json], { type: "application/json" });
                  const url = URL.createObjectURL(blob);
                  const link = document.createElement("a");
                  link.href = url;
                  link.download = fileName;
                  document.body.appendChild(link);
                  link.click();
                  document.body.removeChild(link);
                  toast("Backup downloaded! 📦");
                }
              } catch (err) {
                toast(`Failed: ${err.message || err} ⚠️`);
              }
            }}
            style={{
              ...s.addBtn(p.accentBlue),
              margin: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "6px"
            }}
          >
            <Ic n="export" size={14} color="#fff" /> Export
          </button>
          <label
            style={{
              ...s.addBtn(p.accent),
              margin: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "6px",
              cursor: "pointer"
            }}
          >
            <Ic n="import" size={14} color="#fff" /> Import
            <input
              type="file"
              accept=".json"
              style={{ display: "none" }}
              onChange={(e) => {
                const file = e.target.files[0];
                if (!file) return;
                const reader = new FileReader();
                reader.onload = async (ev) => {
                  try {
                    const data = JSON.parse(ev.target.result);
                    const keys = Object.keys(data).filter(k => k.startsWith("ww_"));
                    if (keys.length === 0) {
                      toast("Invalid backup file! ⚠️");
                      return;
                    }
                    
                    // Validate data schema and numeric fields
                    const errors = validateImportData(data);
                    if (errors.length > 0) {
                      alert("Import rejected due to validation errors:\n\n" + errors.map(err => `• ${err}`).join("\n"));
                      return;
                    }

                    if (window.confirm(`Restore ${keys.length} data keys? This will overwrite your current data.`)) {
                      for (const k of keys) {
                        await setStorageItem(k, data[k]);
                      }
                      // Clear legacy local storage too
                      localStorage.clear();
                      toast("Data restored! Reloading... 🔄");
                      setTimeout(() => window.location.reload(), 1000);
                    }
                  } catch (err) {
                    toast("Invalid JSON file! ⚠️");
                  }
                };
                reader.readAsText(file);
                e.target.value = "";
              }}
            />
          </label>
        </div>
        <div style={{ ...s.muted, marginTop: "10px", fontSize: "10px" }}>
          Export creates a JSON file with all your categories, transactions, savings, investments, goals, and settings.
        </div>
      </div>

      {/* Danger Zone */}
      <div style={s.label}>Danger Zone</div>
      <div style={{ ...s.cardAlt, border: `1px solid ${p.accentWarm}40` }}>
        <button
          onClick={async () => {
            if (window.confirm("⚠️ This will DELETE ALL your WealthWise data permanently. Are you sure?")) {
              if (window.confirm("This is irreversible. Last chance — continue?")) {
                for (const key of DB_KEYS) {
                  await removeStorageItem(key);
                }
                localStorage.clear();
                sessionStorage.clear();
                toast("All data erased. Reloading... 🗑️");
                setTimeout(() => window.location.reload(), 1000);
              }
            }
          }}
          style={{
            background: "transparent",
            color: p.accentWarm,
            border: `1px solid ${p.accentWarm}`,
            borderRadius: "12px",
            padding: "12px",
            width: "100%",
            fontSize: "13px",
            fontWeight: 700,
            cursor: "pointer",
            fontFamily: "inherit"
          }}
        >
          🗑️ Erase All Data
        </button>
      </div>
    </>
  );

  return (
    <div>
      <style>{`@keyframes shake { 0%,100%{transform:translateX(0)} 20%,60%{transform:translateX(-8px)} 40%,80%{transform:translateX(8px)} }`}</style>
      {width >= 768 ? (
        <div style={{ display: "grid", gridTemplateColumns: "1.2fr 0.8fr", gap: "24px", alignItems: "start", width: "100%" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            {renderLeft()}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            {renderRight()}
          </div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {renderLeft()}
          {renderRight()}
        </div>
      )}
    </div>
  );
}

export default SecurityScreen;
